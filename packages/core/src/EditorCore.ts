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
import { History } from './editing/History';
import { Style } from './editing/Style';
import { Bullet } from './editing/Bullet';

export interface EditorState {
  readonly bold: boolean;
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
}

type Listener = () => void;
type Command = (core: EditorCore, ...args: unknown[]) => boolean;

const EMPTY_PARA = '<p><br></p>';
/** post-compositionend settle window; engine-gate to iOS/WebKit later (see PORTING-PLAN §13.2). */
const SETTLE_MS = 100;

function isBoldTag(node: Node): boolean {
  return node.nodeName === 'B' || node.nodeName === 'STRONG';
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

/** apply a block-level style (e.g. text-align) to the paragraphs in the current selection. */
function applyBlockStyle(styleInfo: Record<string, string>): boolean {
  const rng = wrappedRange.create();
  if (!rng) {
    return false;
  }
  style.stylePara(rng, styleInfo);
  return true;
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
function toggleInline(matchTags: string[], nodeName: string): boolean {
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
  bold: (): boolean => toggleInline(['B', 'STRONG'], 'B'),
  italic: (): boolean => toggleInline(['I', 'EM'], 'I'),
  underline: (): boolean => toggleInline(['U'], 'U'),
  strikethrough: (): boolean => toggleInline(['S', 'STRIKE'], 'S'),
  superscript: (): boolean => toggleInline(['SUP'], 'SUP'),
  subscript: (): boolean => toggleInline(['SUB'], 'SUB'),
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
    const a = dom.create('A') as HTMLAnchorElement;
    a.setAttribute('href', url);
    if (opts.newWindow === true) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
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

  command(name: string, ...args: unknown[]): boolean {
    const cmd = COMMANDS[name];
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
    const bold =
      range !== null && this.ownsRange(range)
        ? dom.ancestor(range.startContainer, isBoldTag) !== null
        : false;
    return {
      bold,
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
      next.canUndo === prev.canUndo &&
      next.canRedo === prev.canRedo &&
      next.isComposing === prev.isComposing
    ) {
      return; // referentially stable — no thrash
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

    this.editable.addEventListener('compositionstart', onCompositionStart);
    this.editable.addEventListener('compositionend', onCompositionEnd);
    this.editable.addEventListener('input', onInput);
    document.addEventListener('selectionchange', onSelectionChange);

    this.cleanups.push(
      () => this.editable.removeEventListener('compositionstart', onCompositionStart),
      () => this.editable.removeEventListener('compositionend', onCompositionEnd),
      () => this.editable.removeEventListener('input', onInput),
      () => document.removeEventListener('selectionchange', onSelectionChange),
    );
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
