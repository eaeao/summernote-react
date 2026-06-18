# Headless & plugin API

Build your own chrome (or no chrome) on the engine with `useSummernote` / `createEditorCore`, and extend any editor with per-instance commands and toolbar buttons via `definePlugin`. No globals.

> Migrating a jQuery plugin? See [Migrating from jQuery](./migrating.md) for the side-by-side mapping. For a quick copy-paste plugin recipe, see [Examples → Custom plugin](./examples.md#custom-plugin).

---

## Headless: `useSummernote` & `createEditorCore`

### `useSummernote(options)`

```ts
function useSummernote(options?: EditorCoreOptions): UseSummernoteResult;

interface UseSummernoteResult {
  editableRef: MutableRefObject<HTMLDivElement | null>; // attach to your .note-editable div
  core: EditorCore | null;                              // null until mounted
  state: EditorState;                                   // live selection/toolbar state
}
```

```tsx
import { useSummernote } from '@eaeao/summernote-react';
import '@eaeao/summernote-react/styles.css';

function Headless() {
  const { editableRef, core, state } = useSummernote({ historyLimit: 100 });
  return (
    <div className="note-editor note-frame note-theme-lite">
      <div className="note-toolbar">
        <button
          className={state.bold ? 'active' : undefined}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => core?.command('bold')}
        >
          Bold
        </button>
        <button disabled={!state.canUndo} onClick={() => core?.undo()}>Undo</button>
      </div>
      <div ref={editableRef} className="note-editable notranslate" />
    </div>
  );
}
```

Mechanics: the core mounts in a layout effect on mount only (client-only, StrictMode-idempotent — destroys + nulls on cleanup). Latest options/callbacks flow through a ref, so option changes do **not** remount the engine. `state` re-renders your chrome on engine state changes while the editable DOM stays untouched by React. Before mount, `state` is an inert snapshot (all toggles `false`/empty, `fontSizeUnit: 'px'`).

### `createEditorCore(editable, options)`

Mount the engine on any element with no React at all.

```ts
import { createEditorCore } from '@eaeao/summernote-react';

const el = document.querySelector('#editable') as HTMLElement;
const core = createEditorCore(el, {
  value: '<p>Hi</p>',
  onChange: (html) => console.log(html),
});

core.command('bold');
core.command('insertText', 'Hello');
const html = core.getHTML();
core.destroy();
```

### `EditorCore` public methods

| Method | Signature | Behavior |
|---|---|---|
| constructor | `new EditorCore(editable, options?)` | Adds `note-editable` + `contenteditable=true`, seeds HTML, records initial undo, binds events + IME state machine. |
| `createEditorCore` | `(editable, options?) => EditorCore` | Factory wrapper. |
| `command` | `(name, ...args) => boolean` | Dispatch a command (custom first, then built-in). |
| `registerCommand` | `(name, fn) => void` | Register a per-instance command `(core, ...args) => boolean`. |
| `ownsRange` | `(range) => boolean` | True if a range is inside this editable subtree. |
| `getHTML` | `() => string` | `editable.innerHTML`. |
| `setHTML` | `(html) => void` | Replace content (empty → `<p><br></p>`); no-op while composing; fires `afterCommand`. |
| `insertImageUpload` | `(file, handler) => void` | Spinner placeholder → await handler → swap in `src` + one undo step + `onChange`; remove placeholder on reject. |
| `saveRange` | `() => void` | Snapshot the in-editor selection (for dialogs that steal focus). |
| `restoreRange` | `() => void` | Restore the saved selection (ignores stale ranges). |
| `getSelectedText` | `() => string` | Plain text of saved/live selection (dialog prefill). |
| `getAnchorInfo` | `() => { url; text; newWindow } \| null` | Anchor under saved/live selection (link-dialog prefill). |
| `focus` | `() => void` | Focus the editable. |
| `isComposing` | `() => boolean` | IME composition flag. |
| `subscribe` | `(listener) => () => void` | Add a state listener; returns unsubscribe. |
| `getSnapshot` | `() => EditorState` | Current state snapshot. |
| `undo` | `() => boolean` | Undo + notify + `onChange`; `false` if nothing to undo. |
| `redo` | `() => boolean` | Redo + notify + `onChange`; `false` if nothing to redo. |
| `destroy` | `() => void` | Clear timers, remove listeners, clear subscribers. |
| `editable` | `HTMLElement` (readonly) | The underlying editable element. |

---

## Plugins — `definePlugin`

A plugin is the per-instance replacement for the legacy `$.extend($.summernote.plugins, …)` global. It registers per-instance **commands** on the live `EditorCore` and/or custom toolbar **buttons** referenced by name in the toolbar config. Nothing is global.

```ts
import type { EditorCore } from '@eaeao/summernote-react';
import type { FC } from 'react';

export interface SummernotePlugin {
  readonly name: string;
  readonly commands?: Record<string, (core: EditorCore, ...args: unknown[]) => boolean>;
  readonly buttons?: Record<string, FC>; // keyed by the name used in the toolbar config
}

export function definePlugin(plugin: SummernotePlugin): SummernotePlugin;
```

| Field | Type | Purpose |
|---|---|---|
| `name` | `string` | Plugin identity (for your own bookkeeping). |
| `commands` | `Record<string, (core, ...args) => boolean>` | Each entry is registered via `core.registerCommand(name, fn)`. Return `true` if the content changed (the engine then commits **one undo step** and fires `onChange`); `false` to no-op. Custom commands take precedence over built-ins of the same name. |
| `buttons` | `Record<string, FC>` | Each value is a React component; the key is the name you place in the `toolbar` (or `popover`) config. Components may call `useChrome()` / `useCommand()`. |

`definePlugin` is an identity helper — it returns its argument typed as `SummernotePlugin`.

### How a command runs

1. **Registration.** On mount, `<SummernoteEditor>` walks your `plugins` and calls `core.registerCommand(name, fn)` for each entry in `commands`.
2. **Dispatch.** From a button component use the `useCommand()` hook; from a ref use `ref.current?.command(name, …)`.
3. **Selection gate.** Most commands require a live (or recoverable) in-editor selection, or they return `false`. Guard inside your command with `core.ownsRange(range)` — true only when the range is inside *this* editor's editable subtree.
4. **Commit.** If your command returns `true`, the engine runs `afterCommand()`: normalizes the DOM, pushes **one undo entry**, and fires `onChange(html)`. Returning `false` commits nothing.

### Authoring helpers (`useChrome` / `useCommand`)

A button component runs inside `<SummernoteEditor>`, so it can read the chrome context.

```ts
function useChrome(): ChromeValue;  // throws if used outside <SummernoteEditor>
function useCommand(): (name: string, ...args: unknown[]) => void;
```

`useChrome()` returns:

| Field | Type | Use |
|---|---|---|
| `core` | `EditorCore \| null` | The live engine — `command`, `ownsRange`, `saveRange`, `restoreRange`, `focus`, `getHTML`, … |
| `state` | `EditorState` | Live toolbar state (`bold`, `align`, `formatBlock`, `canUndo`, …) for active/disabled styling. |
| `lang` | `Lang` | Resolved locale strings (use for tooltips/titles). |
| `options` | `ChromeOptions` | The default options object, incl. `options.icons`, `fontNames`, `colors`, … |
| `ui` | `Partial<ChromeUI>` | Dialog/view toggles: `openLinkDialog`, `openImageDialog`, `openVideoDialog`, `openHelpDialog`, `toggleFullscreen`, `toggleCodeview`. |
| `codeviewActive` | `boolean` | True while the codeview textarea is showing. |
| `onImageUpload` | `ImageUploadHandler?` | The consumer's image-upload hook, if any. |

> Toolbar buttons must call `onMouseDown={(e) => e.preventDefault()}` so the toolbar mousedown does not blur the editable selection. `useCommand()` dispatches `core.command(name, ...args)` while keeping that selection alive. See [Extension-safe selection](./concepts.md#extension-safe-selection).

### A complete custom plugin

```tsx
import { definePlugin, useChrome, useCommand, SummernoteEditor } from '@eaeao/summernote-react';

function StarButton(): JSX.Element {
  const { options } = useChrome();
  const cmd = useCommand();
  return (
    <button
      type="button"
      className="note-btn"
      title="Star"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => cmd('insertStar')}
    >
      <span className={options.icons.question} aria-hidden="true" />
    </button>
  );
}

export const starPlugin = definePlugin({
  name: 'star',
  commands: {
    insertStar: (core): boolean => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const range = sel.getRangeAt(0);
      if (!core.ownsRange(range)) return false; // guard: must be inside this editor
      range.deleteContents();
      range.insertNode(document.createTextNode('★'));
      range.collapse(false);
      return true; // changed → undo step + onChange
    },
  },
  buttons: { star: StarButton },
});

// usage:
<SummernoteEditor plugins={[starPlugin]} toolbar={[['insert', ['star']]]} />;
```

`options.icons` is the icon-class map (e.g. `options.icons.question`, `options.icons.table`) — render glyphs through the shared icon webfont (requires `@eaeao/summernote-react/icons.css`).

### A dialog-style plugin (save / restore)

For a button that opens a modal, capture the selection before the modal steals focus and restore it before inserting:

```tsx
import { useState } from 'react';
import { definePlugin, Modal, useChrome, useCommand } from '@eaeao/summernote-react';

function EmojiButton() {
  const { core, options } = useChrome();
  const cmd = useCommand();
  const [open, setOpen] = useState(false);

  const openDialog = () => {
    core?.saveRange(); // capture selection before the modal steals focus
    setOpen(true);
  };
  const pick = (emoji: string) => {
    core?.restoreRange();
    cmd('insertEmoji', emoji);
    setOpen(false);
    core?.focus();
  };

  return (
    <>
      <button type="button" className="note-btn" title="Insert emoji"
        onMouseDown={(e) => e.preventDefault()} onClick={openDialog}>
        <span className={options.icons.magic} aria-hidden="true" />
      </button>
      {open && (
        <Modal title="Insert emoji" onClose={() => setOpen(false)}>
          {['😀', '🎉', '🚀', '★'].map((e) => (
            <button key={e} type="button" onClick={() => pick(e)}>{e}</button>
          ))}
        </Modal>
      )}
    </>
  );
}

export const emojiPlugin = definePlugin({
  name: 'emoji',
  commands: {
    insertEmoji: (core, emoji): boolean => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const range = sel.getRangeAt(0);
      if (!core.ownsRange(range)) return false;
      range.deleteContents();
      range.insertNode(document.createTextNode(String(emoji)));
      range.collapse(false);
      return true;
    },
  },
  buttons: { emoji: EmojiButton },
});
```

### The three reference plugins

All three ship in the box and are exported from the package root.

| Plugin | Button name | Demonstrates |
|---|---|---|
| `helloPlugin` | `hello` | The minimal contract: one command (`hello`, inserts a text node) + one button. |
| `specialcharsPlugin` | `specialchars` | A **dialog-style** button: opens a `Modal` grid of ~140 HTML entities, uses `core.saveRange()` / `restoreRange()`, then `insertSpecialChar(entity)`. |
| `databasicPlugin` | `databasic` | A direct node insert: builds a `<table class="table table-bordered note-data-basic">` via `insertNode`. |

```tsx
import { SummernoteEditor, helloPlugin, specialcharsPlugin, databasicPlugin } from '@eaeao/summernote-react';

<SummernoteEditor
  plugins={[helloPlugin, specialcharsPlugin, databasicPlugin]}
  toolbar={[['insert', ['hello', 'specialchars', 'databasic']]]}
/>;
```

### Reading / writing content from a command

A command receives the `EditorCore` directly, so prefer the engine surface over DOM poking:

| Need | Use |
|---|---|
| Current HTML | `core.getHTML()` |
| Replace all content | `core.setHTML(html)` |
| Dispatch another command | `core.command(name, ...args)` |
| Insert a DOM node | `core.command('insertNode', node)` |
| Insert text | `core.command('insertText', text)` |
| Insert an image src | `core.command('insertImage', src, filename?)` |
| Plain text of the selection | `core.getSelectedText()` |
| Anchor under the caret (link dialogs) | `core.getAnchorInfo()` |
| Is a range inside this editor? | `core.ownsRange(range)` |

---

## See also

- [Component & state](./reference-component.md) — props, the imperative `ref`, and `EditorState`.
- [Commands](./reference-commands.md) — the built-in command catalog your plugins can dispatch or override.
- [Examples → Custom plugin](./examples.md#custom-plugin) — a quick copy-paste recipe.
- [Migrating from jQuery](./migrating.md) — the legacy `$.summernote.plugins` → `definePlugin` mapping.
