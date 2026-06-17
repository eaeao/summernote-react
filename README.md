# @eaeao/summernote-react

[![npm](https://img.shields.io/npm/v/@eaeao/summernote-react.svg)](https://www.npmjs.com/package/@eaeao/summernote-react)
[![license](https://img.shields.io/npm/l/@eaeao/summernote-react.svg)](./LICENSE)
![runtime deps: 0](https://img.shields.io/badge/runtime%20deps-0-brightgreen)
![no jQuery](https://img.shields.io/badge/jQuery-0-brightgreen)
![types](https://img.shields.io/badge/types-included-blue)

A **React + TypeScript** port of the [summernote](https://summernote.org) WYSIWYG editor — the
editor engine and the React bindings in **one package**, with **zero runtime dependencies**, **no
jQuery**, and **no `document.execCommand`**. Verified on Chromium + WebKit (Safari engine).

```bash
npm install @eaeao/summernote-react
```

`react` / `react-dom` (>=18) are peer dependencies. The headless engine is bundled in — no second
package to install.

## Quick start

```tsx
import { SummernoteEditor } from '@eaeao/summernote-react';
import '@eaeao/summernote-react/styles.css';
import '@eaeao/summernote-react/icons.css';

function App() {
  const [html, setHtml] = useState('<p>Hello</p>');
  return <SummernoteEditor value={html} onChange={setHtml} />;
}
```

Uncontrolled + imperative ref:

```tsx
import { useRef } from 'react';
import { SummernoteEditor, type SummernoteEditorHandle } from '@eaeao/summernote-react';

const ref = useRef<SummernoteEditorHandle>(null);
<SummernoteEditor ref={ref} defaultValue="<p>Start…</p>" onChange={save} />;
// ref.current?.getCode() / setCode(html) / command('bold') / focus() / undo() / redo()
```

Headless hook (render your own chrome), or drive the engine directly:

```tsx
import { useSummernote, createEditorCore } from '@eaeao/summernote-react';
// useSummernote({ value, onChange }) -> { editableRef, core, state }
// createEditorCore(el, opts) -> the framework-agnostic engine (commands + EditorState)
```

## Features

- **Full chrome**: toolbar + dropdowns (style / font / size / line-height / paragraph / color /
  table), dialogs (link / image / video / help), contextual popovers (link / image / table) with an
  image-resize handle, fullscreen, code view, resize statusbar, placeholder, keyboard shortcuts.
- **Controlled & uncontrolled** with a caret-safe contract (the engine owns the editable; React
  never reconciles its subtree).
- **Air mode** (`airMode`) — floating toolbar at the selection (below it on touch).
- **4 themes** (`theme="lite|bs3|bs4|bs5"`, per-instance), **46 locales**, **plugins**.
- **IME-safe** observe-only composition state machine (Hangul/CJK).

## Props (selection)

| prop | description |
|---|---|
| `value` / `defaultValue` | controlled / uncontrolled HTML |
| `onChange(html)` | fired on content change |
| `toolbar` | `[group, names][]` config (defaults to the summernote default) |
| `theme` | `'lite'` (default) `'bs3'` `'bs4'` `'bs5'` — per-instance; themes coexist |
| `lang` | a locale: `lang={locales['ko-KR']}` |
| `airMode`, `placeholder`, `disableResize`, `plugins` | see types |

## Themes & i18n

```tsx
import '@eaeao/summernote-react/styles.css';
import '@eaeao/summernote-react/icons.css';
import '@eaeao/summernote-react/themes/bs5.css';
import { locales } from '@eaeao/summernote-react';

<SummernoteEditor theme="bs5" lang={locales['ko-KR']} />;
```

## Plugins

```tsx
import { definePlugin, SummernoteEditor } from '@eaeao/summernote-react';

const myPlugin = definePlugin({
  name: 'shout',
  commands: { shout: (core) => { /* mutate the selection */ return true; } },
  buttons: { shout: () => { const cmd = useCommand(); return <button onClick={() => cmd('shout')}>!</button>; } },
});
<SummernoteEditor plugins={[myPlugin]} toolbar={[['insert', ['shout']]]} />;
```

Reference plugins ship in the box: `helloPlugin`, `specialcharsPlugin`, `databasicPlugin`.

## Why this port

- **No jQuery, no `execCommand`, zero runtime deps** — own Range-based commands with deterministic
  markup; structurally-detected toolbar state; faithful bookmark-based undo.
- **Cross-browser** — engine-accurate detection, WebKit caret guards, Pointer Events touch drag,
  visualViewport-aware popovers. Verified on Chromium + WebKit.
- **Security** — code-view HTML is purified (script/style/object/embed/non-whitelisted iframes
  stripped); link hrefs reject `javascript:` / `data:` schemes.

## Demo

A live demo (themes, 46 locales, air mode, a custom plugin, controlled HTML, the imperative ref,
two editors coexisting) lives in [`demo/`](demo) and runs the editor straight from source:

```bash
cd demo && yarn install && yarn dev      # http://localhost:5173
```

## Development

```bash
yarn install
yarn verify   # jQuery-ban + zero-dep gates + typecheck
yarn test     # full suite, both engines  (heavy — see docs/STATUS.md)
yarn build    # dual ESM + CJS + .d.ts
```

Design + status: [docs/PORTING-PLAN.md](docs/PORTING-PLAN.md), [docs/STATUS.md](docs/STATUS.md).

## License

MIT — a port of [summernote](https://github.com/summernote/summernote) (MIT).
