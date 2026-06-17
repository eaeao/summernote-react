/**
 * EditorCore — minimal headless editor engine (Phase-1 thin slice).
 *
 * Proves the architecture end-to-end BEFORE the full editing layer lands:
 *  - own Range-based commands (NO execCommand — the v1 decision) dispatched through a
 *    typed registry with a before/afterCommand lifecycle,
 *  - a minimal innerHTML history (undo/redo),
 *  - a derived, structurally-detected EditorState published to subscribers
 *    (the useSyncExternalStore source that replaces Buttons.updateCurrentStyle polling),
 *  - an IME composition state machine (observe-only window + settle + reconcile) — the
 *    single highest mobile-input risk (Hangul/CJK).
 *
 * The full faithful editing engine (Style.styleNodes toggleInline, Table, Typing, Bullet,
 * the bookmark-accurate History) replaces the stubs here in Phase 2.
 */
import dom from './core/dom';
import wrappedRange from './core/range';
import env from './core/env';
import { createVideoNode } from './media/video';
import { defaultOptions, type KeyMap } from './options';
import { History } from './editing/History';
import { Style } from './editing/Style';
import { Bullet } from './editing/Bullet';
import Table from './editing/Table';

export type EditorAlign = 'left' | 'center' | 'right' | 'justify';

/**
 * The full toolbar active-state, published to subscribers (useSyncExternalStore source).
 *
 * Computed STRUCTURALLY (dom.ancestor walks over our own deterministic markup), NOT via the
 * deprecated `document.queryCommandState` that `Style.current` uses — queryCommandState is
 * unreliable cross-browser and does not recognize our canonical markup (e.g. `<s>` for strike).
 * This is the faithful intent of `Buttons.updateCurrentStyle`, made deterministic.
 */
export interface EditorState {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly strikethrough: boolean;
  readonly superscript: boolean;
  readonly subscript: boolean;
  readonly orderedList: boolean;
  readonly unorderedList: boolean;
  /** alignment of the closest paragraph (null when the selection is outside the editor). */
  readonly align: EditorAlign | null;
  /** lowercase tag of the closest format block (p/h1..h6/blockquote/pre), or null. */
  readonly formatBlock: string | null;
  /** true when the caret/selection sits inside an anchor. */
  readonly link: boolean;
  /** true when the caret/selection sits inside a table cell. */
  readonly inTable: boolean;
  // --- value-based state (drives dropdown .checked + .note-current-* labels) ---
  /** first font-family at the caret, dequoted ('' when outside the editor). */
  readonly fontName: string;
  /** integer font-size at the caret as a string, e.g. '14' ('' when none). */
  readonly fontSize: string;
  /** font-size unit, 'px' | 'pt' | '%' … (defaults 'px'). */
  readonly fontSizeUnit: string;
  /** line-height ratio at the caret, e.g. '1.5' ('' when 'normal'/none). */
  readonly lineHeight: string;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly isComposing: boolean;
}

export interface EditorCoreOptions {
  value?: string;
  /** fired after content changes (the code() onChange contract, minimal). */
  onChange?: (html: string) => void;
  /** undo-stack depth (default 200). */
  historyLimit?: number;
  /** enable keyboard shortcuts (default true). */
  shortcuts?: boolean;
  /** shortcut map (default the ported pc/mac keyMap). */
  keyMap?: KeyMap;
  /** use the mac keyMap (default env.isMac). */
  isMac?: boolean;
  /** fired for a shortcut whose method is NOT an editing command (e.g. 'linkDialog.show');
   * return true if handled (the engine then preventDefaults). */
  onShortcut?: (method: string) => boolean;
}

type Listener = () => void;
type Command = (core: EditorCore, ...args: unknown[]) => boolean;

const EMPTY_PARA = '<p><br></p>';
/** post-compositionend settle window; engine-gate to iOS/WebKit later (see PORTING-PLAN §13.2). */
const SETTLE_MS = 100;

/**
 * Single source of truth for the inline toggles: maps each command to the tags that count as
 * "active" and the canonical tag to wrap with. Both the toggle commands and the active-state
 * detection read this, so the button highlight and the toggle behaviour can never drift.
 */
