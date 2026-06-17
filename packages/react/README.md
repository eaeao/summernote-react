# @eaeao4jerry/summernote-react

A **React + TypeScript** port of the [summernote](https://summernote.org) WYSIWYG editor — rebuilt
on summernote's own editing engine with **zero runtime dependencies**, **no jQuery**, and **no
`document.execCommand`**. Works on Chromium, Safari/WebKit, and mobile (iOS Safari, Android Chrome,
Samsung Internet).

```bash
npm install @eaeao4jerry/summernote-react @eaeao4jerry/summernote-core
```

`react` / `react-dom` (>=18) are peer dependencies.

## Quick start

```tsx
import { SummernoteEditor } from '@eaeao4jerry/summernote-react';
import '@eaeao4jerry/summernote-react/styles.css';
import '@eaeao4jerry/summernote-react/icons.css';

function App() {
  const [html, setHtml] = useState('<p>Hello</p>');
  return <SummernoteEditor value={html} onChange={setHtml} />;
}
```

Uncontrolled (with a ref for imperative access):

```tsx
import { useRef } from 'react';
import { SummernoteEditor, type SummernoteEditorHandle } from '@eaeao4jerry/summernote-react';

const ref = useRef<SummernoteEditorHandle>(null);
<SummernoteEditor ref={ref} defaultValue="<p>Start typing…</p>" onChange={(html) => save(html)} />;
// ref.current?.getCode() / setCode(html) / command('bold') / focus() / undo() / redo()
```

Or the headless hook, if you want to render your own chrome:

```tsx
import { useSummernote } from '@eaeao4jerry/summernote-react';

const { editableRef, core, state } = useSummernote({ value: '<p>hi</p>', onChange });
// attach editableRef to a contentEditable div; drive `core.command(...)`; read `state` for active-state
```

## Features

- **Full chrome**: toolbar + dropdowns (style / font / size / line-height / paragraph / color /
  table), dialogs (link / image / video / help), contextual popovers (link / image / table) with an
  image-resize handle, fullscreen, code view, resize statusbar, placeholder, keyboard shortcuts.
- **Controlled & uncontrolled** with a caret-safe contract (the engine owns the editable; React
  never reconciles its subtree).
- **Air mode** — `airMode` shows a floating toolbar at the selection (below it on touch).
- **IME-safe** — an observe-only composition state machine for Hangul/CJK.

## Props (selection)

| prop | description |
|---|---|
| `value` / `defaultValue` | controlled / uncontrolled HTML |
| `onChange(html)` | fired on content change |
| `toolbar` | `[group, names][]` config (defaults to the summernote default) |
| `theme` | `'lite'` (default) `'bs3'` `'bs4'` `'bs5'` — per-instance; editors with different themes coexist |
| `lang` | a locale, e.g. `lang={locales['ko-KR']}` |
| `airMode`, `placeholder`, `disableResize`, `plugins` | see types |

## Themes

```tsx
import '@eaeao4jerry/summernote-react/styles.css';      // base (lite)
import '@eaeao4jerry/summernote-react/icons.css';       // shared icon font
import '@eaeao4jerry/summernote-react/themes/bs5.css';   // + Bootstrap 5 skin
<SummernoteEditor theme="bs5" />
```

## i18n

46 bundled locales, deep-merged over `en-US` (missing keys fall back to English):

```tsx
import { locales } from '@eaeao4jerry/summernote-core';
<SummernoteEditor lang={locales['ja-JP']} />
```

## Plugins

```tsx
import { definePlugin, SummernoteEditor } from '@eaeao4jerry/summernote-react';

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
  markup, structurally-detected toolbar state.
- **Cross-browser** — engine-accurate detection, WebKit caret guards, Pointer Events for touch
  drag, visualViewport-aware popovers. Verified on Chromium + WebKit.
- **Security** — the code-view HTML is purified (script/style/object/embed/non-whitelisted iframes
  stripped); link hrefs reject `javascript:`/`data:` schemes.

## License

MIT (port of summernote, MIT).
