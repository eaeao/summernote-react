# @eaeao/summernote-react

[![npm](https://img.shields.io/npm/v/@eaeao/summernote-react.svg)](https://www.npmjs.com/package/@eaeao/summernote-react)
[![docs](https://img.shields.io/badge/docs-live-8a2be2)](https://eaeao.github.io/summernote-react/)
[![license](https://img.shields.io/npm/l/@eaeao/summernote-react.svg)](./LICENSE)
![runtime deps: 0](https://img.shields.io/badge/runtime%20deps-0-brightgreen)
![no jQuery](https://img.shields.io/badge/jQuery-0-brightgreen)
![types](https://img.shields.io/badge/types-included-blue)

**📖 [Docs](https://eaeao.github.io/summernote-react/docs) · ▶ [Playground](https://eaeao.github.io/summernote-react/playground)** — live at <https://eaeao.github.io/summernote-react/>

A **React + TypeScript** port of the [summernote](https://summernote.org) WYSIWYG editor — the
editor engine and the React bindings in **one package**, with **zero runtime dependencies** and **no
jQuery**. Verified on Chromium + WebKit (Safari engine).

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

## Documentation

Full docs (with a live playground) are at **<https://eaeao.github.io/summernote-react/>**:

- [Getting started](https://eaeao.github.io/summernote-react/docs/getting-started) — install and build your first editor.
- [Examples](https://eaeao.github.io/summernote-react/docs/examples) — copy-paste recipes (air mode, themes, i18n, image upload, plugins…).
- Reference — [Component & state](https://eaeao.github.io/summernote-react/docs/reference-component), [Commands](https://eaeao.github.io/summernote-react/docs/reference-commands), [Options & toolbar](https://eaeao.github.io/summernote-react/docs/reference-options), [Headless & plugin API](https://eaeao.github.io/summernote-react/docs/reference-api).
- [How it works](https://eaeao.github.io/summernote-react/docs/concepts) — architecture, the caret-safe contract, and the security model.
- [Migrating from jQuery](https://eaeao.github.io/summernote-react/docs/migrating) — the legacy → React mapping.
- [Use with AI](https://eaeao.github.io/summernote-react/docs/use-with-ai) — AGENTS.md / SKILL.md, Context7, agent rules, and llms.txt.

## Features

- **Full chrome**: toolbar + dropdowns (style / font / size / line-height / paragraph / color /
  table), dialogs (link / image / video / help), contextual popovers (link / image / table) with an
  image-resize handle, fullscreen, code view, resize statusbar, placeholder, keyboard shortcuts.
- **Controlled & uncontrolled** with a caret-safe contract (the engine owns the editable; React
  never reconciles its subtree).
- **Air mode** (`airMode`) — floating toolbar at the selection (below it on touch).
- **4 themes** (`theme="lite|bs3|bs4|bs5"`, per-instance), **46 locales**, **plugins**.
- **Dark mode** — `colorScheme="light|dark|auto"` themes the whole editor (toolbar, dialogs, popovers, code view) from CSS variables.
- **IME-safe** observe-only composition state machine (Hangul/CJK).

## Props (selection)

| prop | description |
|---|---|
| `value` / `defaultValue` | controlled / uncontrolled HTML |
| `onChange(html)` | fired on content change |
| `toolbar` | `[group, names][]` config (defaults to the summernote default) |
| `theme` | `'lite'` (default) `'bs3'` `'bs4'` `'bs5'` — per-instance; themes coexist |
| `colorScheme` | `'light'` (default) `'dark'` `'auto'` — dark mode (lite skin) |
| `lang` | a locale: `lang={locales['ko-KR']}` |
| `onImageUpload(file)` | upload a picked image yourself; return/resolve the `src` to insert (else base64) |
| `airMode`, `placeholder`, `disableResize`, `plugins` | see types |

Full props, the `command()` catalog, and engine options are in the [reference docs](https://eaeao.github.io/summernote-react/docs/reference-component).

## Image upload

By default a picked image is embedded as a base64 data URL. Provide `onImageUpload` to upload it your
way (your server, S3, …) and insert the returned URL — a spinner shows in place while the promise
resolves (the file picker is single-file):

```tsx
<SummernoteEditor
  onImageUpload={async (file) => {
    const url = await uploadToServer(file); // your API
    return url;                             // (or a base64 string) — a spinner shows until this resolves
  }}
/>
```

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

- **No jQuery, zero runtime deps** — own Range-based commands with deterministic
  markup; structurally-detected toolbar state; faithful bookmark-based undo.
- **Cross-browser** — engine-accurate detection, WebKit caret guards, Pointer Events touch drag,
  visualViewport-aware popovers. Verified on Chromium + WebKit.
- **Security** — code-view HTML is purified (script/style/object/embed/non-whitelisted iframes
  stripped); link hrefs reject `javascript:` / `data:` schemes.

## Use with AI

The package ships machine-readable guidance so AI coding assistants integrate it without guessing the API:

- **[`AGENTS.md`](AGENTS.md)** and **[`SKILL.md`](SKILL.md)** are bundled in the npm tarball (version-pinned) — readable straight from `node_modules`.
- **[Context7](https://context7.com/eaeao/summernote-react)** serves the docs to your tool on demand, version-pinned.
- The docs site publishes **[`llms.txt`](https://eaeao.github.io/summernote-react/llms.txt)** + a per-page `.md` mirror, and every docs page has a **Copy page** button.

See **[Use with AI](https://eaeao.github.io/summernote-react/docs/use-with-ai)** for setup snippets and a drop-in agent-rules block.

## Playground

The [live site](https://eaeao.github.io/summernote-react/) pairs the docs with an interactive **[Playground](https://eaeao.github.io/summernote-react/playground)** — themes, 46 locales, air mode, a custom plugin, controlled HTML, the imperative ref, two editors coexisting. Run it locally (it loads the editor straight from source):

```bash
cd demo && yarn install && yarn dev      # http://localhost:5173
```

## Development

```bash
yarn install
yarn verify   # jQuery-ban + zero-dep + version gates + typecheck
yarn test     # full suite, both engines (Chromium + WebKit)
yarn build    # dual ESM + CJS + .d.ts
```

> The [`deploy-demo`](.github/workflows/deploy-demo.yml) workflow builds `demo/` and publishes it (docs + playground + `llms.txt`) to GitHub Pages on every push to `main`. One-time: repo **Settings → Pages → Source = GitHub Actions**.

## License

MIT — a port of [summernote](https://github.com/summernote/summernote) (MIT).