const INLINE_TOGGLES = {
  bold: { match: ['B', 'STRONG'], nodeName: 'B' },
  italic: { match: ['I', 'EM'], nodeName: 'I' },
  underline: { match: ['U'], nodeName: 'U' },
  strikethrough: { match: ['S', 'STRIKE'], nodeName: 'S' },
  superscript: { match: ['SUP'], nodeName: 'SUP' },
  subscript: { match: ['SUB'], nodeName: 'SUB' },
} as const;

/** tags treated as format blocks by formatBlock + the active-state detection. */
const FORMAT_BLOCK_TAGS = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE'];

/** read the effective alignment of a paragraph (inline style wins; 'start'/'' map to left). */
function readAlign(para: HTMLElement): EditorAlign {
  const inline = para.style.textAlign;
  const value = inline !== '' ? inline : getComputedStyle(para).textAlign;
  switch (value) {
    case 'center':
      return 'center';
    case 'right':
      return 'right';
    case 'justify':
      return 'justify';
    default:
      return 'left'; // 'start', 'left', '' all render left-aligned
  }
}

interface ValueStyle {
  fontName: string;
  fontSize: string;
  fontSizeUnit: string;
  lineHeight: string;
}

const EMPTY_VALUE_STYLE: ValueStyle = { fontName: '', fontSize: '', fontSizeUnit: 'px', lineHeight: '' };

function dequoteFirstFamily(family: string): string {
  const first = family.split(',')[0] ?? '';
  return first.trim().replace(/^['"]|['"]$/g, '');
}

/**
 * The structural readStyle seam (PORTING-PLAN §13.1) — derive font/size/line-height from the
 * caret's element WITHOUT execCommand/queryCommandValue. Inline style wins (it preserves the pt
 * unit and the user's chosen family); getComputedStyle is the fallback (always px). The chrome
 * matches fontName against its options.fontNames; here we expose the raw first family.
 */
function readStyle(cont: Element, para: HTMLElement | null): ValueStyle {
  const computed = getComputedStyle(cont);
  const el = cont as HTMLElement;

  const inlineFamily = el.style ? el.style.fontFamily : '';
  const fontName = dequoteFirstFamily(inlineFamily !== '' ? inlineFamily : computed.fontFamily);

  const inlineSize = el.style ? el.style.fontSize : '';
  const rawSize = inlineSize !== '' ? inlineSize : computed.fontSize; // '14px' | '12pt' | …
  const sizeNum = parseInt(rawSize, 10);
  const fontSize = Number.isNaN(sizeNum) ? '' : String(sizeNum);
  const unitMatch = rawSize.match(/[a-z%]+$/i);
  const fontSizeUnit = unitMatch ? unitMatch[0] : 'px';

  let lineHeight = '';
  const inlineLH = para && para.style ? para.style.lineHeight : '';
  if (inlineLH !== '' && inlineLH !== undefined) {
    lineHeight = inlineLH;
  } else if (!Number.isNaN(sizeNum) && sizeNum > 0) {
    const ratio = parseInt(computed.lineHeight, 10) / sizeNum;
    lineHeight = Number.isFinite(ratio) ? ratio.toFixed(1) : '';
  }

  return { fontName, fontSize, fontSizeUnit, lineHeight };
}

/** name of the pressed key in keyMap terms (keyCode-based, matching the legacy key.js map). */
function keyName(e: KeyboardEvent): string | null {
  const code = e.keyCode;
  if (code >= 48 && code <= 57) {
    return 'NUM' + (code - 48); // digit row: NUM0..NUM9 (works with SHIFT, unlike e.key)
  }
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(code); // A-Z
  }
  switch (code) {
    case 13:
      return 'ENTER';
    case 27:
      return 'ESC';
    case 9:
      return 'TAB';
    case 220:
      return 'BACKSLASH';
    case 191:
      return 'SLASH';
    case 219:
      return 'LEFTBRACKET';
    case 221:
      return 'RIGHTBRACKET';
    default:
      return null;
  }
}

/** build the keyMap lookup string ('CTRL+SHIFT+S') for a modifier combo; null if no modifier. */
function shortcutName(e: KeyboardEvent): string | null {
  if (!(e.ctrlKey || e.metaKey || e.altKey)) {
    return null; // plain keys (incl. ENTER/TAB/ESC) stay native
  }
  const k = keyName(e);
  if (!k) {
    return null;
  }
  const parts: string[] = [];
  if (e.ctrlKey) {
    parts.push('CTRL');
  }
  if (e.metaKey) {
    parts.push('CMD');
  }
  if (e.altKey) {
    parts.push('ALT');
  }
  if (e.shiftKey) {
    parts.push('SHIFT');
  }
  parts.push(k);
  return parts.join('+');
}

function currentRange(): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return null;
  }
  return sel.getRangeAt(0);
}

