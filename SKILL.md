---
name: summernote-react
description: >-
  Use when integrating @eaeao/summernote-react — a React + TypeScript WYSIWYG
  editor (a port of summernote with zero runtime deps and no jQuery). Covers
  installing, required CSS imports, controlled vs uncontrolled usage, the
  imperative command() API and its 50 command names, toolbar/themes/i18n, async
  image upload, headless/plugin APIs, and migrating from jQuery summernote.
---

# summernote-react

This skill describes `@eaeao/summernote-react@1.4.1`, a React + TypeScript port of the summernote WYSIWYG editor — the editing engine and React bindings in one npm package, **zero runtime dependencies, no jQuery, no `document.execCommand`**. It is a normal React component, not a jQuery plugin.

## When to use

Use this skill when a task involves adding, configuring, or debugging a rich-text / WYSIWYG editor in a React (>= 18) + TypeScript app with `@eaeao/summernote-react`, or migrating an app from jQuery summernote.

## Quick orientation

```bash
npm install @eaeao/summernote-react   # react/react-dom >= 18 are peer deps
```

```tsx
import { SummernoteEditor } from '@eaeao/summernote-react';
import '@eaeao/summernote-react/styles.css'; // required
import '@eaeao/summernote-react/icons.css';  // required

const [html, setHtml] = useState('<p>Hello</p>');
<SummernoteEditor value={html} onChange={setHtml} />;
```

## Load-bearing facts (get these right)

- **It is a component, not `$('.x').summernote(...)`.** No jQuery, no globals, no `<script>` load order.
- **CSS is not auto-injected** — you must import `styles.css` and `icons.css` (plus an optional `themes/{bs3,bs4,bs5}.css`).
- **Commands are flat names**, dispatched via `ref.current?.command(name, ...args)` or `useCommand()` — there is **no `'module.method'` string dispatch**. The 50 built-in names are the exported `CommandName` union (autocompletes); plugin command names are also accepted.
- **Controlled value is caret-safe** — pass `value`/`onChange`; the engine ignores echoes of its own output. Do not force-resync each keystroke.
- **`lang` deep-merges** over en-US (missing keys fall back to English); **`toolbar` and `options.keyMap` replace wholesale**.
- **`theme` is per-instance** (`'lite'|'bs3'|'bs4'|'bs5'`); differently-themed editors coexist.
- **`onImageUpload(file)`** is called once per picked file and must **return or resolve the image `src`** (otherwise the image is embedded as base64).
- **Types ship in the package** — no `@types/...`; trust the bundled `.d.ts` for exact signatures.

## Where to look next

1. **`AGENTS.md`** (shipped in this package, repo root) — the dense, self-contained reference: full props table, all command/toolbar item names, headless (`useSummernote`/`createEditorCore`), `definePlugin`, `EditorState`, security model, and a jQuery→React migration table. Read this first for any non-trivial task.
2. **Bundled TypeScript declarations** — the authoritative prop/type/command signatures.
3. **Docs site & repo docs** — <https://eaeao.github.io/summernote-react/> and <https://github.com/eaeao/summernote-react/tree/main/docs> (getting-started, reference-component / -commands / -options / -api, concepts, migrating).
