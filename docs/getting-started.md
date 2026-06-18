# Getting Started

Install `@eaeao/summernote-react` and build your first editor — a React + TypeScript port of summernote with a self-contained engine, **zero runtime dependencies and no jQuery**.

`@eaeao/summernote-react` ships the editing engine and the React bindings in a single npm package. You use it as a normal React component (`<SummernoteEditor value={html} onChange={setHtml} />`) — there is no `$('.x').summernote(...)` and no global state. `react`/`react-dom` (>= 18) are **peer dependencies**; everything else is bundled.

This guide takes you from an empty project to a **controlled editor with a custom toolbar**, step by step. Each step builds on the previous one; copy the snippets as you go.

---

## Install

```bash
npm install @eaeao/summernote-react
# or
yarn add @eaeao/summernote-react
```

`react` and `react-dom` (>= 18) are peer dependencies — install them in your app if they are not already present:

```bash
npm install react react-dom
```

There is nothing else to add. The editor engine is bundled in; you do **not** need jQuery, Bootstrap's JS, Popper, or FontAwesome.

---

## Import the CSS

The package does **not** auto-inject styles — import the CSS yourself. The two baseline stylesheets are always required:

```tsx
import '@eaeao/summernote-react/styles.css'; // base/lite skin (required)
import '@eaeao/summernote-react/icons.css';  // shared icon webfont (required)
```

The icon webfont (`icons.css`) is shared by every theme. The four themes are CSS skins layered on top of the base, applied **per instance** via the `theme` prop. If you use a Bootstrap theme, also import its skin:

| Import specifier | Theme |
|---|---|
| `@eaeao/summernote-react/styles.css` | base / `lite` skin (required) |
| `@eaeao/summernote-react/icons.css` | shared icon webfont (required) |
| `@eaeao/summernote-react/themes/bs3.css` | `bs3` skin |
| `@eaeao/summernote-react/themes/bs4.css` | `bs4` skin |
| `@eaeao/summernote-react/themes/bs5.css` | `bs5` skin |

Import these once, typically at your app's entry point.

---

## Your first editor

```tsx
import { SummernoteEditor } from '@eaeao/summernote-react';
import '@eaeao/summernote-react/styles.css';
import '@eaeao/summernote-react/icons.css';

export function Example() {
  return <SummernoteEditor defaultValue="<p>Hello Summernote</p>" />;
}
```

That's it — a fully working editor with the default toolbar, statusbar resize handle, dropdowns, dialogs (link/image/video/help), and contextual popovers.

