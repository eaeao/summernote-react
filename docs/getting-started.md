# Getting Started

Install `@eaeao/summernote-react` and render your first editor — a React + TypeScript port of summernote with a self-contained engine, **zero runtime dependencies and no jQuery**.

`@eaeao/summernote-react` ships the editing engine and the React bindings in a single npm package. You use it as a normal React component (`<SummernoteEditor value={html} onChange={setHtml} />`) — there is no `$('.x').summernote(...)` and no global state. `react`/`react-dom` (>= 18) are **peer dependencies**; everything else is bundled.

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

The icon webfont (`icons.css`) is shared by every theme. The four themes are CSS skins layered on top of the base, applied **per instance** via the `theme` prop (see [Themes](#themes)). If you use a Bootstrap theme, also import its skin:

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

The root element is a `<div class="note-editor note-frame note-theme-lite …">`. React renders only the *chrome* (toolbar, dropdowns, dialogs, statusbar, popovers) plus a single `contentEditable` leaf that the engine owns and mutates imperatively. React never reconciles inside the editable, so toolbar/state re-renders cannot disturb your caret.

---

## Controlled vs. uncontrolled

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

Pass `value` together with `onChange`. The component pushes an external `value` into the engine **only when it genuinely differs** from both the last value it emitted and the current editable HTML — these echo guards keep your caret stable while typing.

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

## The imperative ref

Pass a `ref` to call methods directly. The handle type is `SummernoteEditorHandle`:

```ts
interface SummernoteEditorHandle {
  focus(): void;
  getCode(): string;
  setCode(html: string): void;
  command(name: string, ...args: unknown[]): boolean;
  undo(): void;
  redo(): void;
  readonly core: EditorCore | null;
}
```

Each member (`focus`, `getCode`, `setCode`, `command`, `undo`, `redo`, and the raw `core` escape hatch) is documented in the [`SummernoteEditorHandle` reference](./reference-component.md#imperative-ref--summernoteeditorhandle).

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

The `command(name, ...args)` method is the React equivalent of summernote's string-dispatch API (`summernote('insertText', 'hi')`). See the [command catalog](./reference-commands.md) for the full set (`bold`, `insertText`, `insertImage`, `createLink`, `insertTable`, `formatH1`…`formatH6`, `undo`, `redo`, and more).

---

## Component props

The props you'll reach for first:

- `value` / `defaultValue` — controlled / uncontrolled HTML (see [above](#controlled-vs-uncontrolled)).
- `onChange(html)` — fires after every committed change.
- `toolbar` — `[group, [itemName…]]` tuples (see [below](#customizing-the-toolbar)).
- `theme` — `'lite' | 'bs3' | 'bs4' | 'bs5'`, per instance (see [Themes](#themes)).
- `lang` — locale, deep-merged over en-US (see [i18n](#internationalization-i18n)).
- `placeholder`, `airMode`, `disableResize`, `plugins`, `onImageUpload`, `options`, `className`.

The **complete** prop table — every prop, type, default, and the `options` / `EditorState` surface — lives in the [Props reference](./reference-component.md#props-reference).

---

## Customizing the toolbar

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

Any other name resolves to a custom plugin button (see [Plugins](#plugins)). The default toolbar layout, the full item-name tables, and the contextual popover layouts are in the [toolbar reference](./reference-options.md#toolbar--popover-item-names).

---

## Themes

The `theme` prop picks one of four visual skins, **per instance** — multiple editors with different themes can coexist on the same page. It only sets a root class (`note-theme-${theme}`); all themes share the same `.note-*` markup and the shared icon webfont. Remember to import the matching CSS skin.

```tsx
import '@eaeao/summernote-react/styles.css';
import '@eaeao/summernote-react/icons.css';
import '@eaeao/summernote-react/themes/bs5.css';

<SummernoteEditor theme="bs5" defaultValue="<p>Bootstrap 5 skin</p>" />;
```

The exported `ThemeName` type is `'lite' | 'bs3' | 'bs4' | 'bs5'`. Unlike legacy jQuery summernote (where the theme/UI was a last-import-wins global), themes here are scoped to each instance.

---

## Internationalization (i18n)

Pass a `LangPartial` to the `lang` prop; it is deep-merged over en-US, so any missing keys fall back to English. The package bundles **46 locales** as the `locales` map.

```tsx
import { SummernoteEditor, locales } from '@eaeao/summernote-react';

<SummernoteEditor lang={locales['ko-KR']} defaultValue="<p>안녕하세요</p>" />;
```

You can also supply an ad-hoc partial override (unspecified keys fall back to English):

```tsx
<SummernoteEditor lang={{ link: { insert: '링크 삽입' } }} />
```

Available codes include `ar-AR, de-DE, es-ES, fr-FR, it-IT, ja-JP, ko-KR, pt-BR, ru-RU, zh-CN, zh-TW`, and more (46 in total; en-US is the always-present base). See the [i18n reference](./reference-options.md#internationalization-i18n) for the full list and tree-shakeable single-locale imports.

---

## Image upload

By default a picked image is embedded as a base64 data URL. Provide an `onImageUpload` hook to upload the file your own way and return the `src` to insert:

```tsx
<SummernoteEditor
  onImageUpload={async (file) => {
    const url = await uploadToYourServer(file);
    return url; // inserted as <img src={url}>
  }}
/>
```

The handler is `(file: File) => string | Promise<string>`, called once per picked file. While the promise is pending the editor shows a loading spinner in place; on rejection the placeholder is removed and never leaks into the saved value or the undo stack. Inserting an image by URL through the picture dialog works regardless of the hook. See the [`onImageUpload` reference](./reference-component.md#callbacks--onchange-onimageupload) for details.

---

## Plugins

A plugin registers per-instance **commands** and/or custom toolbar **buttons** — no globals. Author one with `definePlugin`, then pass it through the `plugins` prop and reference its button by name in the `toolbar` config:

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

const starPlugin = definePlugin({
  name: 'star',
  commands: {
    insertStar: (core): boolean => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const range = sel.getRangeAt(0);
      if (!core.ownsRange(range)) return false; // must be inside this editor
      range.deleteContents();
      range.insertNode(document.createTextNode('★'));
      range.collapse(false);
      return true; // changed → undo step + onChange
    },
  },
  buttons: { star: StarButton },
});

<SummernoteEditor plugins={[starPlugin]} toolbar={[['insert', ['star']]]} />;
```

Three reference plugins ship in the box: `helloPlugin`, `specialcharsPlugin`, `databasicPlugin`. See [Headless & plugin API](./reference-api.md#plugins--defineplugin) for the full `definePlugin` contract and `useChrome` / `useCommand` helpers.

---

## TypeScript notes

The package is written in TypeScript and ships its own type declarations — no `@types/...` needed. Useful exported types:

| Type | Use |
|---|---|
| `SummernoteEditorProps` | Props of `<SummernoteEditor>`. |
| `SummernoteEditorHandle` | The imperative `ref` handle (`getCode` / `setCode` / `command` / `focus` / `undo` / `redo` / `core`). |
| `ThemeName` | `'lite' \| 'bs3' \| 'bs4' \| 'bs5'`. |
| `SummernotePlugin` | Return type of `definePlugin`. |
| `UseSummernoteResult` | Return type of the headless `useSummernote` hook. |
| `ImageUploadHandler` | `(file: File) => string \| Promise<string>` for `onImageUpload`. |

```tsx
import { useRef } from 'react';
import { SummernoteEditor } from '@eaeao/summernote-react';
import type { SummernoteEditorHandle, ThemeName } from '@eaeao/summernote-react';

const theme: ThemeName = 'lite';
const ref = useRef<SummernoteEditorHandle>(null);

<SummernoteEditor ref={ref} theme={theme} defaultValue="<p>Typed editor</p>" />;
```

The engine surface (e.g. `EditorCore`, `EditorState`, `EditorCoreOptions`) is also re-exported from the package root for advanced use via `ref.current?.core`.

### Headless hook

For full control over layout and markup, `useSummernote(options)` returns `{ editableRef, core, state }`. Attach `editableRef` to your own `contentEditable` `.note-editable` div; the engine owns that subtree imperatively, and `state` (an `EditorState`) drives your custom chrome via `useSyncExternalStore`. See the [headless reference](./reference-api.md#headless-usesummernote--createeditorcore) for the hook contract.

---

## Next steps

- [Reference](./reference-component.md) — every `<SummernoteEditor>` prop, the `SummernoteEditorHandle` ref, the full `command(...)` catalog, engine options, `EditorState`, and the `useSummernote` headless hook.
- [Examples](./examples.md) — copy-pasteable recipes (air mode, themes, i18n, image upload, custom toolbars, plugins, …).
- [How it works](./concepts.md) — architecture, the caret-safe contract, and the security model.