function selectRange(range: Range): void {
  const sel = window.getSelection();
  if (!sel) {
    return;
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

// Stateless editing-engine services shared by the commands.
const style = new Style();
const bullet = new Bullet();
const table = new Table();

/** run a table command on the current selection's WrappedRange (which must be inside a cell). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tableCmd(fn: (rng: any) => void): boolean {
  const rng = wrappedRange.create();
  if (!rng) {
    return false;
  }
  fn(rng);
  return true;
}

/** apply a block-level style (e.g. text-align) to the paragraphs in the current selection. */
function applyBlockStyle(styleInfo: Record<string, string>): boolean {
  const rng = wrappedRange.create();
  if (!rng) {
    return false;
  }
  style.stylePara(rng, styleInfo);
  return true;
}

/**
 * Apply an inline CSS property to the selected text runs via Style.styleNodes (the own-command
 * path for font-family/font-size/color/background-color — port of Editor.fontStyling). For a
 * COLLAPSED caret it seeds a ZERO_WIDTH bogus char in the empty span and re-selects it: the
 * §13.1 WebKit guard against caret ejection out of an empty styled span (without it, Safari
 * types the next character OUTSIDE the span). Otherwise re-selects across the styled spans so
 * active-state + chained ops see the run.
 */
function applyInlineStyle(cssProp: string, value: string): boolean {
  const rng = wrappedRange.create();
  if (!rng) {
    return false;
  }
  const spans = style.styleNodes(rng) as HTMLElement[];
  for (const span of spans) {
    span.style.setProperty(cssProp, value);
  }
  const first = spans[0];
  const last = spans[spans.length - 1];
  if (rng.isCollapsed()) {
    if (first && !first.firstChild) {
      first.innerHTML = dom.ZERO_WIDTH_NBSP_CHAR;
      const r = document.createRange();
      r.selectNodeContents(first);
      r.collapse(false);
      selectRange(r);
    }
  } else if (first && last) {
    const r = document.createRange();
    r.setStart(first, 0);
    r.setEnd(last, last.childNodes.length);
    selectRange(r);
  }
  return spans.length > 0;
}

function unwrapEl(el: HTMLElement): void {
  const parent = el.parentNode;
  if (!parent) {
    return;
  }
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

const INLINE_FORMAT_TAGS = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SUP', 'SUB', 'SPAN'];

/**
 * Toggle an inline format (the Tier-B own-command path that replaces execCommand): wrap the
 * selected text runs via Style.styleNodes, or unwrap if the selection already sits inside a
 * matching tag. Markup is deterministic (e.g. strike -> <s>), unlike execCommand.
 */
function toggleInline(matchTags: readonly string[], nodeName: string): boolean {
  const rng = wrappedRange.create();
  if (!rng || rng.isCollapsed()) {
    return false; // collapsed-cursor formatting (storedMarks) is a later step
  }
  const active = dom.ancestor(rng.sc, (n: Node) => matchTags.includes(n.nodeName)) as HTMLElement | null;
  if (active) {
    unwrapEl(active);
    return true;
  }
  const nodes = style.styleNodes(rng, { nodeName });
  if (nodes.length > 0) {
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const r = document.createRange();
    r.setStart(first, 0);
    r.setEnd(last, last.childNodes.length);
    selectRange(r);
  }
  return true;
}

function clearFormat(): boolean {
  const rng = wrappedRange.create();
  if (!rng) {
    return false;
  }
  let ancestor = dom.ancestor(rng.sc, (n: Node) => INLINE_FORMAT_TAGS.includes(n.nodeName)) as HTMLElement | null;
  while (ancestor) {
    unwrapEl(ancestor);
    ancestor = dom.ancestor(rng.sc, (n: Node) => INLINE_FORMAT_TAGS.includes(n.nodeName)) as HTMLElement | null;
  }
  return true;
}

/** replace the block element(s) in the selection with `tag` (own formatBlock; no execCommand). */
function formatBlock(tag: string): boolean {
  const rng = wrappedRange.create();
  if (!rng) {
    return false;
  }
  const paras = rng.nodes(dom.isPara, { includeAncestor: true });
  for (const para of paras) {
    if (para.nodeName.toLowerCase() !== tag.toLowerCase()) {
      dom.replace(para, tag);
    }
  }
  return true;
}

const COMMANDS: Record<string, Command> = {
  insertText(core, ...args): boolean {
    const text = String(args[0] ?? '');
    const range = currentRange();
    if (!range || !core.ownsRange(range)) {
      return false;
    }
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selectRange(range);
    return true;
  },

  // --- Tier-B inline-format toggles (own-command via Style.styleNodes, NO execCommand) ---
  bold: (): boolean => toggleInline(INLINE_TOGGLES.bold.match, INLINE_TOGGLES.bold.nodeName),
  italic: (): boolean => toggleInline(INLINE_TOGGLES.italic.match, INLINE_TOGGLES.italic.nodeName),
  underline: (): boolean => toggleInline(INLINE_TOGGLES.underline.match, INLINE_TOGGLES.underline.nodeName),
  strikethrough: (): boolean =>
    toggleInline(INLINE_TOGGLES.strikethrough.match, INLINE_TOGGLES.strikethrough.nodeName),
  superscript: (): boolean => toggleInline(INLINE_TOGGLES.superscript.match, INLINE_TOGGLES.superscript.nodeName),
  subscript: (): boolean => toggleInline(INLINE_TOGGLES.subscript.match, INLINE_TOGGLES.subscript.nodeName),
  removeFormat: (): boolean => clearFormat(),

  // --- Tier-A block commands (own surgery via the ported editing engine) ---
  justifyLeft: (): boolean => applyBlockStyle({ 'text-align': 'left' }),
  justifyCenter: (): boolean => applyBlockStyle({ 'text-align': 'center' }),
  justifyRight: (): boolean => applyBlockStyle({ 'text-align': 'right' }),
  justifyFull: (): boolean => applyBlockStyle({ 'text-align': 'justify' }),
  insertOrderedList: (core): boolean => {
    bullet.insertOrderedList(core.editable);
    return true;
  },
  insertUnorderedList: (core): boolean => {
    bullet.insertUnorderedList(core.editable);
    return true;
  },
  formatPara: (): boolean => formatBlock('p'),
  formatH1: (): boolean => formatBlock('h1'),
  formatH2: (): boolean => formatBlock('h2'),
  formatH3: (): boolean => formatBlock('h3'),
  formatH4: (): boolean => formatBlock('h4'),
  formatH5: (): boolean => formatBlock('h5'),
  formatH6: (): boolean => formatBlock('h6'),

  insertHorizontalRule: (): boolean => {
    const rng = wrappedRange.create();
    if (!rng) {
      return false;
    }
    rng.insertNode(dom.create('HR'));
    return true;
  },
  createLink: (_core, ...args): boolean => {
    const opts = (args[0] ?? {}) as { url?: string; text?: string; newWindow?: boolean };
    const url = opts.url ?? '';
    const native = currentRange();
    if (url === '' || !native) {
      return false;
    }
    const applyTarget = (a: HTMLAnchorElement): void => {
      if (opts.newWindow === true) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      } else {
        a.removeAttribute('target');
        a.removeAttribute('rel');
      }
    };
    // editing an existing anchor: update href/text/target in place (no nested <a>)
    const existing = dom.ancestor(native.startContainer, dom.isAnchor) as HTMLAnchorElement | null;
    if (existing) {
      existing.setAttribute('href', url);
      if (opts.text !== undefined && opts.text !== '') {
        existing.textContent = opts.text;
      }
      applyTarget(existing);
      return true;
    }
    const a = dom.create('A') as HTMLAnchorElement;
    a.setAttribute('href', url);
    applyTarget(a);
    if (!native.collapsed) {
      a.appendChild(native.extractContents());
    } else {
      a.textContent = opts.text !== undefined && opts.text !== '' ? opts.text : url;
    }
    native.insertNode(a);
    selectRange(native);
    return true;
  },
  unlink: (): boolean => {
    const rng = wrappedRange.create();
    if (!rng) {
      return false;
    }
    const anchor = dom.ancestor(rng.sc, dom.isAnchor) as HTMLElement | null;
    if (anchor) {
      unwrapEl(anchor);
    }
    return true;
  },

  // --- table commands (own surgery via the ported Table engine) ---
  insertTable: (_core, ...args): boolean => {
    const [colStr, rowStr] = String(args[0] ?? '1x1').split('x');
    const colCount = parseInt(colStr ?? '1', 10) || 1;
    const rowCount = parseInt(rowStr ?? '1', 10) || 1;
    const rng = wrappedRange.create();
    if (!rng) {
      return false;
    }
    const tableEl = table.createTable(colCount, rowCount, { tableClassName: 'table table-bordered' });
    rng.deleteContents().insertNode(tableEl);
    return true;
  },
  addRow: (_core, ...args): boolean => tableCmd((rng) => table.addRow(rng, String(args[0] ?? 'bottom'))),
  addCol: (_core, ...args): boolean => tableCmd((rng) => table.addCol(rng, String(args[0] ?? 'right'))),
  deleteRow: (): boolean => tableCmd((rng) => table.deleteRow(rng)),
  deleteCol: (): boolean => tableCmd((rng) => table.deleteCol(rng)),
  deleteTable: (): boolean => tableCmd((rng) => table.deleteTable(rng)),

  // --- font / size / color / line-height (own inline-style commands, NO execCommand) ---
  fontName: (_core, ...args): boolean => applyInlineStyle('font-family', env.validFontName(String(args[0] ?? ''))),
  fontSize: (core, ...args): boolean => {
    const value = String(args[0] ?? '');
    if (value === '') {
      return false;
    }
    const unit = core.getSnapshot().fontSizeUnit || 'px';
    return applyInlineStyle('font-size', value + unit);
  },
  fontSizeUnit: (core, ...args): boolean => {
    const size = core.getSnapshot().fontSize;
    if (size === '') {
      return false;
    }
    return applyInlineStyle('font-size', size + String(args[0] ?? 'px'));
  },
  foreColor: (_core, ...args): boolean => applyInlineStyle('color', String(args[0] ?? '')),
  backColor: (_core, ...args): boolean => applyInlineStyle('background-color', String(args[0] ?? '')),
  color: (_core, ...args): boolean => {
    const info = (args[0] ?? {}) as { foreColor?: string; backColor?: string };
    let ok = false;
    if (info.foreColor) {
      ok = applyInlineStyle('color', info.foreColor) || ok;
    }
    if (info.backColor) {
      ok = applyInlineStyle('background-color', info.backColor) || ok;
    }
    return ok;
  },
  lineHeight: (_core, ...args): boolean => applyBlockStyle({ 'line-height': String(args[0] ?? '') }),

  // --- block style (generic formatBlock for the style dropdown: p/blockquote/pre/h1..h6) ---
  formatBlock: (_core, ...args): boolean => formatBlock(String(args[0] ?? 'p')),

  // --- list indent / outdent (own surgery via the ported Bullet engine) ---
  indent: (core): boolean => {
    bullet.indent(core.editable);
    return true;
  },
  outdent: (core): boolean => {
    bullet.outdent(core.editable);
    return true;
  },

  // --- image (synchronous insert; the dialog converts file -> dataURL then calls this) ---
  insertImage: (_core, ...args): boolean => {
    const src = String(args[0] ?? '');
    if (src === '') {
      return false;
    }
    const rng = wrappedRange.create();
    if (!rng) {
      return false;
    }
    const img = dom.create('IMG') as HTMLImageElement;
    img.setAttribute('src', src);
    if (args[1] !== undefined && String(args[1]) !== '') {
      img.setAttribute('data-filename', String(args[1]));
    }
    rng.insertNode(img);
    wrappedRange.createFromNodeAfter(img).select();
    return true;
  },

  // --- image manipulation (the image popover passes the target <img>) ---
  resizeImage: (_core, ...args): boolean => {
    const img = args[0] as HTMLElement | undefined;
    const value = String(args[1] ?? '');
    if (!img) {
      return false;
    }
    if (value === '' || value === 'none') {
      img.style.removeProperty('width');
      img.removeAttribute('width');
    } else {
      img.style.width = parseFloat(value) * 100 + '%';
    }
    return true;
  },
  floatImage: (_core, ...args): boolean => {
    const img = args[0] as HTMLElement | undefined;
    if (!img) {
      return false;
    }
    img.style.cssFloat = String(args[1] ?? 'none');
    return true;
  },
  removeMedia: (_core, ...args): boolean => {
    const img = args[0] as HTMLElement | undefined;
    if (!img || !img.parentNode) {
      return false;
    }
    img.parentNode.removeChild(img);
    return true;
  },

  // --- video (parse the provider URL into an embed node, then insert) ---
  insertVideo: (_core, ...args): boolean => {
    const node = createVideoNode(String(args[0] ?? ''));
    if (!node) {
      return false;
    }
    const rng = wrappedRange.create();
    if (!rng) {
      return false;
    }
    rng.insertNode(node);
    wrappedRange.createFromNodeAfter(node).select();
    return true;
  },

  // --- arbitrary node insert (custom embeds — the dialog builds the node) ---
  insertNode: (_core, ...args): boolean => {
    const node = args[0] as Node | undefined;
    if (!node) {
      return false;
    }
    const rng = wrappedRange.create();
    if (!rng) {
      return false;
    }
    rng.insertNode(node);
    wrappedRange.createFromNodeAfter(node).select();
    return true;
  },

  undo(core): boolean {
    return core.undo();
  },

  redo(core): boolean {
    return core.redo();
  },
};

export class EditorCore {
  readonly editable: HTMLElement;
  private readonly options: EditorCoreOptions;
  private readonly history: History;
  private composing = false;
  private compositionEndedAt = 0;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<Listener>();
  private snapshot: EditorState;
  private lastRange: { sc: Node; so: number; ec: Node; eo: number } | null = null;
  private readonly customCommands: Record<string, Command> = {};
  private readonly cleanups: Array<() => void> = [];

  constructor(editable: HTMLElement, options: EditorCoreOptions = {}) {
    this.editable = editable;
    this.options = options;
    editable.classList.add('note-editable'); // so dom.isEditable() recognizes it (gates isPara, etc.)
    editable.setAttribute('contenteditable', 'true');
    const seed = options.value && options.value.trim() !== '' ? options.value : EMPTY_PARA;
    editable.innerHTML = seed;
    this.history = new History(editable, { historyLimit: options.historyLimit ?? 200 });
    this.history.recordUndo();
    this.snapshot = this.computeState();
    this.bind();
  }

  /** true if the range is inside this editor's editable subtree. */
  ownsRange(range: Range): boolean {
    return this.editable.contains(range.startContainer);
  }

  /** register a per-instance command (plugins); shadows nothing built-in unless names collide. */
  registerCommand(name: string, fn: (core: EditorCore, ...args: unknown[]) => boolean): void {
    this.customCommands[name] = fn;
  }

  command(name: string, ...args: unknown[]): boolean {
    const cmd = this.customCommands[name] ?? COMMANDS[name];
    if (!cmd) {
      return false;
    }
    this.beforeCommand();
    const changed = cmd(this, ...args);
    if (changed && name !== 'undo' && name !== 'redo') {
      this.afterCommand();
    } else {
      this.notifyState();
    }
    return changed;
  }

  getHTML(): string {
    return this.editable.innerHTML;
  }

  setHTML(html: string): void {
    if (this.composing) {
      return; // observe-only during composition (mobile Hangul corruption guard)
    }
    this.editable.innerHTML = html && html.trim() !== '' ? html : EMPTY_PARA;
    this.afterCommand();
  }

  isComposing(): boolean {
    return this.composing;
  }

  // --- selection save/restore (dialogs move focus to inputs, losing the selection) ---
  saveRange(): void {
    const r = currentRange();
    if (r && this.ownsRange(r)) {
      this.lastRange = { sc: r.startContainer, so: r.startOffset, ec: r.endContainer, eo: r.endOffset };
    }
  }

  restoreRange(): void {
    if (!this.lastRange) {
      return;
    }
    const r = document.createRange();
    try {
      r.setStart(this.lastRange.sc, this.lastRange.so);
      r.setEnd(this.lastRange.ec, this.lastRange.eo);
      selectRange(r);
    } catch {
      // stale range (DOM changed under it) — leave the live selection as-is
    }
  }

  focus(): void {
    this.editable.focus();
  }

  /** plain text of the saved (or live) selection — dialog prefill. */
  getSelectedText(): string {
    if (this.lastRange) {
      const r = document.createRange();
      try {
        r.setStart(this.lastRange.sc, this.lastRange.so);
        r.setEnd(this.lastRange.ec, this.lastRange.eo);
        return r.toString();
      } catch {
        return '';
      }
    }
    const live = currentRange();
    return live && this.ownsRange(live) ? live.toString() : '';
  }

  /** anchor under the saved/live selection, or null — link-dialog prefill. */
  getAnchorInfo(): { url: string; text: string; newWindow: boolean } | null {
    const node = this.lastRange ? this.lastRange.sc : currentRange()?.startContainer;
    if (!node) {
      return null;
    }
    const anchor = dom.ancestor(node, dom.isAnchor) as HTMLAnchorElement | null;
    if (!anchor) {
      return null;
    }
    return {
      url: anchor.getAttribute('href') ?? '',
      text: anchor.textContent ?? '',
      newWindow: anchor.getAttribute('target') === '_blank',
    };
  }

  // --- subscription (useSyncExternalStore source) ---
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): EditorState {
    return this.snapshot;
  }

  // --- history (faithful ported History: innerHTML + bookmark selection restore) ---
  undo(): boolean {
    if (!this.history.canUndo()) {
      return false;
    }
    this.history.undo();
    this.notifyState();
    this.fireChange();
    return true;
  }

  redo(): boolean {
    if (!this.history.canRedo()) {
      return false;
    }
    this.history.redo();
    this.notifyState();
    this.fireChange();
    return true;
  }

  // --- command lifecycle ---
  private beforeCommand(): void {
    /* before.command hook — minimal for the slice */
  }

  private afterCommand(): void {
    this.history.recordUndo();
    this.notifyState();
    this.fireChange();
  }

  private fireChange(): void {
    this.options.onChange?.(this.getHTML());
  }

  // --- state ---
  private computeState(): EditorState {
    const range = currentRange();
    const sc = range !== null && this.ownsRange(range) ? range.startContainer : null;

    const has = (tags: readonly string[]): boolean =>
      sc !== null && dom.ancestor(sc, (n: Node) => tags.includes(n.nodeName)) !== null;

    const listAnc =
      sc !== null ? (dom.ancestor(sc, dom.isList) as HTMLElement | null) : null;
    const blockAnc =
      sc !== null
        ? (dom.ancestor(sc, (n: Node) => FORMAT_BLOCK_TAGS.includes(n.nodeName)) as HTMLElement | null)
        : null;
    const paraAnc = sc !== null ? (dom.ancestor(sc, dom.isPara) as HTMLElement | null) : null;

    const cont = sc !== null ? ((dom.isElement(sc) ? sc : sc.parentNode) as Element | null) : null;
    const value = cont !== null ? readStyle(cont, paraAnc) : EMPTY_VALUE_STYLE;

    return {
      bold: has(INLINE_TOGGLES.bold.match),
      italic: has(INLINE_TOGGLES.italic.match),
      underline: has(INLINE_TOGGLES.underline.match),
      strikethrough: has(INLINE_TOGGLES.strikethrough.match),
      superscript: has(INLINE_TOGGLES.superscript.match),
      subscript: has(INLINE_TOGGLES.subscript.match),
      orderedList: listAnc !== null && listAnc.nodeName === 'OL',
      unorderedList: listAnc !== null && listAnc.nodeName === 'UL',
      align: paraAnc !== null ? readAlign(paraAnc) : null,
      formatBlock: blockAnc !== null ? blockAnc.nodeName.toLowerCase() : null,
      link: sc !== null && dom.ancestor(sc, dom.isAnchor) !== null,
      inTable: sc !== null && dom.ancestor(sc, dom.isCell) !== null,
      fontName: value.fontName,
      fontSize: value.fontSize,
      fontSizeUnit: value.fontSizeUnit,
      lineHeight: value.lineHeight,
      canUndo: this.history.canUndo(),
      canRedo: this.history.canRedo(),
      isComposing: this.composing,
    };
  }

  private notifyState(): void {
    const next = this.computeState();
    const prev = this.snapshot;
    if (
      next.bold === prev.bold &&
      next.italic === prev.italic &&
      next.underline === prev.underline &&
      next.strikethrough === prev.strikethrough &&
      next.superscript === prev.superscript &&
      next.subscript === prev.subscript &&
      next.orderedList === prev.orderedList &&
      next.unorderedList === prev.unorderedList &&
      next.align === prev.align &&
      next.formatBlock === prev.formatBlock &&
      next.link === prev.link &&
      next.inTable === prev.inTable &&
      next.fontName === prev.fontName &&
      next.fontSize === prev.fontSize &&
      next.fontSizeUnit === prev.fontSizeUnit &&
      next.lineHeight === prev.lineHeight &&
      next.canUndo === prev.canUndo &&
      next.canRedo === prev.canRedo &&
      next.isComposing === prev.isComposing
    ) {
      return; // referentially stable — no thrash (every field unchanged)
    }
    this.snapshot = next;
    for (const l of this.listeners) {
      l();
    }
  }

  // --- native event binding + IME composition state machine ---
  private bind(): void {
    const onCompositionStart = (): void => {
      this.composing = true;
      this.notifyState();
    };
    const onCompositionEnd = (): void => {
      this.composing = false;
      this.compositionEndedAt = Date.now();
      // reconcile AFTER the settle window: record ONE undo step from the committed DOM.
      if (this.settleTimer !== null) {
        clearTimeout(this.settleTimer);
      }
      this.settleTimer = setTimeout(() => {
        this.settleTimer = null;
        this.afterCommand();
      }, SETTLE_MS);
    };
    const onInput = (): void => {
      if (this.composing) {
        return; // observe-only mid-composition
      }
      if (Date.now() - this.compositionEndedAt < SETTLE_MS) {
        return; // within the post-composition settle window — the reconcile timer owns it
      }
      // direct (non-command, non-IME) typing -> one undo step + change
      this.afterCommand();
    };
    const onSelectionChange = (): void => {
      this.notifyState();
    };
    const onKeyDown = (e: KeyboardEvent): void => this.handleShortcut(e);

    this.editable.addEventListener('compositionstart', onCompositionStart);
    this.editable.addEventListener('compositionend', onCompositionEnd);
    this.editable.addEventListener('input', onInput);
    this.editable.addEventListener('keydown', onKeyDown);
    document.addEventListener('selectionchange', onSelectionChange);

    this.cleanups.push(
      () => this.editable.removeEventListener('compositionstart', onCompositionStart),
      () => this.editable.removeEventListener('compositionend', onCompositionEnd),
      () => this.editable.removeEventListener('input', onInput),
      () => this.editable.removeEventListener('keydown', onKeyDown),
      () => document.removeEventListener('selectionchange', onSelectionChange),
    );
  }

  /** map a keydown to a keyMap command (hardware shortcuts only; IME keydowns are ignored). */
  private handleShortcut(e: KeyboardEvent): void {
    if (this.options.shortcuts === false) {
      return;
    }
    if (e.isComposing || e.keyCode === 229) {
      return; // mid-composition (Android fires keyCode 229 for almost every key — §13.2)
    }
    const name = shortcutName(e);
    if (!name) {
      return;
    }
    const isMac = this.options.isMac ?? env.isMac;
    const map = (this.options.keyMap ?? defaultOptions.keyMap)[isMac ? 'mac' : 'pc'];
    const method = map[name];
    if (!method) {
      return;
    }
    if (COMMANDS[method]) {
      e.preventDefault();
      this.command(method);
    } else if (this.options.onShortcut && this.options.onShortcut(method)) {
      e.preventDefault(); // chrome handled it (e.g. linkDialog.show)
    }
  }

  destroy(): void {
    if (this.settleTimer !== null) {
      clearTimeout(this.settleTimer);
    }
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups.length = 0;
    this.listeners.clear();
  }
}

export function createEditorCore(editable: HTMLElement, options: EditorCoreOptions = {}): EditorCore {
  return new EditorCore(editable, options);
}

// Date.now is used only for the composition settle timestamp; isolated for testability.
