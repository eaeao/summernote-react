# Commands

`core.command(name, ...args): boolean` (and the handle's [`command(...)`](./reference-component.md#imperative-ref--summernoteeditorhandle)) dispatches into the engine's command registry. Custom commands registered by plugins via `registerCommand` take precedence over built-ins of the same name. It returns `true` if the command reported a change.

Every command **except** the selectionless ones (`undo`, `redo`, `resizeImage`, `floatImage`, `removeMedia`) requires a live or recoverable in-editor selection, or it returns `false` without acting.

---

## Inline format

| Command | Args | Effect |
|---|---|---|
| `bold` | — | Toggle bold (canonical `<b>`). |
| `italic` | — | Toggle italic (canonical `<i>`). |
| `underline` | — | Toggle `<u>`. |
| `strikethrough` | — | Toggle strikethrough (canonical `<s>`). |
| `superscript` | — | Toggle `<sup>`. |
| `subscript` | — | Toggle `<sub>`. |
| `removeFormat` | — | Unwrap all inline format tags at the caret (`B,STRONG,I,EM,U,S,STRIKE,SUP,SUB,SPAN`). |
| `fontName` | `(name: string)` | Apply `font-family` (validated for availability). |
| `fontSize` | `(size: number \| string)` | Apply `font-size` = `size + currentUnit` (unit from state, default `px`). |
| `fontSizeUnit` | `(unit: string)` | Re-apply current size with new unit (`px`/`pt`/…). |
| `foreColor` | `(color: string)` | Apply `color`. |
| `backColor` | `(color: string)` | Apply `background-color`. |
| `color` | `({ foreColor?, backColor? })` | Apply fore and/or back color in one call. |
| `insertText` | `(text: string)` | Replace selection with a text node; collapse caret after it. |

## Block format / alignment

| Command | Args | Effect |
|---|---|---|
| `justifyLeft` | — | Paragraph `text-align: left`. |
| `justifyCenter` | — | `text-align: center`. |
| `justifyRight` | — | `text-align: right`. |
| `justifyFull` | — | `text-align: justify`. |
| `formatPara` | — | Convert block(s) to `<p>`. |
| `formatH1` … `formatH6` | — | Convert block(s) to `<h1>` … `<h6>`. |
| `formatBlock` | `(tag: string)` | Generic block conversion (default `'p'`) — drives the style dropdown (p/blockquote/pre/h1..h6). |
| `lineHeight` | `(ratio: number \| string)` | Apply `line-height` to selected paragraphs. |
| `indent` | — | Indent. |
| `outdent` | — | Outdent. |
| `tab` | — | In a collapsed table cell → move to next cell; otherwise insert a 4-NBSP run. |
| `untab` | — | In a collapsed table cell → move to previous cell; otherwise no-op. |

## List

| Command | Args | Effect |
|---|---|---|
| `insertOrderedList` | — | Toggle/insert `<ol>`. |
| `insertUnorderedList` | — | Toggle/insert `<ul>`. |

## Table

| Command | Args | Effect |
|---|---|---|
| `insertTable` | `(dimStr: string)` | Insert a table from `"COLxROW"` (e.g. `'3x2'`, default `'1x1'`) with class `table table-bordered`. |
| `addRow` | `(where?: 'top' \| 'bottom')` | Add a row (default `'bottom'`). |
| `addCol` | `(where?: 'left' \| 'right')` | Add a column (default `'right'`). |
| `deleteRow` | — | Delete current row. |
| `deleteCol` | — | Delete current column. |
| `deleteTable` | — | Delete the enclosing table. |

## Media / link

| Command | Args | Effect |
|---|---|---|
| `createLink` | `({ url, text?, newWindow? })` | Create or update an `<a>`; rejects empty / unsafe (`javascript:`/`vbscript:`/`data:`) URLs. `newWindow: true` sets `target="_blank"` + `rel="noopener noreferrer"`. Edits an existing anchor in place. |
| `unlink` | — | Unwrap the enclosing anchor. |
| `insertImage` | `(src: string, filename?: string)` | Insert `<img src>` (+ optional `data-filename`); caret after it. |
| `insertVideo` | `(url: string)` | Parse a provider URL to an embed node and insert. |
| `insertHorizontalRule` | — | Insert `<hr>`. |
| `insertNode` | `(node: Node)` | Insert an arbitrary DOM node (custom embeds); caret after it. |
| `resizeImage` | `(img: HTMLImageElement, value)` | Set `img` width to `parseFloat(value)*100%`; `''`/`'none'` removes width. (Selectionless.) |
| `floatImage` | `(img: HTMLImageElement, value)` | Set `img` CSS `float` (default `'none'`). (Selectionless.) |
| `removeMedia` | `(img: HTMLImageElement)` | Remove the given image node. (Selectionless.) |

## History

| Command | Args | Effect |
|---|---|---|
| `undo` | — | Undo. (Selectionless.) |
| `redo` | — | Redo. (Selectionless.) |

> **Not commands** (handled elsewhere): `escape`, `insertParagraph`, and `linkDialog.show` are keyMap methods routed to `onShortcut` / native handling, not the command registry. Codeview, fullscreen, and the help/link/image/video dialogs are chrome actions (`ChromeUI`: `openLinkDialog`, `openImageDialog`, `openVideoDialog`, `openHelpDialog`, `toggleFullscreen`, `toggleCodeview`), not engine commands.

---

## See also

- [Component & state](./reference-component.md) — props, the `command()` handle, and `EditorState`.
- [Options & toolbar](./reference-options.md) — which toolbar item names map to which commands, plus the `keyMap` shortcuts.
- [Headless & plugin API](./reference-api.md) — registering your own commands with `definePlugin` / `registerCommand`.
