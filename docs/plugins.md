# Plugins

Extend `@eaeao/summernote-react` with per-instance **commands** and **toolbar buttons** using `definePlugin` — the React/TypeScript replacement for jQuery summernote's global `$.summernote.plugins`.

> This is a React port. There is no `$('.x').summernote(...)`, no `$.extend($.summernote.plugins, …)`, and no jQuery. A plugin is plain data (`{ name, commands?, buttons? }`) passed to the `<SummernoteEditor>` `plugins` prop. See [Getting started](./getting-started.md) and the [API reference](./deep-dive.md) for the surrounding surface.

---

## At a glance

| jQuery summernote (v0.9) | `@eaeao/summernote-react` |
|---|---|
| `$.extend($.summernote.plugins, { name: fn })` (global) | `definePlugin({ name, commands, buttons })` → `plugins={[…]}` prop (per-instance) |
| `context.memo('button.x', () => ui.button({…}).render())` | a React `FC` in `buttons`, keyed by toolbar name |
| `context.invoke('editor.bold')` | `useCommand()` → `cmd('bold')`, or `core.command('bold')` |
| `$.summernote.ui.button/dialog` factory (jQuery DOM) | render JSX directly; reuse `Modal`, `useChrome`, `options.icons` |
| `$.Deferred` dialog flow | React state + `Promise`, `core.saveRange()/restoreRange()` |
| `$.extend(true, $.summernote.lang, …)` (global) | `lang={locales['ko-KR']}` prop, deep-merged via `resolveLang` |
| UMD `<script>` after summernote, **load order matters** | ES module import; no script ordering, no globals |

---

## The `definePlugin` contract

A plugin registers per-instance **commands** on the live `EditorCore` and/or custom toolbar **buttons** referenced by name in the toolbar config. Nothing is global.

```ts
import type { EditorCore } from '@eaeao/summernote-react';
import type { FC } from 'react';

export interface SummernotePlugin {
  readonly name: string;
  /** per-instance commands registered via core.registerCommand. */
  readonly commands?: Record<string, (core: EditorCore, ...args: unknown[]) => boolean>;
  /** custom toolbar buttons, keyed by the name used in the toolbar config. */
  readonly buttons?: Record<string, FC>;
}

/** identity helper that types your plugin. */
export function definePlugin(plugin: SummernotePlugin): SummernotePlugin;
```

| Field | Type | Purpose |
|---|---|---|
| `name` | `string` | Plugin identity (for your own bookkeeping). |
| `commands` | `Record<string, (core, ...args) => boolean>` | Each entry is registered on the core via `core.registerCommand(name, fn)`. Return `true` if the content changed; the engine then commits **one undo step** and fires `onChange`. Return `false` to no-op. |
| `buttons` | `Record<string, FC>` | Each value is a React component; the key is the name you place in the `toolbar` (or `popover`) config. Components may call `useChrome()` / `useCommand()`. |

`definePlugin` is an identity helper — it returns its argument typed as `SummernotePlugin`. You may also write the object literally; `definePlugin` just gives you type-checking and editor autocomplete.

---

## How a command runs

Every editing action is an engine **command** dispatched through `core.command(name, ...args): boolean`.

1. **Registration.** On mount, `<SummernoteEditor>` walks your `plugins` and calls `core.registerCommand(name, fn)` for each entry in `commands`. Registered (custom) commands take precedence over built-ins of the same name in `core.command()`.
2. **Dispatch.** A click handler calls the command. From a button component use the `useCommand()` hook; from a ref use `ref.current?.command(name, …)`.
3. **Selection gate.** Most commands require a live (or recoverable) in-editor selection, or they return `false` without acting. Guard inside your command with `core.ownsRange(range)` — true only when the range is inside *this* editor's editable subtree.
4. **Commit.** If your command returns `true`, the engine runs its `afterCommand()`: it normalizes the DOM, pushes **one undo entry**, and fires `onChange(html)`. Returning `false` commits nothing.

### Dispatching a command

