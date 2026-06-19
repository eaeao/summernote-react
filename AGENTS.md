# AGENTS.md — `@eaeao/summernote-react`

Guidance for AI coding agents integrating this package. This document describes `@eaeao/summernote-react@1.4.1`. It ships its own TypeScript declarations — treat the bundled `.d.ts` as the source of truth; this file is the orientation.

`@eaeao/summernote-react` is a **React + TypeScript port of summernote**: the editing engine and the React bindings in one npm package, with **zero runtime dependencies** and **no jQuery / no `document.execCommand`**. It is a normal React component — there is no `$('.x').summernote(...)` and no global state.

## Install

```bash
npm install @eaeao/summernote-react
```

`react` and `react-dom` (>= 18) are **peer dependencies**. Nothing else is needed — the engine is bundled in (no jQuery, Bootstrap JS, Popper, or FontAwesome).

## CSS is not auto-injected — import it yourself

Two stylesheets are **required**; theme skins are optional:

```ts
import '@eaeao/summernote-react/styles.css'; // base / lite skin (required)
import '@eaeao/summernote-react/icons.css';  // shared icon webfont (required)
import '@eaeao/summernote-react/themes/bs5.css'; // optional: bs3 | bs4 | bs5 skin
```

## Core usage

Controlled (HTML in React state) and uncontrolled (engine owns the content) are both supported. Initial content is `value ?? defaultValue`.

```tsx
import { useState } from 'react';
import { SummernoteEditor } from '@eaeao/summernote-react';

function Editor() {
  const [html, setHtml] = useState('<p>Hello</p>');
  return <SummernoteEditor value={html} onChange={setHtml} />;
}
```

`onChange: (html: string) => void` fires on every committed change (command, typing/IME settle, undo/redo, resolved image upload), with the current editable HTML.

> Caret-safe contract: React renders only the chrome (toolbar/dialogs/popovers/statusbar) plus one `contentEditable` leaf the engine owns and mutates imperatively. A controlled `value` is pushed into the engine **only when it differs** from the last emitted value and the current HTML (echo guards). Do **not** force-resync on every keystroke — pass `value`/`onChange` and let the guards work.

## Imperative ref + the `command()` API

```tsx
import { useRef } from 'react';
import { SummernoteEditor, type SummernoteEditorHandle } from '@eaeao/summernote-react';

const ref = useRef<SummernoteEditorHandle>(null);
<SummernoteEditor ref={ref} defaultValue="<p>Start…</p>" onChange={save} />;
// ref.current?.getCode()         get HTML
// ref.current?.setCode(html)     set HTML
// ref.current?.command('bold')   dispatch a command (returns boolean)
// ref.current?.command('insertText', 'hi')
// ref.current?.focus() / undo() / redo()
// ref.current?.core              the raw EditorCore (escape hatch)
```

There is **no `'module.method'` string dispatch** (the legacy summernote style). Every editing action is a **flat command name** passed to `command(name, ...args)`. The built-in names are the exported `CommandName` union (50 commands) — they autocomplete; `command()` also accepts any `string` so plugin commands work:

`insertText` · `bold` `italic` `underline` `strikethrough` `superscript` `subscript` `removeFormat` · `fontName` `fontSize` `fontSizeUnit` `foreColor` `backColor` `color` `lineHeight` · `justifyLeft` `justifyCenter` `justifyRight` `justifyFull` · `formatPara` `formatH1`…`formatH6` `formatBlock` `indent` `outdent` · `insertOrderedList` `insertUnorderedList` · `insertTable` `addRow` `addCol` `deleteRow` `deleteCol` `deleteTable` `tab` `untab` · `createLink` `unlink` `insertImage` `insertVideo` `insertHorizontalRule` `insertNode` `resizeImage` `floatImage` `removeMedia` · `undo` `redo`

`undo`, `redo`, `resizeImage`, `floatImage`, `removeMedia` work without a selection; every other command no-ops and returns `false` when there is no recoverable editor selection.

## Props (the `options` object becomes props)

