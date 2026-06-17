# @eaeao4jerry/summernote-core

The **headless, framework-agnostic** editor engine behind
[`@eaeao4jerry/summernote-react`](https://www.npmjs.com/package/@eaeao4jerry/summernote-react) — a
TypeScript port of [summernote](https://summernote.org)'s editing core with **zero runtime
dependencies**, **no jQuery**, and **no `document.execCommand`**.

```bash
npm install @eaeao4jerry/summernote-core
```

## What's in here

- `EditorCore` / `createEditorCore(editable, options)` — mounts on a `contentEditable` element and
  exposes a typed command registry (`bold`, `fontName`, `createLink`, `insertTable`, `undo`, …) and
  a published `EditorState` (active formats + values) you subscribe to with `useSyncExternalStore`.
- Own Range-based commands with **deterministic markup** (e.g. `<s>` for strikethrough), structural
  state detection (no `queryCommandState`), and a faithful bookmark-based undo `History`.
- An IME composition state machine (observe-only window + settle + reconcile) for Hangul/CJK.
- `defaultOptions`, `langEnUS` + 46 `locales`, `resolveLang`, engine-accurate `env`/`detectEnv`,
  `createVideoNode`, and the codeview `purifyCodeview` / `isSafeLinkUrl` security helpers.

```ts
import { createEditorCore } from '@eaeao4jerry/summernote-core';

const core = createEditorCore(document.querySelector('#editable')!, { value: '<p>hi</p>' });
core.command('bold');
core.getHTML(); // '<p><b>hi</b></p>'
core.subscribe(() => render(core.getSnapshot()));
```

Ships dual ESM + CJS + `.d.ts`. For the React bindings use
[`@eaeao4jerry/summernote-react`](https://www.npmjs.com/package/@eaeao4jerry/summernote-react).

## License

MIT (port of summernote, MIT).