The root element is a `<div class="note-editor note-frame note-theme-lite …">`. React renders only the *chrome* (toolbar, dropdowns, dialogs, statusbar, popovers) plus a single `contentEditable` leaf that the engine owns and mutates imperatively. React never reconciles inside the editable, so toolbar/state re-renders cannot disturb your caret. (Why this matters: [How it works](./concepts.md#controlled-vs-uncontrolled--the-caret-safe-contract).)

---

## Read and control the content

The editor supports both React patterns. The initial content is `value ?? defaultValue` — `value` (controlled) wins over `defaultValue` (uncontrolled, applied once at mount).

### Uncontrolled

Pass `defaultValue` for the initial HTML and let the engine own the content afterward. Read edits through `onChange` and/or the imperative ref.

```tsx
import { SummernoteEditor } from '@eaeao/summernote-react';

export function Uncontrolled() {
  return (
    <SummernoteEditor
      defaultValue="<p>Start typing…</p>"
      onChange={(html) => console.log('changed:', html)}
    />
  );
}
```

### Controlled

Pass `value` together with `onChange` to keep the HTML in React state. The component pushes an external `value` into the engine **only when it genuinely differs** from both the last value it emitted and the current editable HTML — these echo guards keep your caret stable while typing.

```tsx
import { useState } from 'react';
import { SummernoteEditor } from '@eaeao/summernote-react';

export function Controlled() {
  const [html, setHtml] = useState('<p>Edit me</p>');
  return <SummernoteEditor value={html} onChange={setHtml} />;
}
```

`onChange` is `(html: string) => void`. It fires after every committed change: a toolbar/keyboard command, `setCode`, direct typing/IME settle, undo, redo, and a resolved image upload. The argument is the current editable HTML.

> When the code view is open, the textarea owns the content: an external `value` is routed to the code view, and on leaving code view the (attacker-influenceable) HTML is sanitized before it is applied back to the engine.

---

## Drive it imperatively with a ref

Pass a `ref` to call methods directly — useful for form-style "save" buttons or toolbar actions outside the editor. The handle type is `SummernoteEditorHandle`:

```tsx
import { useRef } from 'react';
import { SummernoteEditor } from '@eaeao/summernote-react';
import type { SummernoteEditorHandle } from '@eaeao/summernote-react';

export function WithRef() {
  const ref = useRef<SummernoteEditorHandle>(null);
  return (
    <>
      <SummernoteEditor ref={ref} defaultValue="<p>Start…</p>" />
      <button onClick={() => ref.current?.command('bold')}>Bold</button>
      <button onClick={() => ref.current?.command('insertText', 'Hello, world')}>Insert text</button>
      <button onClick={() => console.log(ref.current?.getCode())}>Log HTML</button>
    </>
  );
}
```

The handle exposes `focus`, `getCode`, `setCode`, `command`, `undo`, `redo`, and the raw `core` escape hatch — documented in the [`SummernoteEditorHandle` reference](./reference-component.md#imperative-ref--summernoteeditorhandle). `command(name, ...args)` is the React equivalent of summernote's string-dispatch API (`summernote('insertText', 'hi')`); see the [command catalog](./reference-commands.md) for the full set.

---

## Customize the toolbar

The `toolbar` prop is an array of `[groupName, [itemName, …]]` tuples — the group name is a CSS grouping label, the second element is the ordered list of item names.

```tsx
<SummernoteEditor
  defaultValue="<p>Hi</p>"
  toolbar={[
    ['style', ['style', 'bold', 'italic', 'underline', 'clear']],
    ['para', ['ul', 'ol', 'paragraph']],
    ['insert', ['link', 'picture', 'video']],
    ['view', ['fullscreen', 'codeview', 'help']],
  ]}
/>
```

Recognized item names:

- **Dropdowns**: `style`, `fontname`, `fontsize`, `fontsizeunit`, `height` (line height), `color`, `paragraph`, `table`.
- **Format buttons**: `bold`, `italic`, `underline`, `strikethrough`, `superscript`, `subscript`, `clear`, `ul`, `ol`, `hr`, `undo`, `redo`.
- **Action buttons**: `link`, `picture`, `video`, `fullscreen`, `codeview`, `help`.

Any other name resolves to a custom plugin button. The default toolbar layout, the full item-name tables, and the contextual popover layouts are in the [toolbar reference](./reference-options.md#toolbar--popover-item-names). To hide the toolbar entirely, pass `toolbar={[]}`.

---

## Going further

You now have a working, controllable editor with your own toolbar. From here, pick what you need — each links to a copy-paste recipe and the full reference:

- **Themes** — `theme="lite | bs3 | bs4 | bs5"`, per instance (import the matching CSS skin); editors with different themes coexist on one page. → [recipe](./examples.md#themes) · [reference](./reference-options.md#themes)
- **Localization (i18n)** — `lang={locales['ko-KR']}`; 46 bundled locales, missing keys fall back to English. → [recipe](./examples.md#localization-i18n) · [reference](./reference-options.md#internationalization-i18n)
- **Image upload** — `onImageUpload={(file) => string | Promise<string>}` replaces the default base64 embed with your own hosted `src`. → [recipe](./examples.md#image-upload-async-onimageupload) · [reference](./reference-component.md#callbacks--onchange-onimageupload)
- **Plugins** — add per-instance commands + toolbar buttons with `definePlugin`. → [recipe](./examples.md#custom-plugin) · [plugin API](./reference-api.md#plugins--defineplugin)
- **Headless / your own chrome** — `useSummernote()` or `createEditorCore()` hand you the engine with no built-in UI. → [headless reference](./reference-api.md#headless-usesummernote--createeditorcore)
- **TypeScript** — the package ships its own declarations (`SummernoteEditorProps`, `SummernoteEditorHandle`, `ThemeName`, `SummernotePlugin`, `UseSummernoteResult`, `ImageUploadHandler`); no `@types/...` needed.

---

## Next steps

- [Examples](./examples.md) — copy-pasteable recipes (air mode, themes, i18n, image upload, custom toolbars, plugins, …).
- [Reference](./reference-component.md) — every `<SummernoteEditor>` prop, the `SummernoteEditorHandle` ref, the full `command(...)` catalog, engine options, `EditorState`, and the headless hook.
- [How it works](./concepts.md) — architecture, the caret-safe contract, and the security model.
- [Migrating from jQuery](./migrating.md) — coming from legacy jQuery summernote.
