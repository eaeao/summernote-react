/**
 * EditorCore — headless editor engine.
 *
 *  - own Range-based commands (no execCommand) dispatched through a typed registry with a
 *    before/afterCommand lifecycle,
 *  - an innerHTML + selection-bookmark history (undo/redo),
 *  - a derived, structurally-detected EditorState published to subscribers
 *    (the useSyncExternalStore source),
 *  - an IME composition state machine (observe-only window + settle + reconcile) for safe
 *    mobile / CJK (Hangul) input.
 */
import dom from './core/dom';
import wrappedRange from './core/range';
import env from './core/env';
import { createVideoNode } from './media/video';
import { defaultOptions, type KeyMap } from './options';
import { isSafeLinkUrl } from './security/purify';
import { History } from './editing/History';
import { Style } from './editing/Style';
import { Bullet } from './editing/Bullet';
import Table from './editing/Table';

export type EditorAlign = 'left' | 'center' | 'right' | 'justify';

/**
 * The full toolbar active-state, published to subscribers (useSyncExternalStore source).
 *
 * Computed STRUCTURALLY from the caret's ancestor chain over our own deterministic markup, NOT via
 * the deprecated `document.queryCommandState` — which is unreliable cross-browser and does not
 * recognize our canonical markup (e.g. `<s>` for strike).
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
  /** fired after the editor content changes; receives the editable's current HTML (same value as getHTML()). */
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
/** post-compositionend settle window before reconciling IME-composed text. */
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
 * Structural readStyle: derive font/size/line-height from the caret's element WITHOUT
 * execCommand/queryCommandValue. Inline style wins (it preserves the pt unit and the user's chosen
 * family); getComputedStyle is the fallback (always px). The chrome matches fontName against its
 * options.fontNames; here we expose the raw first family.
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
  } else {
    // ratio = computed line-height / computed font-size — BOTH in px (don't divide a px
    // line-height by a pt inline size; that would mis-report the ratio when the font is in pt).
    const pxSize = parseInt(computed.fontSize, 10);
    if (!Number.isNaN(pxSize) && pxSize > 0) {
      const ratio = parseInt(computed.lineHeight, 10) / pxSize;
      lineHeight = Number.isFinite(ratio) ? ratio.toFixed(1) : '';
    }
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
    // TAB / SHIFT+TAB are intercepted (table-cell navigation / indent); other plain keys
    // (ENTER/ESC) stay native so the browser handles paragraph breaks etc.
    if (e.key === 'Tab') {
      return e.shiftKey ? 'SHIFT+TAB' : 'TAB';
    }
    return null;
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

// NBSP run length inserted by Tab when the caret is not in a table cell (summernote default).
const TAB_SIZE = 4;

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
 * WebKit guard against caret ejection out of an empty styled span (without it, Safari
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
      // seed a ZERO_WIDTH bogus char so WebKit keeps the caret INSIDE the empty styled span, and
      // SELECT it (don't collapse past) so the next keystroke replaces it — otherwise the U+FEFF
      // would persist permanently in saved content.
      first.innerHTML = dom.ZERO_WIDTH_NBSP_CHAR;
      const r = document.createRange();
      r.selectNodeContents(first);
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
 * Remove an inline format from exactly the selected text runs (handles PARTIAL/NESTED selection):
 * for each fully-contained text node sitting inside a matching tag, split that tag out around the
 * text node (splitTree at both boundaries) and unwrap the isolated wrapper — so `<b>he[ll]o</b>`
 * toggled becomes `<b>he</b>ll<b>o</b>`, not a full unwrap. Assumes rng is already splitText()'d.
 */
function removeInline(textNodes: Node[], matchTags: readonly string[]): void {
  const isMatch = (n: Node): boolean => matchTags.includes(n.nodeName);
  for (const textNode of textNodes) {
    // unwrap every matching ancestor (handles nesting like <b><b>x</b></b> and <i><b>x</b></i>)
    let m = dom.ancestor(textNode, isMatch) as HTMLElement | null;
    while (m) {
      // isolate textNode out of `m`: split the tree at its start, then at its end (edge splits are
      // structural no-ops, so a FULL selection just isolates the whole tag). After the splits the
      // matching ancestor wraps exactly textNode's subtree -> unwrap THAT (not textNode.parentNode,
      // which for nesting is the inner tag).
      const right = dom.splitTree(m, { node: textNode, offset: 0 }, { isSkipPaddingBlankHTML: true });
      if (right) {
        dom.splitTree(right, { node: textNode, offset: dom.nodeLength(textNode) }, { isSkipPaddingBlankHTML: true });
      }
      const matched = dom.ancestor(textNode, isMatch) as HTMLElement | null;
      if (!matched) {
        break;
      }
      unwrapEl(matched);
      m = dom.ancestor(textNode, isMatch) as HTMLElement | null;
    }
  }
}

/**
 * Toggle an inline format (the Tier-B own-command path that replaces execCommand). splitText()s the
 * selection first so a PARTIAL selection becomes its own fully-contained run, then:
 *   - if EVERY selected run is already inside a matching tag -> remove (split-out, not full unwrap),
 *   - otherwise -> apply to all runs (Style.styleNodes, which reuses already-matching wrappers so a
 *     MIXED selection becomes uniformly formatted).
 * Markup is deterministic (e.g. strike -> <s>), unlike execCommand.
 */
function toggleInline(matchTags: readonly string[], nodeName: string): boolean {
  let rng = wrappedRange.create();
  if (!rng || rng.isCollapsed()) {
    return false; // collapsed-cursor formatting (storedMarks) is a later step
  }
  rng = rng.splitText();
  const textNodes = rng.nodes(dom.isText, { fullyContains: true });
  const allFormatted =
    textNodes.length > 0 &&
    textNodes.every((t) => dom.ancestor(t, (n: Node) => matchTags.includes(n.nodeName)) !== null);

  if (allFormatted) {
    removeInline(textNodes, matchTags);
    // remove the empty <b>/<i>/... remnants the edge splits leave (e.g. `<b></b>hello<b></b>`)
    const selector = matchTags.join(',');
    const blocks = new Set<Element>();
    for (const t of textNodes) {
      const block = (dom.ancestor(t, (n: Node) => dom.isPara(n) || dom.isEditable(n)) ??
        t.parentNode) as Element | null;
      if (block) {
        blocks.add(block);
      }
    }
    for (const block of blocks) {
      for (const el of Array.from(block.querySelectorAll(selector))) {
        if ((el as HTMLElement).textContent === '') {
          el.remove();
        }
      }
    }
    // reselect the (now unwrapped) text runs so active-state reflects removal
    const firstT = textNodes[0];
    const lastT = textNodes[textNodes.length - 1];
    if (firstT && lastT && firstT.isConnected && lastT.isConnected) {
      const r = document.createRange();
      r.setStart(firstT, 0);
      r.setEnd(lastT, dom.nodeLength(lastT));
      selectRange(r);
    }
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
  let paras = rng.nodes(dom.isPara, { includeAncestor: true });
  if (paras.length === 0) {
    // inside a blockquote/pre (not isPara) — target the closest format block so conversion is
    // bidirectional (the style dropdown can round-trip out of Quote/Code).
    const block = dom.ancestor(rng.sc, (n: Node) => FORMAT_BLOCK_TAGS.includes(n.nodeName)) as HTMLElement | null;
    if (block && !dom.isEditable(block)) {
      paras = [block];
    }
  }
  for (const para of paras) {
    if (!dom.isEditable(para) && para.nodeName.toLowerCase() !== tag.toLowerCase()) {
      dom.replace(para, tag);
    }
  }
  return paras.length > 0;
}

/** commands that don't act on the live selection (history, or explicit-target image ops). */
const SELECTIONLESS_COMMANDS = new Set(['undo', 'redo', 'resizeImage', 'floatImage', 'removeMedia']);

/**
 * Every built-in command name accepted by {@link EditorCore.command} (and the React handle's
 * `command()`). Plugin commands registered via {@link EditorCore.registerCommand} are additional
 * runtime names not in this union — that is why `command()` also accepts any `string`.
 */
export type CommandName =
  | 'insertText'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'superscript'
  | 'subscript'
  | 'removeFormat'
  | 'justifyLeft'
  | 'justifyCenter'
  | 'justifyRight'
  | 'justifyFull'
  | 'insertOrderedList'
  | 'insertUnorderedList'
  | 'formatPara'
  | 'formatH1'
  | 'formatH2'
  | 'formatH3'
  | 'formatH4'
  | 'formatH5'
  | 'formatH6'
  | 'insertHorizontalRule'
  | 'createLink'
  | 'unlink'
  | 'insertTable'
  | 'addRow'
  | 'addCol'
  | 'deleteRow'
  | 'deleteCol'
  | 'deleteTable'
  | 'tab'
  | 'untab'
  | 'fontName'
  | 'fontSize'
  | 'fontSizeUnit'
  | 'foreColor'
  | 'backColor'
  | 'color'
  | 'lineHeight'
  | 'formatBlock'
  | 'indent'
  | 'outdent'
  | 'insertImage'
  | 'resizeImage'
  | 'floatImage'
  | 'removeMedia'
  | 'insertVideo'
  | 'insertNode'
  | 'undo'
  | 'redo';

const COMMANDS = {
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
    if (url === '' || !native || !isSafeLinkUrl(url)) {
      return false; // reject empty + javascript:/vbscript:/data: schemes (hardening beyond legacy)
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
    // editing an existing anchor: update href/target in place (no nested <a>); only rewrite the
    // text when it actually changed, so nested markup inside the anchor is preserved otherwise.
    const existing = dom.ancestor(native.startContainer, dom.isAnchor) as HTMLAnchorElement | null;
    if (existing) {
      existing.setAttribute('href', url);
      if (opts.text !== undefined && opts.text !== '' && opts.text !== existing.textContent) {
        existing.textContent = opts.text;
      }
      applyTarget(existing);
      return true;
    }
    const a = dom.create('A') as HTMLAnchorElement;
    a.setAttribute('href', url);
    applyTarget(a);
    const isTextChanged = opts.text !== undefined && opts.text !== '' && opts.text !== native.toString();
    if (!native.collapsed && !isTextChanged) {
      a.appendChild(native.extractContents()); // keep the selected markup
    } else {
      if (!native.collapsed) {
        native.deleteContents(); // the user edited the display text — replace it
      }
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

  // --- tab / shift-tab: move between table cells when collapsed in a cell, else indent (NBSP run) ---
  tab: (): boolean => {
    const rng = wrappedRange.create();
    if (!rng) {
      return false;
    }
    if (rng.isCollapsed() && rng.isOnCell()) {
      table.tab(rng, false); // next cell — selection move only, no DOM mutation / undo step
      return false;
    }
    const tab = dom.createText(new Array(TAB_SIZE + 1).join(dom.NBSP_CHAR));
    rng.deleteContents().insertNode(tab, true);
    wrappedRange.create(tab, TAB_SIZE)!.select();
    return true;
  },
  untab: (): boolean => {
    const rng = wrappedRange.create();
    if (!rng) {
      return false;
    }
    if (rng.isCollapsed() && rng.isOnCell()) {
      table.tab(rng, true); // previous cell
    }
    return false;
  },

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
} satisfies Record<CommandName, Command>;

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
  // last real (non-collapsed) in-editor selection + whether the last press landed in the editor —
  // used to recover the selection when an extension popup grabs it on a toolbar press.
  private lastGoodRange: { sc: Node; so: number; ec: Node; eo: number } | null = null;
  private pointerInEditable = false;
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

  command(name: CommandName | (string & {}), ...args: unknown[]): boolean {
    const cmd = this.customCommands[name] ?? (COMMANDS as Record<string, Command>)[name];
    if (!cmd) {
      return false;
    }
    // A usable selection is a non-collapsed range inside this editor. If it is gone — cleared, moved
    // out, or collapsed to a caret by a browser extension popup (dictionary/translator) that armed
    // on the selection and grabbed it on the toolbar mousedown — restore the last real selection.
    // lastGoodRange is dropped when the user places a caret by clicking IN the editor, so a genuine
    // collapsed caret (bold-then-type) is honoured rather than overwritten.
    if (!SELECTIONLESS_COMMANDS.has(name)) {
      const live = currentRange();
      const usable = !!live && this.ownsRange(live) && !live.collapsed;
      if (!usable && this.lastGoodRange) {
        const r = document.createRange();
        try {
          r.setStart(this.lastGoodRange.sc, this.lastGoodRange.so);
          r.setEnd(this.lastGoodRange.ec, this.lastGoodRange.eo);
          selectRange(r);
        } catch {
          // stale range (DOM changed under it) — leave the live selection as-is
        }
      }
      const after = currentRange();
      if (!after || !this.ownsRange(after)) {
        return false;
      }
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

  /**
   * Insert a loading spinner at the current selection, run the async upload `handler`, then swap in
   * the resolved image src (a hosted URL or a base64 data URL); on rejection the placeholder is
   * removed. The spinner is not recorded in history or emitted via onChange until it resolves, so a
   * transient placeholder never leaks into the saved value or the undo stack.
   */
  insertImageUpload(file: File, handler: (file: File) => string | Promise<string>): void {
    let rng = wrappedRange.create();
    if (!rng || !this.editable.contains(rng.sc)) {
      // nothing selected / owned — default to a caret at the end of the editor
      const end = document.createRange();
      end.selectNodeContents(this.editable);
      end.collapse(false);
      selectRange(end);
      rng = wrappedRange.create();
    }
    if (!rng) {
      return;
    }
    const img = dom.create('IMG') as HTMLImageElement;
    img.className = 'note-image-uploading';
    if (file.name) {
      img.setAttribute('data-filename', file.name);
    }
    rng.insertNode(img);
    wrappedRange.createFromNodeAfter(img).select();
    this.notifyState(); // show the spinner + move the caret past it (not yet a change/undo step)
    Promise.resolve()
      .then(() => handler(file))
      .then((src) => {
        if (!img.isConnected) {
          return; // undone / re-seeded while uploading
        }
        img.setAttribute('src', String(src));
        img.removeAttribute('class');
        this.afterCommand(); // commit: one undo step + onChange with the loaded image
      })
      .catch(() => {
        if (img.isConnected) {
          img.remove();
          this.notifyState();
        }
      });
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
    // skip the getComputedStyle value-read (a forced reflow) while composing — the value-state
    // isn't needed mid-IME and the toolbar is observe-only then anyway.
    const value = cont !== null && !this.composing ? readStyle(cont, paraAnc) : EMPTY_VALUE_STYLE;

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
      // Track the last real (non-empty) in-editor selection, so a command can recover it if a browser
      // extension popup (dictionary / translator) grabs the selection on the toolbar mousedown.
      // Captured at selection time, so it is immune to whatever phase the extension's listener fires
      // in. A collapsed caret the user placed by clicking IN the editor drops it, so a genuine
      // bold-then-type caret is honoured rather than restored to a stale selection.
      const r = currentRange();
      if (r && this.ownsRange(r)) {
        if (!r.collapsed) {
          this.lastGoodRange = { sc: r.startContainer, so: r.startOffset, ec: r.endContainer, eo: r.endOffset };
        } else if (this.pointerInEditable) {
          this.lastGoodRange = null;
        }
      }
      this.notifyState();
    };
    const onPointerDown = (e: MouseEvent): void => {
      // remember whether the press landed inside the editor — distinguishes a deliberate caret from
      // an extension collapsing the selection on a toolbar press (capture phase, so it always runs).
      this.pointerInEditable = this.editable.contains(e.target as Node);
    };
    const onKeyDown = (e: KeyboardEvent): void => this.handleShortcut(e);

    this.editable.addEventListener('compositionstart', onCompositionStart);
    this.editable.addEventListener('compositionend', onCompositionEnd);
    this.editable.addEventListener('input', onInput);
    this.editable.addEventListener('keydown', onKeyDown);
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('mousedown', onPointerDown, true);

    this.cleanups.push(
      () => this.editable.removeEventListener('compositionstart', onCompositionStart),
      () => this.editable.removeEventListener('compositionend', onCompositionEnd),
      () => this.editable.removeEventListener('input', onInput),
      () => this.editable.removeEventListener('keydown', onKeyDown),
      () => document.removeEventListener('selectionchange', onSelectionChange),
      () => document.removeEventListener('mousedown', onPointerDown, true),
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
    if ((COMMANDS as Record<string, Command>)[method]) {
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