```tsx
import { useCommand } from '@eaeao/summernote-react';

function MyButton() {
  const cmd = useCommand(); // (name, ...args) => void — keeps the editable selection alive
  return (
    <button
      type="button"
      className="note-btn"
      onMouseDown={(e) => e.preventDefault()} // do NOT blur the editable on mousedown
      onClick={() => cmd('bold')}
    >
      B
    </button>
  );
}
```

> The `onMouseDown` `preventDefault()` is load-bearing: without it, clicking the toolbar blurs the editable and the selection collapses before the command runs. `useCommand()` is built precisely to dispatch `core.command(name, ...args)` while keeping the editable's selection.

You can also dispatch imperatively through the [editor ref](./deep-dive.md#imperative-ref--summernoteeditorhandle):

```tsx
const ref = useRef<SummernoteEditorHandle>(null);
// ref.current?.command('insertText', 'hi');  // returns boolean
```

---

## Adding a toolbar button and wiring it in

A custom button is just a React component. Two steps connect it:

1. Put the component in your plugin's `buttons`, keyed by a **name**.
2. Reference that same **name** in the `toolbar` config so the toolbar renders it via its `renderCustom` slot.

The `toolbar` prop is an array of `[groupName, [itemName, …]]` tuples (same shape as jQuery summernote). The first element of each tuple is an arbitrary CSS group label; the second is the ordered list of item names. Built-in names (`bold`, `ul`, `link`, …) resolve to built-in controls; any unrecognized name is looked up in your plugins' `buttons`.

```tsx
import {
  SummernoteEditor,
  definePlugin,
  useChrome,
  useCommand,
} from '@eaeao/summernote-react';
import '@eaeao/summernote-react/styles.css';
import '@eaeao/summernote-react/icons.css';

function StarButton() {
  const { options } = useChrome(); // gives core, state, lang, options, ui, …
  const cmd = useCommand();
  return (
    <button
      type="button"
      className="note-btn"
      title="Insert star"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => cmd('insertStar')}
    >
      <span className={options.icons.question} aria-hidden="true" />
    </button>
  );
}

const starPlugin = definePlugin({
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
      return true; // changed → one undo step + onChange
    },
  },
  buttons: { star: StarButton },
});

export default function Editor() {
  return (
    <SummernoteEditor
      plugins={[starPlugin]}
      toolbar={[
        ['style', ['style', 'bold', 'underline', 'clear']],
        ['insert', ['link', 'picture', 'star']], // 'star' renders StarButton
        ['view', ['fullscreen', 'codeview', 'help']],
      ]}
    />
  );
}
```

### Icons

`options.icons` (from `useChrome()`) is the logical-key → CSS-class map for the shared icon webfont. Common keys: `question`, `table`, `picture`, `link`, `pencil`, `magic`, `code`, `bold`, `italic`. Render a glyph as `<span className={options.icons.table} aria-hidden="true" />`. The classes resolve to `.note-icon-*` and require `@eaeao/summernote-react/icons.css`.

### Putting a button in a popover instead

The same names work in the contextual `popover` config (`image` / `link` / `table` / `air`). Those layouts use the identical `[group, [names]]` tuple format — see the [options reference](./deep-dive.md#options-reference-options-prop). The built-in popover button names carry over for parity, e.g. image popover groups `resize` (`resizeFull`, `resizeHalf`, `resizeQuarter`, `resizeNone`), `float` (`floatLeft`, `floatRight`, `floatNone`), `remove` (`removeMedia`).

---

## Authoring helpers (`useChrome` / `useCommand`)

A button component runs inside `<SummernoteEditor>`, so it can read the chrome context.

```ts
function useChrome(): ChromeValue; // throws if used outside <SummernoteEditor>
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
| `codeviewActive` | `boolean` | True while the codeview textarea is showing (toolbar disables most buttons). |
| `onImageUpload` | `ImageUploadHandler?` | The consumer's image-upload hook, if any. |

For dialog-style buttons, capture the selection before a modal grabs focus and restore it before inserting:

```tsx
core?.saveRange();    // before opening the modal
// … user interacts with the modal …
core?.restoreRange(); // before dispatching the insert command
cmd('insertSomething', payload);
core?.focus();
```

---

## The three reference plugins

All three ship in the box and are exported from the package root: `helloPlugin`, `specialcharsPlugin`, `databasicPlugin`. Each is a faithful port of the matching `public/plugin/*` example, trimmed to the React contract.

```tsx
import {
  SummernoteEditor,
  helloPlugin,
  specialcharsPlugin,
  databasicPlugin,
} from '@eaeao/summernote-react';

<SummernoteEditor
  plugins={[helloPlugin, specialcharsPlugin, databasicPlugin]}
  toolbar={[
    ['style', ['style', 'bold', 'clear']],
    ['insert', ['hello', 'specialchars', 'databasic']],
    ['view', ['codeview']],
  ]}
/>;
```

### `helloPlugin` — the minimal contract

Port of `public/plugin/hello`: one command + one button.

- **button** `hello` — a `note-btn note-btn-hello` button using `options.icons.question`; clicking dispatches `cmd('hello')`.
- **command** `hello` — gets the live selection, guards with `core.ownsRange(range)`, `deleteContents()`, inserts a text node `"Hello from plugin"`, collapses, returns `true`/`false`.
- **show it** with `toolbar={[['insert', ['hello']]]}`.

### `specialcharsPlugin` — a dialog button with save/restore

Port of `public/plugin/specialchars`. Demonstrates a modal + selection preservation.

- **button** `specialchars` — opens a `Modal` showing a grid (`note-specialchar-grid`) of ~140 HTML entities (`"`, `&`, `&copy;`, `&euro;`, `&trade;`, arrows, math symbols, …). On open it calls `core?.saveRange()` to capture the selection before the modal takes focus; on pick it calls `core?.restoreRange()`, `cmd('insertSpecialChar', entity)`, closes, then `core?.focus()`. Title comes from `lang.specialChar?.specialChar` (fallback `'Special characters'`).
- **command** `insertSpecialChar(core, entity)` — decodes the entity via a temp element, guards `ownsRange`, deletes the selection, inserts the decoded character as a text node, collapses after it. Returns `true`/`false`.

This is the template to copy for any "pick something in a modal, then insert it" plugin.

### `databasicPlugin` — composing the API with a node insert

Simplified port of `public/plugin/databasic`.

- **button** `databasic` — a `note-btn note-btn-databasic` button using `options.icons.table`, title `"Insert basic data table"`; clicking dispatches `cmd('insertDataBasic')`.
- **command** `insertDataBasic(core)` — guards `ownsRange`, builds a `<table class="table table-bordered note-data-basic">` with a `Key`/`Value` head plus two body rows, `deleteContents()`, `insertNode(table)`, collapses after it. Returns `true`/`false`.

> The legacy plugin's custom `<data>` element and popover sizing are intentionally out of scope here — this version shows the command/button contract with a direct DOM insert.

---

## A complete dialog-style plugin

A self-contained example combining `useChrome`, `Modal`, save/restore, and a command:

```tsx
import { useState } from 'react';
import {
  definePlugin,
  Modal,
  useChrome,
  useCommand,
} from '@eaeao/summernote-react';

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
      <button
        type="button"
        className="note-btn"
        title="Insert emoji"
        onMouseDown={(e) => e.preventDefault()}
        onClick={openDialog}
      >
        <span className={options.icons.magic} aria-hidden="true" />
      </button>
      {open && (
        <Modal title="Insert emoji" onClose={() => setOpen(false)}>
          {['😀', '🎉', '🚀', '★'].map((e) => (
            <button key={e} type="button" onClick={() => pick(e)}>
              {e}
            </button>
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

// <SummernoteEditor plugins={[emojiPlugin]} toolbar={[['insert', ['emoji']]]} />
```

---

## Reading/writing editor content from a command

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

See the full list in the [command catalog](./deep-dive.md#commands--commandname-args). Note that `escape`, `insertParagraph`, and `linkDialog.show` are **not** commands — they are keymap methods routed to the engine's `onShortcut`; and codeview/fullscreen/help are chrome `ChromeUI` actions, not engine commands.

---

## i18n inside a plugin

There is no global `$.summernote.lang`. The active locale is the deep-merged result of the editor's `lang` prop over en-US, available to your button as `useChrome().lang`. Read tooltips/titles from it; missing keys fall back to English automatically.

```tsx
const { lang } = useChrome();
const title = lang.specialChar?.specialChar ?? 'Special characters';
```

To localize the host editor, pass a `LangPartial` to the `lang` prop:

```tsx
import { SummernoteEditor, locales } from '@eaeao/summernote-react';
<SummernoteEditor lang={locales['ko-KR']} plugins={[myPlugin]} />;
```

See the [i18n reference](./deep-dive.md#internationalization-i18n) for the 46 bundled locales and `resolveLang`.

---

## How this differs from jQuery summernote plugins

| Topic | jQuery summernote | This port |
|---|---|---|
| **Registration** | Global `$.extend($.summernote.plugins, { name: fn })`; name collisions override core modules globally. | Per-instance `plugins={[…]}` prop. Commands shadow built-ins only within that editor via `core.registerCommand`. |
| **Loading** | UMD `<script>` after the summernote script; lang/resource files must load after the plugin. Order matters. | ES module `import`. No script ordering, no `<script>` tags, no globals. |
| **Button factory** | `context.memo('button.name', () => ui.button({ contents, tooltip, click }).render())` (jQuery DOM). | A React `FC` in `buttons`, keyed by name; render JSX, use `useChrome()`/`useCommand()`. |
| **Dispatching edits** | `context.invoke('editor.bold')` / `context.invoke('code')`. | `useCommand()('bold')` or `core.command('bold')`; content via `core.getHTML()/setHTML()`, or the controlled `value`/`onChange` props. |
| **Dialogs** | `ui.dialog({ title, body, footer })` + `$.Deferred` + `onDialogShown/Hidden` + `note-`/Bootstrap dual-classed HTML strings. | Render the exported `Modal` (or your own JSX) with React state + `Promise`. Save/restore selection with `core.saveRange()/restoreRange()`. |
| **Lifecycle** | `this.initialize()` at plugin **load** (not use), `this.destroy()` for cleanup. | React lifecycle — a button is mounted/unmounted by React; commands are registered when the editor mounts. No `initialize`/`destroy` hooks to author. |
| **i18n** | `$.extend(true, $.summernote.lang, …)` global deep-merge; read via `options.langInfo`. | `lang` prop deep-merged over en-US by `resolveLang`; read via `useChrome().lang`. |
| **Theme detection** | `$.summernote.interface` → `'BS3' \| 'BS4' \| 'Lite'`. | Per-instance `theme="lite\|bs3\|bs4\|bs5"` + matching CSS import; multiple themed editors coexist. |
| **Editing engine** | jQuery-based. | Structural Range commands — no jQuery, zero runtime deps. |
| **Container/`dialogsInBody`** | `options.dialogsInBody` chooses dialog parent; unique IDs via `this.options.id`. | React portals/state; no manual container or ID juggling. |

### Source defects from the jQuery docs that do *not* apply here

The jQuery plugins page contains several copy-paste hazards (a stray `}` closing `initialize` before the dialog assignment, an undefined `$editBtn`, typos like `form-contro` and `note-tabe-content`, all tabs marked `active`). None of these exist in this port — you write React components, not HTML strings, so the markup is checked by the compiler.

---

## Reference

- Plugin types & helper: `src/plugin.ts` (`SummernotePlugin`, `definePlugin`)
- Reference plugins: `src/plugins/hello.tsx`, `src/plugins/specialchars.tsx`, `src/plugins/databasic.tsx`
- Chrome helpers: `src/chrome/ChromeContext.tsx` (`useChrome`, `useCommand`, `ChromeValue`, `ChromeUI`)
- Engine commands & `registerCommand`/`ownsRange`: `src/engine/EditorCore.ts`
- Toolbar item names & default config: `src/toolbar/registry.tsx`, `src/engine/options.ts`

See also: [Getting started](./getting-started.md) · [API reference](./deep-dive.md) · [Examples](./examples.md)
