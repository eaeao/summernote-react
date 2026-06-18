# How it works

The ideas behind `@eaeao/summernote-react`: what the engine owns vs. what React renders, why the caret survives re-renders, and the two security layers. This is the "why" — for the "what", see the [API reference](./reference-component.md).

---

## Architecture

`@eaeao/summernote-react` is a from-scratch React + TypeScript port of summernote. The legacy jQuery editor and its runtime are gone. In their place:

- **A headless engine** (`EditorCore`, exported as the `@engine` module set) that owns the `contentEditable` subtree imperatively. It performs all editing through structural Range commands and computes toolbar state by walking the caret's ancestor chain.
- **React bindings** that render *only the chrome* (toolbar, dropdowns, dialogs, statusbar, popovers) plus a single uncontrolled `contentEditable` leaf. React never reconciles content into the editable, so chrome re-renders cannot disturb the caret.

Key properties:

| Property | Value |
|---|---|
| Package | `@eaeao/summernote-react` |
| React | 18+ (peer dependency, with `react-dom`) |
| Runtime dependencies | **zero** |
| jQuery | **none** |
| Module format | ESM + CJS + `.d.ts` (single dual build) |
| License | MIT |
| Verified on | Chromium + WebKit |

> There is no `$('.x').summernote(...)`. The editor is a React component, options are props, and the imperative API is a typed `ref`. See [Migrating from jQuery](./migrating.md).

### What React renders vs. what the engine owns

React renders the chrome plus one leaf: an uncontrolled `<div class="note-editable notranslate" contentEditable>` that the engine owns. That div carries `translate="no"`, `data-gramm="false"`, `data-gramm_editor="false"`, and `data-enable-grammarly="false"` to opt out of Google Translate / Grammarly hijacking the selection (see [Extension-safe selection](#extension-safe-selection)). When codeview is open the editable is `display:none` and a `<Codeview>` textarea renders in its place.

The root element class is composed from: `note-editor`, `note-frame`, `note-theme-${theme ?? 'lite'}`, `note-airframe` (air mode), `fullscreen` (when fullscreen is toggled), plus your `className`.

---

## Controlled vs. uncontrolled & the caret-safe contract

**Initial value.** `value ?? defaultValue` seeds the engine once. `value` (controlled) wins over `defaultValue` (uncontrolled, applied once).

**Uncontrolled.** Pass `defaultValue` (and/or use the ref). The engine owns the content after mount; `onChange` reports edits.

```tsx
<SummernoteEditor defaultValue="<p>Edit me…</p>" onChange={save} />
```

**Controlled.** Pass `value` + `onChange`. An external `value` is pushed into the engine **only when it genuinely differs and is not an echo of our own `onChange`**:

- Skipped when `value === undefined` or the core is not mounted.
- While **codeview is open**, the textarea owns content: an external `value` is routed to the codeview HTML (only if it differs), not to the engine.
- Otherwise, returns early if `value` equals the last emitted change **or** equals `core.getHTML()` (already applied) — these guards prevent caret-destroying re-seeds.
- Only a truly new external value calls `core.setHTML(value)`.

```tsx
const [html, setHtml] = React.useState('<p>Hello</p>');
<SummernoteEditor value={html} onChange={setHtml} />;
```

**Why the caret survives.** React renders only the chrome plus the single uncontrolled `contentEditable` leaf — it never renders children into the editable. So chrome re-renders (toolbar / state changes) can't disturb the caret. The engine, not React's reconciler, is the source of truth for the editable subtree, and controlled `value` is only ever force-applied when it differs from both the last emitted value and the current DOM HTML.

---

## Security

Two layers of protection, both engine-side:

- **Link URL filtering.** `createLink` rejects empty and unsafe URLs (`javascript:`, `vbscript:`, `data:` schemes) before creating or updating an `<a>`. `newWindow: true` adds `rel="noopener noreferrer"` alongside `target="_blank"`.
- **Codeview sanitization.** When you leave codeview, the textarea HTML (which an attacker can influence) is passed through `purifyCodeview(...)` before `core.setHTML(...)` — matching the legacy `codeviewFilter: true` default. `purifyCodeview` is exported from the package root if you want to sanitize HTML yourself.

> As with any rich-text editor, **front-end filtering is not sufficient on its own** — always re-validate and sanitize submitted HTML on the server before storing or rendering it.

---

## Extension-safe selection

Browser extensions (dictionaries, translators, Grammarly) and page-translation features can collapse or hijack the editable's selection. The port hardens against this:

- The editable opts out of Grammarly (`data-gramm="false"`, `data-gramm_editor="false"`, `data-enable-grammarly="false"`) and page translation (`translate="no"`, the `notranslate` class).
- The selection survives extensions that collapse it on toolbar mousedown. In your own toolbar/plugin buttons, always `onMouseDown={(e) => e.preventDefault()}` so the editable keeps focus, and prefer `useCommand()` (which dispatches while preserving the selection) over calling `core.command` from a raw click handler.

---

## See also

- [Component & state](./reference-component.md) — the props and the imperative ref.
- [Headless & plugin API](./reference-api.md) — `useSummernote`, `createEditorCore`, and `definePlugin`.
- [Migrating from jQuery](./migrating.md) — how the architecture maps to the legacy jQuery build.
