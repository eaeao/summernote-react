# @eaeao/summernote-react

> A React + TypeScript port of summernote — its own engine, zero runtime dependencies, no jQuery.

`@eaeao/summernote-react` is a single npm package that brings the summernote WYSIWYG editor to React 18+ as a real component. The editing engine (range commands, history, tables, lists, structural state detection) and the React bindings ship together, so there are **no runtime dependencies** — `react`/`react-dom` (>=18) are peer dependencies, and the engine is bundled in. You use it the React way: render `<SummernoteEditor value={html} onChange={setHtml} />`, drive it imperatively through a `SummernoteEditorHandle` ref, extend it with `definePlugin(...)`, switch themes per-instance, and localize with bundled `locales`. Verified on Chromium + WebKit.

## Install

```bash
npm install @eaeao/summernote-react
```

```bash
yarn add @eaeao/summernote-react
```

`react` and `react-dom` (>=18) must already be present in your app — they are peer dependencies.

## Minimal example

```tsx
import { useState } from 'react';
import { SummernoteEditor } from '@eaeao/summernote-react';

// CSS is not auto-injected — import the base skin + icon webfont yourself.
import '@eaeao/summernote-react/styles.css';
import '@eaeao/summernote-react/icons.css';

export function Editor() {
  const [html, setHtml] = useState('<p>Hello <b>Summernote</b></p>');

  return <SummernoteEditor value={html} onChange={setHtml} />;
}
```

That's the whole contract: `value` is the HTML source of truth and `onChange(html: string)` reports edits. The engine owns the `contentEditable` subtree; React only renders the surrounding chrome (toolbar, dropdowns, dialogs, popovers, statusbar), so re-renders never disturb the caret.

### Uncontrolled + imperative ref

```tsx
import { useRef } from 'react';
import { SummernoteEditor, type SummernoteEditorHandle } from '@eaeao/summernote-react';

function Demo() {
  const ref = useRef<SummernoteEditorHandle>(null);

  return (
    <>
      <SummernoteEditor ref={ref} defaultValue="<p>Start typing…</p>" />
      <button onClick={() => console.log(ref.current?.getCode())}>Get HTML</button>
      <button onClick={() => ref.current?.command('bold')}>Bold</button>
      <button onClick={() => ref.current?.undo()}>Undo</button>
    </>
  );
}
```

The `SummernoteEditorHandle` exposes `getCode()`, `setCode(html)`, `command(name, ...args)`, `focus()`, `undo()`, `redo()`, and `core` (the raw `EditorCore` engine instance, or `null` until mounted).

## Documentation

**Tutorial** — [Getting started](./getting-started.md): install, CSS imports, and a guided first editor.

**How-to** — [Examples](./examples.md): copy-pasteable recipes (air mode, themes, i18n, image upload, custom toolbars, plugins, …).

**Reference**

| Page | What's inside |
|---|---|
| [Component & state](./reference-component.md) | Every `<SummernoteEditor>` prop, the `SummernoteEditorHandle` ref, the published `EditorState`, and the `onChange` / `onImageUpload` callbacks. |
| [Commands](./reference-commands.md) | The full `command(name, ...)` catalog (inline, block, list, table, media, history). |
| [Options & toolbar](./reference-options.md) | Engine `options`, the `toolbar` / `popover` tuple format and item names, fonts, colors, line heights, the `keyMap`, themes, and the 46 bundled locales. |
| [Headless & plugin API](./reference-api.md) | `useSummernote`, `createEditorCore`, the `EditorCore` methods, and the `definePlugin` / `useChrome` / `useCommand` contract. |

**Explanation**

| Page | What's inside |
|---|---|
| [How it works](./concepts.md) | Architecture (engine vs. chrome), the controlled caret-safe contract, the security model, and extension-safe selection. |
| [Migrating from jQuery](./migrating.md) | The legacy `$('.x').summernote(...)` / `$.summernote.plugins` → React component, props, ref, and `definePlugin` mapping. |

## Key facts

- **No jQuery.** The engine computes editor state structurally from the caret's ancestor chain and edits via its own Range commands.
- **Zero runtime deps.** Only `react` / `react-dom` (>=18) peers; the engine is bundled (ESM + CJS + `.d.ts`).
- **Per-instance themes.** `theme="lite | bs3 | bs4 | bs5"` plus the matching CSS — multiple editors with different themes coexist on one page.
- **46 bundled locales.** `import { locales } from '@eaeao/summernote-react'` and pass `lang={locales['ko-KR']}`; missing keys fall back to en-US.
- **Pluggable image upload.** `onImageUpload={(file) => string | Promise<string>}` replaces the default base64 embed with your own hosted `src`.

## Links

- **Live demo:** <https://eaeao.github.io/summernote-react/>
- **npm:** <https://www.npmjs.com/package/@eaeao/summernote-react>

## License

MIT.
