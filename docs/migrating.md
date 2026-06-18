# Migrating from jQuery summernote

`@eaeao/summernote-react` is a from-scratch React + TypeScript port — not a wrapper. There is no `$('.x').summernote(...)`, no `$.summernote.*` globals, and no jQuery. This page maps the legacy jQuery API to the React one.

> For the architectural background, see [How it works](./concepts.md). For the full surface, see the [API reference](./reference-component.md).

---

## At a glance

| jQuery summernote (v0.9) | `@eaeao/summernote-react` |
|---|---|
| `$('.x').summernote(options)` (init) | render `<SummernoteEditor …props />` |
| `$('.x').summernote('insertText', 'hi')` (method call) | `ref.current?.command('insertText', 'hi')` |
| `$('.x').summernote('code')` / `'code', html` | `ref.current?.getCode()` / `setCode(html)`, or controlled `value` / `onChange` |
| `$('.x').summernote('destroy')` | unmount the component (React lifecycle) |
| `options` object | component **props** (`toolbar`, `theme`, `lang`, `placeholder`, …) |
| `callbacks: { onChange }` + `summernote.change` jQuery event | the `onChange` prop (single channel) |
| `$.extend(true, $.summernote.lang, …)` (global) | `lang={locales['ko-KR']}` prop, deep-merged via `resolveLang` |
| `$.extend($.summernote.plugins, { name })` (global) | `definePlugin({ name, commands, buttons })` → `plugins={[…]}` (per-instance) |
| `$.summernote.ui.button/dialog` (jQuery DOM) | render JSX; reuse `Modal`, `useChrome`, `options.icons` |
| `$.summernote.interface` → `'BS3' \| 'Lite'` (global, last wins) | `theme="lite\|bs3\|bs4\|bs5"` prop (per-instance, coexist) |
| UMD `<script>` after summernote, **load order matters** | ES module `import`; no script ordering, no globals |

---

## The component, not `$('.x').summernote(...)`

Initialization is rendering; teardown is unmounting. Method calls go through a typed `ref` (see [Component & state](./reference-component.md#imperative-ref--summernoteeditorhandle)).

```tsx
const ref = useRef<SummernoteEditorHandle>(null);
<SummernoteEditor ref={ref} defaultValue="<p>Hi</p>" />;
// ref.current?.getCode()  ← 'code' getter
// ref.current?.setCode(html)  ← 'code' setter
// ref.current?.command('bold')  ← method call
```

[Click-to-edit](./examples.md#click-to-edit) shows the init/destroy equivalent: mounting constructs the engine, unmounting runs `core.destroy()`.

## Commands instead of string-dispatch

There is no `'module.method'` string-dispatch. Every editing action is a flat command name passed to `command()` (or `useCommand()` from a button). See the [command catalog](./reference-commands.md).

```tsx
// legacy: $('#x').summernote('insertImage', src);
ref.current?.command('insertImage', src);
```

## Options are props

The legacy `options` object becomes props. There is no shallow-merge gotcha and no global defaults to clobber — pass exactly what you want.

```tsx
<SummernoteEditor
  toolbar={[['font', ['bold', 'italic']], ['para', ['ul', 'ol']]]}
  theme="bs5"
  placeholder="Write…"
  options={{ historyLimit: 500 }}
/>
```

See [Options & toolbar](./reference-options.md) for the full set.

## i18n: `lang` prop, not `$.summernote.lang`

There is no `$.summernote.lang` global and no requirement to load a language pack before init. Pass a locale object as a prop; missing keys fall back to English. Locale modules are tree-shakeable.

```tsx
import { SummernoteEditor, locales } from '@eaeao/summernote-react';
<SummernoteEditor lang={locales['ko-KR']} />;
```

## Themes: per-instance, not a global

Legacy summernote resolved the UI from a last-import-wins global, so mixed themes per page were unsupported. Here the `theme` prop is per-instance — multiple editors with different themes coexist. See [Themes](./reference-options.md#themes).

---

## Plugins: `definePlugin`, not `$.summernote.plugins`

| Topic | jQuery summernote | This port |
|---|---|---|
| **Registration** | Global `$.extend($.summernote.plugins, { name: fn })`; name collisions override core modules globally. | Per-instance `plugins={[…]}` prop. Commands shadow built-ins only within that editor via `core.registerCommand`. |
| **Loading** | UMD `<script>` after the summernote script; lang/resource files must load after the plugin. Order matters. | ES module `import`. No script ordering, no `<script>` tags, no globals. |
| **Button factory** | `context.memo('button.name', () => ui.button({ contents, tooltip, click }).render())` (jQuery DOM). | A React `FC` in `buttons`, keyed by name; render JSX, use `useChrome()`/`useCommand()`. |
| **Dispatching edits** | `context.invoke('editor.bold')` / `context.invoke('code')`. | `useCommand()('bold')` or `core.command('bold')`; content via `core.getHTML()/setHTML()`, or the controlled `value`/`onChange` props. |
| **Dialogs** | `ui.dialog({ title, body, footer })` + `$.Deferred` + `onDialogShown/Hidden` + `note-`/Bootstrap dual-classed HTML strings. | Render the exported `Modal` (or your own JSX) with React state + `Promise`. Save/restore selection with `core.saveRange()/restoreRange()`. |
| **Lifecycle** | `this.initialize()` at plugin **load** (not use), `this.destroy()` for cleanup. | React lifecycle — a button is mounted/unmounted by React; commands are registered when the editor mounts. No `initialize`/`destroy` hooks to author. |
| **i18n** | `$.extend(true, $.summernote.lang, …)` global deep-merge; read via `options.langInfo`. | `lang` prop deep-merged over en-US by `resolveLang`; read via `useChrome().lang`. |
| **Theme detection** | `$.summernote.interface` → `'BS3' \| 'BS4' \| 'Lite'`. | Per-instance `theme="lite\|bs3\|bs4\|bs5"` + matching CSS import; multiple themed editors coexist. |
| **Editing engine** | jQuery-based. | Structural Range commands — no jQuery, zero runtime deps. |
| **Container/`dialogsInBody`** | `options.dialogsInBody` chooses dialog parent; unique IDs via `this.options.id`. | React portals/state; no manual container or ID juggling. |

See [Headless & plugin API](./reference-api.md#plugins--defineplugin) for the full `definePlugin` contract.

### Source defects from the jQuery docs that do *not* apply here

The jQuery plugins page contains several copy-paste hazards (a stray `}` closing `initialize` before the dialog assignment, an undefined `$editBtn`, typos like `form-contro` and `note-tabe-content`, all tabs marked `active`). None of these exist in this port — you write React components, not HTML strings, so the markup is checked by the compiler.

---

## See also

- [How it works](./concepts.md) — the architecture this maps onto.
- [Getting started](./getting-started.md) — install and a first editor, the React way.
- [Headless & plugin API](./reference-api.md) — `definePlugin`, `useChrome`, `useCommand`.
