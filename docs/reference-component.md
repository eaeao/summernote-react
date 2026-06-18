# Component & state

Reference for the `<SummernoteEditor>` React component: its props, the imperative `ref` handle, the published `EditorState`, and the `onChange` / `onImageUpload` callbacks.

> For the surrounding surface, see [Getting started](./getting-started.md) (install + first editor), [Commands](./reference-commands.md), [Options & toolbar](./reference-options.md), [Headless & plugin API](./reference-api.md), and [How it works](./concepts.md) (the controlled caret-safe contract).

---

## Props reference

`<SummernoteEditor>` is a `forwardRef<SummernoteEditorHandle, SummernoteEditorProps>`. Every prop:

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | **Controlled** HTML value. When provided, the editor is controlled (see [the caret-safe contract](./concepts.md#controlled-vs-uncontrolled--the-caret-safe-contract)). |
| `defaultValue` | `string` | — | **Uncontrolled** initial HTML, applied once at mount. |
| `onChange` | `(html: string) => void` | — | Fires after every committed content change. Receives the new editable HTML. |
| `options` | `Omit<EditorCoreOptions, 'value' \| 'onChange'>` | — | Pass-through engine options: `historyLimit`, `shortcuts`, `keyMap`, `isMac`, `onShortcut`. See [Options reference](./reference-options.md#options-reference-options-prop). |
| `toolbar` | `readonly ToolbarGroup[]` where `ToolbarGroup = readonly [string, readonly string[]]` | summernote default toolbar | `[group, [itemName...]]` toolbar config tuples. See [Toolbar configuration](./reference-options.md#toolbar-configuration). |
| `placeholder` | `string` | — | Placeholder shown over an empty editable (only when not in codeview and the HTML is empty). |
| `disableResize` | `boolean` | `false` | Disables the resize statusbar. The statusbar renders only when `!airMode && !disableResize && !codeview`. |
| `airMode` | `boolean` | `false` | Air mode: no fixed toolbar/statusbar; a floating toolbar appears at the selection. Adds the `note-airframe` root class. |
| `plugins` | `readonly SummernotePlugin[]` | — | Per-instance plugins. See [Plugin API](./reference-api.md#plugins--defineplugin). |
| `theme` | `'lite' \| 'bs3' \| 'bs4' \| 'bs5'` | `'lite'` | Visual theme, **per-instance** — multiple editors with different themes coexist. Drives the `note-theme-${theme}` root class. See [Themes](./reference-options.md#themes). |
| `lang` | `LangPartial` (= `Record<string, Record<string, string> \| undefined>`) | en-US | Locale, deep-merged over en-US via `resolveLang(lang)`. Use `lang={locales['ko-KR']}`. See [i18n](./reference-options.md#internationalization-i18n). |
| `onImageUpload` | `ImageUploadHandler` (= `(file: File) => string \| Promise<string>`) | — | Image-upload hook. Called per picked file instead of base64-embedding; return/resolve the `src`. See [Callbacks](#callbacks--onchange-onimageupload). |
| `className` | `string` | — | Extra class appended to the root `note-editor note-frame …` element. |

---

## Imperative ref — `SummernoteEditorHandle`

Attach a `ref` to reach the engine imperatively. The handle is recomputed when the underlying core changes.

```ts
export interface SummernoteEditorHandle {
  focus(): void;
  getCode(): string;
  setCode(html: string): void;
  command(name: string, ...args: unknown[]): boolean;
  undo(): void;
  redo(): void;
  readonly core: EditorCore | null;
}
```

| Member | Signature | Behavior |
|---|---|---|
| `focus` | `() => void` | Focuses the editable. |
| `getCode` | `() => string` | Current editable HTML (`''` before mount). |
| `setCode` | `(html: string) => void` | Replaces content. |
| `command` | `(name, ...args) => boolean` | Dispatches any engine/plugin command (e.g. `'bold'`, `'insertText'`). Returns whether it ran. See [Commands](./reference-commands.md). |
| `undo` | `() => void` | Undo (`command('undo')`). |
| `redo` | `() => void` | Redo (`command('redo')`). |
| `core` | `EditorCore \| null` | The raw engine instance (null until mounted) — escape hatch to the [full headless API](./reference-api.md#editorcore-public-methods). |

```tsx
import { useRef } from 'react';
import { SummernoteEditor, type SummernoteEditorHandle } from '@eaeao/summernote-react';

function Editor() {
  const ref = useRef<SummernoteEditorHandle>(null);
  return (
    <>
      <SummernoteEditor ref={ref} defaultValue="<p>Start…</p>" onChange={(h) => console.log(h)} />
      <button onClick={() => ref.current?.command('bold')}>Bold</button>
      <button onClick={() => ref.current?.command('insertText', 'Hello, world')}>Insert text</button>
      <button onClick={() => ref.current?.undo()}>Undo</button>
      <button onClick={() => console.log(ref.current?.getCode())}>Log HTML</button>
    </>
  );
}
```

> In legacy summernote you would call `$('#x').summernote('insertText', 'hi')`. Here the equivalent is `ref.current?.command('insertText', 'hi')` — there is no string-dispatch `'module.method'` syntax; every command is a flat name passed to `command()`. See [Migrating from jQuery](./migrating.md).

---

## `EditorState`

The engine publishes a snapshot of the caret's structural state via `subscribe(listener)` / `getSnapshot()` (a `useSyncExternalStore` source). It is computed by walking the caret's ancestor chain — there is no `queryCommandState`.

```ts
export interface EditorState {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly strikethrough: boolean;
  readonly superscript: boolean;
  readonly subscript: boolean;
  readonly orderedList: boolean;
  readonly unorderedList: boolean;
  readonly align: 'left' | 'center' | 'right' | 'justify' | null; // closest paragraph; null outside editor
  readonly formatBlock: string | null;        // lowercase tag p/h1..h6/blockquote/pre, or null
  readonly link: boolean;                       // caret inside an anchor
  readonly inTable: boolean;                    // caret inside a table cell
  readonly fontName: string;                    // first font-family at caret, dequoted ('' outside)
  readonly fontSize: string;                    // integer font-size as string, e.g. '14' ('' when none)
  readonly fontSizeUnit: string;                // 'px' | 'pt' | '%' … (defaults 'px')
  readonly lineHeight: string;                  // ratio e.g. '1.5' ('' when normal/none)
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly isComposing: boolean;                // IME composition in progress
}
```

You receive this as `state` from [`useSummernote`](./reference-api.md#headless-usesummernote--createeditorcore), and inside chrome/plugin components via `useChrome().state`. The toolbar uses it to highlight active buttons and disable undo/redo.

---

## Callbacks — `onChange`, `onImageUpload`

Unlike legacy summernote (which fired both jQuery events and `callbacks`), this port exposes plain React props — a single channel, no dual event path.

### `onChange(html: string)`

Fires after every committed content change: command `afterCommand`, `setHTML`, direct typing/IME settle, undo, redo, and a resolved image upload. It receives the current `getHTML()`.

```tsx
<SummernoteEditor value={html} onChange={(next) => setHtml(next)} />
```

### `onImageUpload(file: File) => string | Promise<string>`

By default a picked image is embedded as a **base64 data URL**. Provide `onImageUpload` to upload the file yourself and return the `src` to insert (a hosted URL or a base64 string). It is called **once per picked file** (single-file). While the promise is pending the editor shows a loading spinner in place; on rejection the placeholder is removed.

```tsx
<SummernoteEditor
  onImageUpload={async (file) => {
    const url = await uploadToS3(file); // your upload
    return url;                          // inserted as <img src={url}>
  }}
/>
```

Mechanics (engine `core.insertImageUpload`):

1. Resolves a range; if nothing is selected/owned, defaults to a caret at the end of the editable.
2. Inserts a placeholder `<img class="note-image-uploading" data-filename="…">`, moves the caret past it, and notifies state — **the spinner is shown but is not yet a change / undo step**.
3. Runs the handler. On resolve (if the placeholder is still connected): sets `src`, removes the `note-image-uploading` class, and commits one undo step + `onChange`. If the placeholder was disconnected (undone / re-seeded while uploading), it bails.
4. On reject: removes the placeholder. So a transient placeholder never leaks into the saved value or the undo stack.

The image dialog also supports inserting by **URL** (independent of `onImageUpload`).

> The engine exposes only two callback hooks: `onChange` (above) and `onShortcut` (a matched shortcut whose method is not a built-in command, e.g. `escape` / `insertParagraph` / `linkDialog.show`; return `true` to `preventDefault`). `onShortcut` is wired internally by the component.

---

## See also

- [Commands](./reference-commands.md) — the full `command(name, ...args)` catalog.
- [Options & toolbar](./reference-options.md) — engine options, toolbar/popover item names, fonts, colors, keymap, themes, and locales.
- [Headless & plugin API](./reference-api.md) — `useSummernote`, `createEditorCore`, `EditorCore` methods, and `definePlugin`.
- [How it works](./concepts.md) — architecture and the controlled caret-safe contract.