| prop | type | note |
|---|---|---|
| `value` / `defaultValue` | `string` | controlled / uncontrolled HTML |
| `onChange` | `(html: string) => void` | committed-change callback |
| `toolbar` | `readonly [string, readonly string[]][]` | `[group, [itemName…]]`; `[]` hides it |
| `theme` | `'lite' \| 'bs3' \| 'bs4' \| 'bs5'` | **per-instance** (default `'lite'`); themed editors coexist |
| `lang` | `LangPartial` | e.g. `lang={locales['ko-KR']}`; deep-merged over en-US, missing keys fall back to English |
| `placeholder` | `string` | shown over an empty editable |
| `airMode` | `boolean` | floating toolbar at the selection (below it on touch) |
| `disableResize` | `boolean` | hide the resize statusbar |
| `plugins` | `readonly SummernotePlugin[]` | per-instance commands + buttons |
| `onImageUpload` | `(file: File) => string \| Promise<string>` | called once per picked file; **return/resolve the image `src`** (else base64 embed) |
| `options` | `Omit<EditorCoreOptions,'value'\|'onChange'>` | engine opts: `historyLimit`, `shortcuts`, `keyMap`, `isMac`, `onShortcut` |
| `className` | `string` | extra class on the root |

Toolbar item names: dropdowns `style` `fontname` `fontsize` `fontsizeunit` `height` `color` `paragraph` `table`; buttons `bold` `italic` `underline` `strikethrough` `superscript` `subscript` `clear` `ul` `ol` `hr` `undo` `redo`; actions `link` `picture` `video` `fullscreen` `codeview` `help`. Any other name resolves to a plugin button.

> `lang` is deep-merged; `toolbar` and `options.keyMap` are **replace-not-merge** — if you pass `keyMap`, pass the complete map (yours replaces the defaults).

## Image upload

```tsx
<SummernoteEditor
  onImageUpload={async (file) => {
    const url = await uploadToServer(file); // your API; one call per picked file
    return url;                             // inserted as <img src>; a spinner shows until this resolves
  }}
/>
```

## Headless + plugins

```tsx
import { useSummernote, createEditorCore, definePlugin, useCommand } from '@eaeao/summernote-react';
// useSummernote({ value, onChange }) -> { editableRef, core, state }  (render your own chrome)
// createEditorCore(el, opts)         -> the framework-agnostic engine (commands + EditorState)

const shout = definePlugin({
  name: 'shout',
  commands: { shout: (core) => { /* mutate selection via core */ return true; } },
  buttons: { shout: () => { const cmd = useCommand(); return <button onClick={() => cmd('shout')}>!</button>; } },
});
<SummernoteEditor plugins={[shout]} toolbar={[['insert', ['shout']]]} />;
```

`EditorState` (from `useSummernote().state` or `useChrome().state`) is the structurally-detected caret state: `bold/italic/underline/…`, `align`, `formatBlock`, `link`, `inTable`, `fontName/fontSize/fontSizeUnit/lineHeight`, `canUndo/canRedo`, `isComposing`. Built-in reference plugins: `helloPlugin`, `specialcharsPlugin`, `databasicPlugin`.

## Security

Code-view HTML is purified before it is applied back (script/style/object/embed/non-whitelisted iframes stripped). Link hrefs reject `javascript:` / `vbscript:` / `data:` schemes. The controlled `value`, `setCode()`, and the initial seed are treated as developer-supplied (trusted) and are **not** purified — sanitize untrusted HTML before passing it in.

## Migrating from jQuery summernote

| jQuery summernote | this package |
|---|---|
| `$('.x').summernote(options)` | `<SummernoteEditor …props />` |
| `$('.x').summernote('insertText','hi')` | `ref.current?.command('insertText','hi')` |
| `$('.x').summernote('code')` / `'code', html` | `getCode()` / `setCode(html)`, or controlled `value`/`onChange` |
| `$('.x').summernote('destroy')` | unmount the component |
| `callbacks: { onChange }` | the `onChange` prop (single channel) |
| `$.extend(true, $.summernote.lang, …)` | `lang={locales['ko-KR']}` prop |
| `$.extend($.summernote.plugins, …)` | `definePlugin(...)` → `plugins={[…]}` (per-instance) |

## Full documentation

- Docs site: <https://eaeao.github.io/summernote-react/>
- Reference (component, commands, options, headless/plugin API), concepts, and migration live under `docs/` in the repo: <https://github.com/eaeao/summernote-react/tree/main/docs>
- The package ships complete TypeScript declarations — prefer them for exact prop/type signatures.
