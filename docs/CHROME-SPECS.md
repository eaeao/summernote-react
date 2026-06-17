# Legacy summernote chrome — faithful implementation specs

> Auto-extracted by the understand-chrome workflow (10 parallel readers over src/js). Reference for the React+TS port (Phase 3/4). Source of truth is the legacy code; this is a navigation aid.

<!-- ===== buttons ===== -->
## Buttons module (src/js/module/Buttons.js)

The `Buttons` module is the toolbar/popover button factory. It registers every UI button and dropdown as a **memo** under the namespace `button.<name>`. The `Toolbar` and popover modules later resolve these memos via `context.memo('button.<name>')` and append them. This spec is the exhaustive contract.

---

### 1. Constructor and shared infrastructure

On construction it captures:
- `this.ui = $.summernote.ui` — the theme UI factory (button/buttonGroup/dropdown/dropdownCheck/icon/palette/dropdownButtonContents/toggleBtnActive).
- `this.context`, `this.$toolbar = context.layoutInfo.toolbar`, `this.options = context.options`, `this.lang = options.langInfo`.
- `this.invertedKeyMap = func.invertObject(options.keyMap[env.isMac ? 'mac' : 'pc'])` — maps editor method name → shortcut string for tooltip rendering.

**`initialize()`** calls, in order: `addToolbarButtons()`, `addImagePopoverButtons()`, `addLinkPopoverButtons()`, `addTablePopoverButtons()`, then sets `this.fontInstalledMap = {}`.

**`destroy()`** deletes `fontInstalledMap`.

#### `representShortcut(editorMethod)` → tooltip suffix string
- If `options.shortcuts` is falsy OR there is no shortcut for the method, returns `''`.
- Else looks up `invertedKeyMap[editorMethod]`.
- On Mac: replaces `CMD`→`⌘`, `SHIFT`→`⇧`.
- Always replaces token names: `BACKSLASH`→`\`, `SLASH`→`/`, `LEFTBRACKET`→`[`, `RIGHTBRACKET`→`]`.
- Returns `' (' + shortcut + ')'` (leading space). This string is **appended to the tooltip label**.

#### `button(o)` wrapper
- If `options.tooltip` is falsy and `o.tooltip` is set, deletes `o.tooltip` (suppresses tooltips globally).
- Sets `o.container = options.container`.
- Returns `this.ui.button(o)` (an unrendered component; callers `.render()`).

#### Font-installed helpers
- `isFontInstalled(name)`: memoized in `fontInstalledMap`. True if `env.isFontInstalled(name)` OR `lists.contains(options.fontNamesIgnoreCheck, name)`.
- `isFontDeservedToAdd(name)`: lowercases; true if non-empty AND installed AND not in `env.genericFontFamilies`.

---

### 2. Options consumed (with defaults from settings.js)

| Option | Default | Usage |
|---|---|---|
| `options.tooltip` | `'auto'` (truthy) | suppress tooltips when falsy |
| `options.container` | `editor` element / body | passed to every button + palette |
| `options.shortcuts` | `true` | gate shortcut suffixes |
| `options.keyMap.pc` / `.mac` | see settings | shortcut lookup |
| `options.icons` | icon map | every icon class (see icon table) |
| `options.id` | per-editor uniqueId | color picker input/holder element ids |
| `options.colorButton` | `{ foreColor: '#000000', backColor: '#FFFF00' }` | recent-color initial swatch + `<input type=color>` defaults |
| `options.colors` | 8×8 palette array | color holder palettes |
| `options.colorsName` | names matrix | palette tooltips |
| `options.styleTags` | `['p','blockquote','pre','h1'..'h6']` | style dropdown items |
| `options.fontNames` | font list | fontname dropdown items |
| `options.fontNamesIgnoreCheck` | `[]` | force-include fonts |
| `options.addDefaultFonts` | `true` | merge current font-family into fontNames |
| `options.fontSizes` | `['8'..'36'...]` | fontsize dropdown |
| `options.fontSizeUnits` | `['px','pt']` | fontsizeunit dropdown |
| `options.lineHeights` | `['1.0'..'3.0']` | line-height dropdown |
| `options.insertTableMaxSize` | `{ col: 10, row: 10 }` | table picker grid bounds (em) |

---

### 3. Active-state plumbing

Two helpers used by `Context`/`Toolbar` after selection changes (the toolbar calls `updateCurrentStyle` on `summernote.keyup/mouseup/change`):

- **`updateBtnStates($container, infos)`**: for each `{selector: predicate}` pair, calls `this.ui.toggleBtnActive($container.find(selector), pred())`. `toggleBtnActive` toggles the `.active` class.
- **`updateCurrentStyle($container)`** (defaults `$container` to `this.$toolbar`):
  1. `styleInfo = context.invoke('editor.currentStyle')`.
  2. `updateBtnStates` with these selector→predicate mappings (this is the authoritative map of which style key drives each button's `.active`):
     - `.note-btn-bold` ← `styleInfo['font-bold'] === 'bold'`
     - `.note-btn-italic` ← `styleInfo['font-italic'] === 'italic'`
     - `.note-btn-underline` ← `styleInfo['font-underline'] === 'underline'`
     - `.note-btn-subscript` ← `styleInfo['font-subscript'] === 'subscript'`
     - `.note-btn-superscript` ← `styleInfo['font-superscript'] === 'superscript'`
     - `.note-btn-strikethrough` ← `styleInfo['font-strikethrough'] === 'strikethrough'`
  3. **font-family**: if present, split on `,`, strip quotes/whitespace from each; `fontName = lists.find(names, isFontInstalled)` (first installed). For each `.dropdown-fontname a`, `toggleClass('checked', $item.data('value')+'' === fontName+'')`. Set `.note-current-fontname` text + inline `font-family` to `fontName`.
  4. **font-size**: if present, for each `.dropdown-fontsize a` toggle `checked` when `data('value')+'' === fontSize+''`; set `.note-current-fontsize` text. Then **font-size-unit**: for each `.dropdown-fontsizeunit a` toggle `checked` against `styleInfo['font-size-unit']`; set `.note-current-fontsizeunit` text.
  5. **line-height**: if present, for each `.dropdown-line-height a` toggle `checked` against `styleInfo['line-height']`; set `.note-current-line-height` text.

> Note: `.checked` (dropdown check marks) is distinct from `.active` (button highlight). Only the 6 inline-format buttons get `.active`; dropdowns reflect state via `.checked` on `<a>` items + the `.note-current-*` label text.

---

### 4. Toolbar buttons (`addToolbarButtons`)

Each entry: **memo name** — wrapping element, contents, tooltip (+shortcut), invoke target & args.

#### `button.style` — style/format-block dropdown
- `ui.buttonGroup([toggleButton, dropdown])`.
- Toggle button: `className: 'dropdown-toggle'`, contents `ui.dropdownButtonContents(ui.icon(icons.magic), options)`, tooltip `lang.style.style`, `data: { toggle: 'dropdown' }`.
- Dropdown: `className: 'dropdown-style'`, `items: options.styleTags`, `title: lang.style.style`.
  - `template(item)`: if item is a string, convert to `{ tag: item, title: lang.style[item] ?? item }`. Renders `<{tag} [style=...] [class=...]>{title}</{tag}>` (supports object items with `.tag/.title/.style/.className`).
  - `click: context.createInvokeHandler('editor.formatBlock')` — handler passes the clicked item's `data-value` (the tag) to `editor.formatBlock`.

#### `button.style.<tag>` — individual style buttons (one per `styleTags` entry)
- Loop over `options.styleTags`. For each `item`, memo `button.style.<item>`.
- `className: 'note-btn-style-<item>'`, contents `<div data-value="<item>">{ITEM_UPPERCASE}</div>`, tooltip `lang.style[item]`.
- `click: createInvokeHandler('editor.formatBlock')`.

#### `button.bold`
- `className: 'note-btn-bold'`, icon `icons.bold`, tooltip `lang.font.bold` + shortcut(`bold`).
- `click: createInvokeHandlerAndUpdateState('editor.bold')` (invokes then refreshes active states).

#### `button.italic`
- `className: 'note-btn-italic'`, icon `icons.italic`, tooltip `lang.font.italic` + shortcut(`italic`).
- `click: createInvokeHandlerAndUpdateState('editor.italic')`.

#### `button.underline`
- `className: 'note-btn-underline'`, icon `icons.underline`, tooltip `lang.font.underline` + shortcut(`underline`).
- `click: createInvokeHandlerAndUpdateState('editor.underline')`.

#### `button.clear`
- No className, icon `icons.eraser`, tooltip `lang.font.clear` + shortcut(`removeFormat`).
- `click: createInvokeHandler('editor.removeFormat')`.

#### `button.strikethrough`
- `className: 'note-btn-strikethrough'`, icon `icons.strikethrough`, tooltip `lang.font.strikethrough` + shortcut(`strikethrough`).
- `click: createInvokeHandlerAndUpdateState('editor.strikethrough')`.

#### `button.superscript`
- `className: 'note-btn-superscript'`, icon `icons.superscript`, tooltip `lang.font.superscript` (no shortcut).
- `click: createInvokeHandlerAndUpdateState('editor.superscript')`.

#### `button.subscript`
- `className: 'note-btn-subscript'`, icon `icons.subscript`, tooltip `lang.font.subscript` (no shortcut).
- `click: createInvokeHandlerAndUpdateState('editor.subscript')`.

#### `button.fontname` — font-family dropdown
- Computes `styleInfo = editor.currentStyle`. If `options.addDefaultFonts`, splits `styleInfo['font-family']` by comma, trims + strips quotes each; for each `isFontDeservedToAdd` font not already in `options.fontNames`, **pushes it into `options.fontNames`** (mutates options).
- `ui.buttonGroup([toggle, dropdownCheck])`.
- Toggle: `className: 'dropdown-toggle'`, contents `ui.dropdownButtonContents('<span class="note-current-fontname"></span>', options)`, tooltip `lang.font.name`, `data:{toggle:'dropdown'}`.
- `ui.dropdownCheck`: `className: 'dropdown-fontname'`, `checkClassName: icons.menuCheck`, `items: options.fontNames.filter(isFontInstalled)`, `title: lang.font.name`, `template(item)` → `<span style="font-family: {env.validFontName(item)}">{item}</span>`, `click: createInvokeHandlerAndUpdateState('editor.fontName')`.

#### `button.fontsize` — font-size dropdown
- Toggle: `className: 'dropdown-toggle'`, contents `dropdownButtonContents('<span class="note-current-fontsize"></span>', options)`, tooltip `lang.font.size`.
- `dropdownCheck`: `className: 'dropdown-fontsize'`, `checkClassName: icons.menuCheck`, `items: options.fontSizes`, `title: lang.font.size`, `click: createInvokeHandlerAndUpdateState('editor.fontSize')`.

#### `button.fontsizeunit` — font-size-unit dropdown
- Toggle: contents `'<span class="note-current-fontsizeunit"></span>'`, tooltip `lang.font.sizeunit`.
- `dropdownCheck`: `className: 'dropdown-fontsizeunit'`, `checkClassName: icons.menuCheck`, `items: options.fontSizeUnits`, `title: lang.font.sizeunit`, `click: createInvokeHandlerAndUpdateState('editor.fontSizeUnit')`.

#### Color buttons (`colorPalette` factory)
Three memos call `colorPalette(className, tooltip, backColor, foreColor)`:
- `button.color` → `colorPalette('note-color-all', lang.color.recent, true, true)`
- `button.forecolor` → `colorPalette('note-color-fore', lang.color.foreground, false, true)`
- `button.backcolor` → `colorPalette('note-color-back', lang.color.background, true, false)`

`colorPalette` returns `ui.buttonGroup({ className: 'note-color ' + className, children: [...] })`:

1. **Current-color button** (`className: 'note-current-color-button'`):
   - contents: `ui.icon(icons.font + ' note-recent-color')`.
   - tooltip: passed `tooltip`.
   - `click`: reads `data-backColor` / `data-foreColor` attrs off the button and invokes `editor.color` with `{backColor, foreColor}` / `{backColor}` / `{foreColor}` depending on which of `backColor`/`foreColor` flags are set.
   - `callback($button)`: finds `.note-recent-color`; if `backColor`, sets its `background-color` to `options.colorButton.backColor` and stores `data-backColor`; if `foreColor`, sets its `color` to `options.colorButton.foreColor` and stores `data-foreColor`, else sets `color: transparent`.

2. **Dropdown-toggle button** (`className: 'dropdown-toggle'`):
   - contents `ui.dropdownButtonContents('', options)`, tooltip `lang.color.more`, `data:{toggle:'dropdown'}`.

3. **Dropdown** with palette HTML. The `items` HTML is built conditionally — **background section** (if `backColor`) then **foreground section** (if `foreColor`):

   **Background palette** (`<div class="note-palette">`):
   - title `<div class="note-palette-title">{lang.color.background}</div>`
   - reset button `class="note-color-reset btn btn-light btn-default" data-event="backColor" data-value="transparent"` → text `lang.color.transparent`
   - `<div class="note-holder" data-event="backColor">` (filled with palette in callback)
   - select button `class="note-color-select btn btn-light btn-default" data-event="openPalette" data-value="backColorPicker-{id}"` → text `lang.color.cpSelect`
   - `<input type="color" id="backColorPicker-{id}" class="note-btn note-color-select-btn" value="{colorButton.backColor}" data-event="backColorPalette-{id}">`
   - `<div class="note-holder-custom" id="backColorPalette-{id}" data-event="backColor">`

   **Foreground palette** (`<div class="note-palette">`):
   - title `<div class="note-palette-title">{lang.color.foreground}</div>`
   - reset button `class="note-color-reset ..." data-event="removeFormat" data-value="foreColor"` → text `lang.color.resetToDefault`
   - `<div class="note-holder" data-event="foreColor">`
   - select button `data-event="openPalette" data-value="foreColorPicker-{id}"` → `lang.color.cpSelect`
   - `<input type="color" id="foreColorPicker-{id}" class="note-btn note-color-select-btn" value="{colorButton.foreColor}" data-event="foreColorPalette-{id}">`
   - `<div class="note-holder-custom" id="foreColorPalette-{id}" data-event="foreColor">`

   **Dropdown `callback($dropdown)`**:
   - For each `.note-holder`: append `ui.palette({ colors: options.colors, colorsName: options.colorsName, eventName: $holder.data('event'), container: options.container, tooltip: options.tooltip }).render()`.
   - For each `.note-holder-custom`: append `ui.palette` with `customColors = [['#FFFFFF' ×8]]` (single white row, for picker-added colors), same `eventName` from `data-event`.
   - For each `input[type=color]`: bind native `change` → finds `#<input.data('event')>` holder's first `.note-color-btn`, sets its `background-color`/`aria-label`/`data-value`/`data-original-title` to the uppercased hex, then triggers `click` on that chip (so picking a color applies it).

   **Dropdown `click(event)`** (`event.stopPropagation()`):
   - Resolves `$parent = $('.'+className).find('.note-dropdown-menu')`, `$button = event.target`, `eventName = $button.data('event')`, `value = $button.attr('data-value')`.
   - If `eventName === 'openPalette'`: find picker `#value`, find its target palette's first `.note-color-row`, detach the last `.note-color-btn` chip, set chip attrs to picker color, prepend it, trigger `click` on the picker (opens native color dialog). (This is the "shift chips" behavior for custom colors.)
   - Else: if `eventName ∈ {backColor, foreColor}`, update `.note-recent-color` CSS (`background-color` for backColor / `color` for foreColor) and store `data-<eventName>` on `.note-current-color-button`, then `context.invoke('editor.' + eventName, value)`. For the reset buttons `eventName` is `backColor`(value `transparent`) or `removeFormat`(value `foreColor`) — both routed through `editor.<eventName>`.

   **Commands invoked**: `editor.color({backColor?, foreColor?})`, `editor.backColor(value)`, `editor.foreColor(value)`, `editor.removeFormat('foreColor')`.

#### `button.ul`
- icon `icons.unorderedlist`, tooltip `lang.lists.unordered` + shortcut(`insertUnorderedList`).
- `click: createInvokeHandler('editor.insertUnorderedList')`.

#### `button.ol`
- icon `icons.orderedlist`, tooltip `lang.lists.ordered` + shortcut(`insertOrderedList`).
- `click: createInvokeHandler('editor.insertOrderedList')`.

#### Paragraph alignment / indent buttons (shared instances)
These six are built once as local button components and reused inside the `paragraph` dropdown, then each also registered as its own memo via `func.invoke(component, 'render')`:
- `button.justifyLeft` — icon `icons.alignLeft`, tooltip `lang.paragraph.left` + shortcut(`justifyLeft`), `editor.justifyLeft`.
- `button.justifyCenter` — icon `icons.alignCenter`, tooltip `lang.paragraph.center` + shortcut(`justifyCenter`), `editor.justifyCenter`.
- `button.justifyRight` — icon `icons.alignRight`, tooltip `lang.paragraph.right` + shortcut(`justifyRight`), `editor.justifyRight`.
- `button.justifyFull` — icon `icons.alignJustify`, tooltip `lang.paragraph.justify` + shortcut(`justifyFull`), `editor.justifyFull`.
- `button.outdent` — icon `icons.outdent`, tooltip `lang.paragraph.outdent` + shortcut(`outdent`), `editor.outdent`.
- `button.indent` — icon `icons.indent`, tooltip `lang.paragraph.indent` + shortcut(`indent`), `editor.indent`.
All use `createInvokeHandler`.

#### `button.paragraph` — paragraph dropdown
- `ui.buttonGroup([toggle, dropdown])`.
- Toggle: `className: 'dropdown-toggle'`, contents `dropdownButtonContents(ui.icon(icons.alignLeft), options)`, tooltip `lang.paragraph.paragraph`.
- Dropdown contains two button groups:
  - `ui.buttonGroup({ className: 'note-align', children: [justifyLeft, justifyCenter, justifyRight, justifyFull] })`
  - `ui.buttonGroup({ className: 'note-list', children: [outdent, indent] })`

#### `button.height` — line-height dropdown
- Toggle: `className: 'dropdown-toggle'`, contents `dropdownButtonContents(ui.icon(icons.textHeight), options)`, tooltip `lang.font.height`.
- `dropdownCheck`: `items: options.lineHeights`, `checkClassName: icons.menuCheck`, `className: 'dropdown-line-height'`, `title: lang.font.height`, `click: createInvokeHandler('editor.lineHeight')`.

#### `button.table` — table dimension picker
- `ui.buttonGroup([toggle, dropdown], { callback })`.
- Toggle: `className: 'dropdown-toggle'`, contents `dropdownButtonContents(ui.icon(icons.table), options)`, tooltip `lang.table.table`.
- Dropdown: `title: lang.table.table`, `className: 'note-table'`, items HTML:
  - `<div class="note-dimension-picker">` containing
    - `<div class="note-dimension-picker-mousecatcher" data-event="insertTable" data-value="1x1"></div>`
    - `<div class="note-dimension-picker-highlighted"></div>`
    - `<div class="note-dimension-picker-unhighlighted"></div>`
  - `<div class="note-dimension-display">1 x 1</div>`
- `callback($node)`: sets `.note-dimension-picker-mousecatcher` width/height to `insertTableMaxSize.col/row` em; binds `mouseup` → `createInvokeHandler('editor.insertTable')` (passes `data-value` like `"3x2"`); binds `mousemove` → `tableMoveHandler`.

**`tableMoveHandler(event)`** (mousemove on picker):
- `PX_PER_EM = 18`. Computes `posOffset` from `event.offsetX/Y` (Firefox fallback: `event.pageX/Y - target.offset()`).
- `dim.c = ceil(x/18) || 1`, `dim.r = ceil(y/18) || 1`.
- Sets `.note-dimension-picker-highlighted` width/height to `dim.c/r` em; stores `data-value = "{c}x{r}"` on the catcher.
- If `dim.c` in (3, `insertTableMaxSize.col`): grow `.note-dimension-picker-unhighlighted` width to `c+1` em. Same for `dim.r`/rows → height `r+1` em.
- Sets `.note-dimension-display` text to `"{c} x {r}"`.

#### `button.link`
- icon `icons.link`, tooltip `lang.link.link` + shortcut(`linkDialog.show`).
- `click: createInvokeHandler('linkDialog.show')`.

#### `button.picture`
- icon `icons.picture`, tooltip `lang.image.image` (no shortcut).
- `click: createInvokeHandler('imageDialog.show')`.

#### `button.video`
- icon `icons.video`, tooltip `lang.video.video` (no shortcut).
- `click: createInvokeHandler('videoDialog.show')`.

#### `button.hr`
- icon `icons.minus`, tooltip `lang.hr.insert` + shortcut(`insertHorizontalRule`).
- `click: createInvokeHandler('editor.insertHorizontalRule')`.

#### `button.fullscreen`
- `className: 'btn-fullscreen note-codeview-keep'`, icon `icons.arrowsAlt`, tooltip `lang.options.fullscreen` (no shortcut).
- `click: createInvokeHandler('fullscreen.toggle')`.

#### `button.codeview`
- `className: 'btn-codeview note-codeview-keep'`, icon `icons.code`, tooltip `lang.options.codeview` (no shortcut).
- `click: createInvokeHandler('codeview.toggle')`.

> The `note-codeview-keep` class marks buttons that stay enabled while codeview is active (others are disabled).

#### `button.redo`
- icon `icons.redo`, tooltip `lang.history.redo` + shortcut(`redo`).
- `click: createInvokeHandler('editor.redo')`.

#### `button.undo`
- icon `icons.undo`, tooltip `lang.history.undo` + shortcut(`undo`).
- `click: createInvokeHandler('editor.undo')`.

#### `button.help`
- icon `icons.question`, tooltip `lang.options.help` (no shortcut).
- `click: createInvokeHandler('helpDialog.show')`.

---

### 5. Image popover buttons (`addImagePopoverButtons`)

| Memo | className | contents | tooltip | invoke (args) |
|---|---|---|---|---|
| `button.resizeFull` | — | `<span class="note-fontsize-10">100%</span>` | `lang.image.resizeFull` | `editor.resize('1')` |
| `button.resizeHalf` | — | `<span class="note-fontsize-10">50%</span>` | `lang.image.resizeHalf` | `editor.resize('0.5')` |
| `button.resizeQuarter` | — | `<span class="note-fontsize-10">25%</span>` | `lang.image.resizeQuarter` | `editor.resize('0.25')` |
| `button.resizeNone` | — | icon `icons.rollback` | `lang.image.resizeNone` | `editor.resize('0')` |
| `button.floatLeft` | — | icon `icons.floatLeft` | `lang.image.floatLeft` | `editor.floatMe('left')` |
| `button.floatRight` | — | icon `icons.floatRight` | `lang.image.floatRight` | `editor.floatMe('right')` |
| `button.floatNone` | — | icon `icons.rollback` | `lang.image.floatNone` | `editor.floatMe('none')` |
| `button.removeMedia` | — | icon `icons.trash` | `lang.image.remove` | `editor.removeMedia` (no arg) |

All use `createInvokeHandler`. (Resize args are **strings** `'1'`/`'0.5'`/`'0.25'`/`'0'`.)

---

### 6. Link popover buttons (`addLinkPopoverButtons`)

| Memo | contents | tooltip | invoke |
|---|---|---|---|
| `button.linkDialogShow` | icon `icons.link` | `lang.link.edit` | `linkDialog.show` |
| `button.unlink` | icon `icons.unlink` | `lang.link.unlink` | `editor.unlink` |

---

### 7. Table popover buttons (`addTablePopoverButtons`)

All have `className: 'btn-md'` and use `createInvokeHandler`.

| Memo | icon | tooltip | invoke (args) |
|---|---|---|---|
| `button.addRowUp` | `icons.rowAbove` | `lang.table.addRowAbove` | `editor.addRow('top')` |
| `button.addRowDown` | `icons.rowBelow` | `lang.table.addRowBelow` | `editor.addRow('bottom')` |
| `button.addColLeft` | `icons.colBefore` | `lang.table.addColLeft` | `editor.addCol('left')` |
| `button.addColRight` | `icons.colAfter` | `lang.table.addColRight` | `editor.addCol('right')` |
| `button.deleteRow` | `icons.rowRemove` | `lang.table.delRow` | `editor.deleteRow` |
| `button.deleteCol` | `icons.colRemove` | `lang.table.delCol` | `editor.deleteCol` |
| `button.deleteTable` | `icons.trash` | `lang.table.delTable` | `editor.deleteTable` |

---

### 8. `build($container, groups)` — toolbar/popover assembly

Consumed by `Toolbar`/popover modules. `groups` is an array where each entry is either a string or a `[groupName, [buttonNames]]` tuple:
- `groupName = Array.isArray(group) ? group[0] : group`.
- `buttons = Array.isArray(group) ? (group.length===1 ? [group[0]] : group[1]) : [group]`.
- Creates `ui.buttonGroup({ className: 'note-' + groupName })`.
- For each button name, resolves `context.memo('button.' + name)`; if present, appends `btn(this.context)` if it's a function else `btn`. (Memos may be lazy functions or rendered nodes.)
- Appends the group to `$container`.

This is why custom buttons (registered via `options.buttons` → memo `button.<name>`) compose identically with built-ins, and why toolbar config uses the `[group, [names]]` tuple format.

---

### 9. Complete `lang.*` keys referenced

`lang.style.style`; `lang.style[<tag>]` for each styleTag (e.g. `lang.style.p`, `.blockquote`, `.pre`, `.h1`..`.h6`); `lang.font.bold`, `.italic`, `.underline`, `.clear`, `.strikethrough`, `.superscript`, `.subscript`, `.name`, `.size`, `.sizeunit`, `.height`; `lang.color.recent`, `.foreground`, `.background`, `.more`, `.transparent`, `.cpSelect`, `.resetToDefault`; `lang.lists.unordered`, `.ordered`; `lang.paragraph.left`, `.center`, `.right`, `.justify`, `.outdent`, `.indent`, `.paragraph`; `lang.table.table`, `.addRowAbove`, `.addRowBelow`, `.addColLeft`, `.addColRight`, `.delRow`, `.delCol`, `.delTable`; `lang.link.link`, `.edit`, `.unlink`; `lang.image.image`, `.resizeFull`, `.resizeHalf`, `.resizeQuarter`, `.resizeNone`, `.floatLeft`, `.floatRight`, `.floatNone`, `.remove`; `lang.video.video`; `lang.hr.insert`; `lang.options.fullscreen`, `.codeview`, `.help`; `lang.history.undo`, `.redo`.

---

### 10. Complete `icons.*` keys referenced

`magic` (style), `bold`, `italic`, `underline`, `eraser` (clear), `strikethrough`, `superscript`, `subscript`, `font` (color recent — used with `' note-recent-color'` suffix), `menuCheck` (dropdown check mark for fontname/fontsize/fontsizeunit/line-height), `unorderedlist`, `orderedlist`, `alignLeft`, `alignCenter`, `alignRight`, `alignJustify`, `outdent`, `indent`, `textHeight` (line height), `table`, `link`, `picture`, `video`, `minus` (hr), `arrowsAlt` (fullscreen), `code` (codeview), `redo`, `undo`, `question` (help), `rollback` (resizeNone/floatNone), `floatLeft`, `floatRight`, `trash` (removeMedia/deleteTable), `rowAbove`, `rowBelow`, `colBefore`, `colAfter`, `rowRemove`, `colRemove`, `unlink`. Each is rendered via `ui.icon(iconClass)` → `<i class="<iconClass>"></i>` (theme-dependent), producing the `note-icon-*` classes from the icon font.

---

### 11. Keyboard shortcuts surfaced in tooltips

Derived from `options.keyMap` via `representShortcut`. Methods that get a suffix when a mapping exists: `bold`, `italic`, `underline`, `removeFormat`, `strikethrough`, `insertUnorderedList`, `insertOrderedList`, `justifyLeft/Center/Right/Full`, `outdent`, `indent`, `linkDialog.show`, `insertHorizontalRule`, `redo`, `undo`. (`superscript`, `subscript`, `image`, `video`, `fullscreen`, `codeview`, `help`, fontname/size, color, table have no shortcut suffix by default.)

---

### 12. Invoke targets summary (for the React command dispatcher)

`editor.formatBlock`, `editor.bold`, `editor.italic`, `editor.underline`, `editor.removeFormat`, `editor.strikethrough`, `editor.superscript`, `editor.subscript`, `editor.fontName`, `editor.fontSize`, `editor.fontSizeUnit`, `editor.color(obj)`, `editor.backColor`, `editor.foreColor`, `editor.lineHeight`, `editor.insertUnorderedList`, `editor.insertOrderedList`, `editor.justifyLeft/Center/Right/Full`, `editor.outdent`, `editor.indent`, `editor.insertTable`, `editor.insertHorizontalRule`, `editor.resize`, `editor.floatMe`, `editor.removeMedia`, `editor.unlink`, `editor.addRow`, `editor.addCol`, `editor.deleteRow`, `editor.deleteCol`, `editor.deleteTable`, `editor.redo`, `editor.undo`, `editor.currentStyle` (read for state), `linkDialog.show`, `imageDialog.show`, `videoDialog.show`, `helpDialog.show`, `fullscreen.toggle`, `codeview.toggle`.

**Two click-handler factories** (defined on `Context`, not this file — but their contract matters):
- `createInvokeHandler(target, value)`: on click, reads the clicked item's `data-value` (or uses the provided `value` arg) and calls `context.invoke(target, value)`.
- `createInvokeHandlerAndUpdateState(target, value)`: same, then calls `context.invoke('buttons.updateCurrentStyle')` to refresh `.active` states (used by bold/italic/underline/strike/sub/sup/fontname/fontsize/fontsizeunit).

---

<!-- ===== settings-i18n ===== -->
Both files read in full. Here is the spec.

## settings.js — Default Options (chrome-relevant) + en-US Lang Tree

This document is the faithful, implementation-ready extraction of `src/js/settings.js` (the options SSOT) and `src/js/summernote-en-US.js` (default English langpack). All values below are the literal defaults assigned to `$.summernote.options` and `$.summernote.lang['en-US']`.

> Merge contract (from CLAUDE.md / summernote.js, relevant for the port): top-level option merge is **shallow** (`$.extend({}, defaults, userOptions)`). Only `langInfo` and `icons` are deep-merged. Therefore if a consumer passes a partial `callbacks`, `codemirror`, `keyMap`, `popover`, `toolbar`, etc., the entire default object/array is **replaced**, not merged. The React port must preserve this semantics (or consciously change it).

---

### 1. Module registry (`options.modules`)

Registration order matters — modules are instantiated and initialized in this order; `destroy` runs in reverse. Note the deliberate ordering: `hintPopover` is registered **before** `autoLink` (comment in source: "HintPopover must be front of autolink — Script error about range when Enter key is pressed on hint popover").

| Key | Module |
|---|---|
| `editor` | Editor |
| `clipboard` | Clipboard |
| `dropzone` | Dropzone |
| `codeview` | Codeview |
| `statusbar` | Statusbar |
| `fullscreen` | Fullscreen |
| `handle` | Handle |
| `hintPopover` | HintPopover (intentionally before autoLink) |
| `autoLink` | AutoLink |
| `autoSync` | AutoSync |
| `autoReplace` | AutoReplace |
| `placeholder` | Placeholder |
| `buttons` | Buttons |
| `toolbar` | Toolbar |
| `linkDialog` | LinkDialog |
| `linkPopover` | LinkPopover |
| `imageDialog` | ImageDialog |
| `imagePopover` | ImagePopover |
| `tablePopover` | TablePopover |
| `videoDialog` | VideoDialog |
| `helpDialog` | HelpDialog |
| `airPopover` | AirPopover |

---

### 2. Top-level scalar / misc option defaults

| Option | Default | Notes |
|---|---|---|
| `langInfo` | `$.summernote.lang['en-US']` | resolved lang object (see §13) |
| `editing` | `true` | |
| `buttons` | `{}` | custom button factories (name → factory) |
| `lang` | `'en-US'` | must exactly match a loaded langpack key; no partial matching; fallback en-US |
| `followingToolbar` | `false` | sticky toolbar |
| `toolbarPosition` | `'top'` | |
| `otherStaticBar` | `''` | |
| `codeviewKeepButton` | `false` | |
| `popatmouse` | `true` | popover positions at mouse |
| `linkAddNoReferrer` | `false` | |
| `addLinkNoOpener` | `false` | |
| `airMode` | `false` | inline editor mode |
| `overrideContextMenu` | `false` | (TBD) |
| `width` | `null` | |
| `height` | `null` | |
| `linkTargetBlank` | `true` | |
| `focus` | `false` | |
| `tabDisable` | `false` | |
| `tabSize` | `4` | |
| `styleWithCSS` | `false` | |
| `shortcuts` | `true` | enable keymap (set false to disable all shortcuts) |
| `textareaAutoSync` | `true` | |
| `tooltip` | `'auto'` | `'auto'` resolves per-touch/env; `false` disables |
| `container` | `null` | |
| `maxTextLength` | `0` | 0 = unlimited |
| `blockquoteBreakingLevel` | `2` | values 0 / 1 / 2 |
| `spellCheck` | `true` | |
| `disableGrammar` | `false` | |
| `placeholder` | `null` | |
| `inheritPlaceholder` | `false` | |
| `recordEveryKeystroke` | `false` | (undocumented) |
| `historyLimit` | `200` | |
| `showDomainOnlyForAutolink` | `false` | (undocumented) |
| `hintMode` | `'word'` | (undocumented) |
| `hintSelect` | `'after'` | (undocumented) |
| `hintDirection` | `'bottom'` | (undocumented) |
| `addDefaultFonts` | `true` | |
| `colorButton` | `{ foreColor: '#000000', backColor: '#FFFF00' }` | recently-used color button defaults |
| `tableClassName` | `'table table-bordered'` | applied to inserted `<table>` |
| `insertTableMaxSize` | `{ col: 10, row: 10 }` | table picker grid max |
| `dialogsInBody` | `false` | else attached in container |
| `dialogsFade` | `false` | |
| `maximumImageFileSize` | `null` | |
| `acceptImageFileTypes` | `"image/*"` | |
| `allowClipboardImagePasting` | `true` | |

---

### 3. Toolbar (`options.toolbar`)

Format: array of `[groupName, [buttonName, ...]]` tuples. Each buttonName references a `'button.<name>'` memo factory.

```
[
  ['style',    ['style']],
  ['font',     ['bold', 'underline', 'clear']],
  ['fontname', ['fontname']],
  ['color',    ['color']],
  ['para',     ['ul', 'ol', 'paragraph']],
  ['table',    ['table']],
  ['insert',   ['link', 'picture', 'video']],
  ['view',     ['fullscreen', 'codeview', 'help']],
]
```

---

### 4. Popovers (`options.popover.*`)

Same `[groupName, [buttonName,...]]` tuple format.

**`popover.image`**
```
[
  ['resize', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
  ['float',  ['floatLeft', 'floatRight', 'floatNone']],
  ['remove', ['removeMedia']],
]
```

**`popover.link`**
```
[
  ['link', ['linkDialogShow', 'unlink']],
]
```

**`popover.table`**
```
[
  ['add',    ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
  ['delete', ['deleteRow', 'deleteCol', 'deleteTable']],
]
```

**`popover.air`** (air mode floating toolbar)
```
[
  ['color',  ['color']],
  ['font',   ['bold', 'underline', 'clear']],
  ['para',   ['ul', 'paragraph']],
  ['table',  ['table']],
  ['insert', ['link', 'picture']],
  ['view',   ['fullscreen', 'codeview']],
]
```

---

### 5. Style tags (`options.styleTags`)

```
['p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
```

---

### 6. Fonts

`options.fontNames`:
```
['Arial', 'Arial Black', 'Comic Sans MS', 'Courier New',
 'Helvetica Neue', 'Helvetica', 'Impact', 'Lucida Grande',
 'Tahoma', 'Times New Roman', 'Verdana']
```

`options.fontNamesIgnoreCheck`: `[]` (font names listed here bypass the `isFontInstalled` availability check).

`options.fontSizes`:
```
['8', '9', '10', '11', '12', '14', '18', '24', '36']
```

`options.fontSizeUnits`:
```
['px', 'pt']
```

---

### 7. Colors

`options.colors` — 8×8 palette (rows × cols). Row index aligns with `colorsName` (§7b).

```
Row 0: #000000 #424242 #636363 #9C9C94 #CEC6CE #EFEFEF #F7F7F7 #FFFFFF
Row 1: #FF0000 #FF9C00 #FFFF00 #00FF00 #00FFFF #0000FF #9C00FF #FF00FF
Row 2: #F7C6CE #FFE7CE #FFEFC6 #D6EFD6 #CEDEE7 #CEE7F7 #D6D6E7 #E7D6DE
Row 3: #E79C9C #FFC69C #FFE79C #B5D6A5 #A5C6CE #9CC6EF #B5A5D6 #D6A5BD
Row 4: #E76363 #F7AD6B #FFD663 #94BD7B #73A5AD #6BADDE #8C7BC6 #C67BA5
Row 5: #CE0000 #E79439 #EFC631 #6BA54A #4A7B8C #3984C6 #634AA5 #A54A7B
Row 6: #9C0000 #B56308 #BD9400 #397B21 #104A5A #085294 #311873 #731842
Row 7: #630000 #7B3900 #846300 #295218 #083139 #003163 #21104A #4A1031
```

**`options.colorsName`** — 8×8, parallel to `colors` (source: chir.ag name-that-color). Used for color swatch tooltips/titles.

```
Row 0: Black, Tundora, Dove Gray, Star Dust, Pale Slate, Gallery, Alabaster, White
Row 1: Red, Orange Peel, Yellow, Green, Cyan, Blue, Electric Violet, Magenta
Row 2: Azalea, Karry, Egg White, Zanah, Botticelli, Tropical Blue, Mischka, Twilight
Row 3: Tonys Pink, Peach Orange, Cream Brulee, Sprout, Casper, Perano, Cold Purple, Careys Pink
Row 4: Mandy, Rajah, Dandelion, Olivine, Gulf Stream, Viking, Blue Marguerite, Puce
Row 5: Guardsman Red, Fire Bush, Golden Dream, Chelsea Cucumber, Smalt Blue, Boston Blue, Butterfly Bush, Cadillac
Row 6: Sangria, Mai Tai, Buddha Gold, Forest Green, Eden, Venice Blue, Meteorite, Claret
Row 7: Rosewood, Cinnamon, Olive, Parsley, Tiber, Midnight Blue, Valentino, Loulou
```

---

### 8. Line heights (`options.lineHeights`)

```
['1.0', '1.2', '1.4', '1.5', '1.6', '1.8', '2.0', '3.0']
```

---

### 9. Callbacks (`options.callbacks`)

All default to `null`. (Each also fires as a jQuery `summernote.<event>` event; callback `this` is bound to raw DOM `$note[0]`.)

```
onBeforeCommand, onBlur, onBlurCodeview, onChange, onChangeCodeview,
onDialogShown, onEnter, onFocus, onImageLinkInsert, onImageUpload,
onImageUploadError, onInit, onKeydown, onKeyup, onMousedown, onMouseup,
onPaste, onScroll
```

---

### 10. CodeMirror (`options.codemirror`)

```
{ mode: 'text/html', htmlMode: true, lineNumbers: true }
```

---

### 11. Codeview security filters (security-sensitive)

| Option | Default |
|---|---|
| `codeviewFilter` | `true` |
| `codeviewFilterRegex` | `/<\/*(?:applet\|b(?:ase\|gsound\|link)\|embed\|frame(?:set)?\|ilayer\|l(?:ayer\|ink)\|meta\|object\|s(?:cript\|tyle)\|t(?:itle\|extarea)\|xml)[^>]*?>/gi` |
| `codeviewIframeFilter` | `true` |
| `codeviewIframeWhitelistSrc` | `[]` (user-supplied additions) |
| `codeviewIframeWhitelistSrcBase` | base whitelist (below) |

`codeviewFilterRegex` strips these tags (open/close) on codeview→editable sync: `applet, base, bgsound, blink, embed, frame, frameset, ilayer, layer, link, meta, object, script, style, title, textarea, xml`.

`codeviewIframeWhitelistSrcBase`:
```
['www.youtube.com', 'www.youtube-nocookie.com', 'www.facebook.com',
 'vine.co', 'instagram.com', 'player.vimeo.com', 'www.dailymotion.com',
 'player.youku.com', 'jumpingbean.tv', 'v.qq.com']
```

---

### 12. KeyMap (command → shortcut)

`options.keyMap` has separate `pc` and `mac` maps. Below, command targets map to `editor.*` methods unless prefixed (`linkDialog.show` routes to that module). When `options.shortcuts` is `false`, the whole keymap is disabled. Token syntax: `+`-joined; `NUM0..NUM8` = numpad/digit keys, `LEFTBRACKET`/`RIGHTBRACKET` = `[`/`]`, `BACKSLASH` = `\`.

| Command target | PC shortcut | Mac shortcut |
|---|---|---|
| `escape` | `ESC` | `ESC` |
| `insertParagraph` | `ENTER` | `ENTER` |
| `undo` | `CTRL+Z` | `CMD+Z` |
| `redo` | `CTRL+Y` | `CMD+SHIFT+Z` |
| `tab` | `TAB` | `TAB` |
| `untab` | `SHIFT+TAB` | `SHIFT+TAB` |
| `bold` | `CTRL+B` | `CMD+B` |
| `italic` | `CTRL+I` | `CMD+I` |
| `underline` | `CTRL+U` | `CMD+U` |
| `strikethrough` | `CTRL+SHIFT+S` | `CMD+SHIFT+S` |
| `removeFormat` | `CTRL+BACKSLASH` | `CMD+BACKSLASH` |
| `justifyLeft` | `CTRL+SHIFT+L` | `CMD+SHIFT+L` |
| `justifyCenter` | `CTRL+SHIFT+E` | `CMD+SHIFT+E` |
| `justifyRight` | `CTRL+SHIFT+R` | `CMD+SHIFT+R` |
| `justifyFull` | `CTRL+SHIFT+J` | `CMD+SHIFT+J` |
| `insertUnorderedList` | `CTRL+SHIFT+NUM7` | `CMD+SHIFT+NUM7` |
| `insertOrderedList` | `CTRL+SHIFT+NUM8` | `CMD+SHIFT+NUM8` |
| `outdent` | `CTRL+LEFTBRACKET` | `CMD+LEFTBRACKET` |
| `indent` | `CTRL+RIGHTBRACKET` | `CMD+RIGHTBRACKET` |
| `formatPara` | `CTRL+NUM0` | `CMD+NUM0` |
| `formatH1` | `CTRL+NUM1` | `CMD+NUM1` |
| `formatH2` | `CTRL+NUM2` | `CMD+NUM2` |
| `formatH3` | `CTRL+NUM3` | `CMD+NUM3` |
| `formatH4` | `CTRL+NUM4` | `CMD+NUM4` |
| `formatH5` | `CTRL+NUM5` | `CMD+NUM5` |
| `formatH6` | `CTRL+NUM6` | `CMD+NUM6` |
| `insertHorizontalRule` | `CTRL+ENTER` | `CMD+ENTER` |
| `linkDialog.show` | `CTRL+K` | `CMD+K` |

Notable PC/Mac divergence: **redo** is `CTRL+Y` on PC but `CMD+SHIFT+Z` on Mac (no `CMD+Y`). All others differ only by the `CTRL`→`CMD` modifier swap.

---

### 13. Icons (`options.icons`) — name → class

These are the only icon classes referenced by default buttons. (Deep-merged with user `icons`.)

```
align→note-icon-align              alignCenter→note-icon-align-center
alignJustify→note-icon-align-justify  alignLeft→note-icon-align-left
alignRight→note-icon-align-right   rowBelow→note-icon-row-below
colBefore→note-icon-col-before     colAfter→note-icon-col-after
rowAbove→note-icon-row-above       rowRemove→note-icon-row-remove
colRemove→note-icon-col-remove     indent→note-icon-align-indent
outdent→note-icon-align-outdent    arrowsAlt→note-icon-arrows-alt
bold→note-icon-bold                caret→note-icon-caret
circle→note-icon-circle            close→note-icon-close
code→note-icon-code                eraser→note-icon-eraser
floatLeft→note-icon-float-left     floatRight→note-icon-float-right
font→note-icon-font                frame→note-icon-frame
italic→note-icon-italic            link→note-icon-link
unlink→note-icon-chain-broken      magic→note-icon-magic
menuCheck→note-icon-menu-check     minus→note-icon-minus
orderedlist→note-icon-orderedlist  pencil→note-icon-pencil
picture→note-icon-picture          question→note-icon-question
redo→note-icon-redo                rollback→note-icon-rollback
square→note-icon-square            strikethrough→note-icon-strikethrough
subscript→note-icon-subscript      superscript→note-icon-superscript
table→note-icon-table              textHeight→note-icon-text-height
trash→note-icon-trash              underline→note-icon-underline
undo→note-icon-undo                unorderedlist→note-icon-unorderedlist
video→note-icon-video
```

Also: `version: '@@VERSION@@'` (build-replaced), `plugins: {}`, and `dom`/`range`/`lists` core utils are attached to `$.summernote` alongside `options`.

---

### 14. Full en-US lang key tree (`$.summernote.lang['en-US']`)

Every key path → English string. Merged into `$.summernote.lang` via `$.extend(true, ...)` (deep).

**font**
- `font.bold` = "Bold"
- `font.italic` = "Italic"
- `font.underline` = "Underline"
- `font.clear` = "Remove Font Style"
- `font.height` = "Line Height"
- `font.name` = "Font Family"
- `font.strikethrough` = "Strikethrough"
- `font.subscript` = "Subscript"
- `font.superscript` = "Superscript"
- `font.size` = "Font Size"
- `font.sizeunit` = "Font Size Unit"

**image**
- `image.image` = "Picture"
- `image.insert` = "Insert Image"
- `image.resizeFull` = "Resize full"
- `image.resizeHalf` = "Resize half"
- `image.resizeQuarter` = "Resize quarter"
- `image.resizeNone` = "Original size"
- `image.floatLeft` = "Float Left"
- `image.floatRight` = "Float Right"
- `image.floatNone` = "Remove float"
- `image.shapeRounded` = "Shape: Rounded"
- `image.shapeCircle` = "Shape: Circle"
- `image.shapeThumbnail` = "Shape: Thumbnail"
- `image.shapeNone` = "Shape: None"
- `image.dragImageHere` = "Drag image or text here"
- `image.dropImage` = "Drop image or Text"
- `image.selectFromFiles` = "Select from files"
- `image.maximumFileSize` = "Maximum file size"
- `image.maximumFileSizeError` = "Maximum file size exceeded."
- `image.url` = "Image URL"
- `image.remove` = "Remove Image"
- `image.original` = "Original"

**video**
- `video.video` = "Video"
- `video.videoLink` = "Video Link"
- `video.insert` = "Insert Video"
- `video.url` = "Video URL"
- `video.providers` = "(YouTube, Google Drive, Vimeo, Vine, Instagram, DailyMotion, Youku, Peertube)"

**link**
- `link.link` = "Link"
- `link.insert` = "Insert Link"
- `link.unlink` = "Unlink"
- `link.edit` = "Edit"
- `link.textToDisplay` = "Text to display"
- `link.url` = "To what URL should this link go?"
- `link.openInNewWindow` = "Open in new window"

**table**
- `table.table` = "Table"
- `table.addRowAbove` = "Add row above"
- `table.addRowBelow` = "Add row below"
- `table.addColLeft` = "Add column left"
- `table.addColRight` = "Add column right"
- `table.delRow` = "Delete row"
- `table.delCol` = "Delete column"
- `table.delTable` = "Delete table"

**hr**
- `hr.insert` = "Insert Horizontal Rule"

**style**
- `style.style` = "Style"
- `style.p` = "Normal"
- `style.blockquote` = "Quote"
- `style.pre` = "Code"
- `style.h1` = "Header 1"
- `style.h2` = "Header 2"
- `style.h3` = "Header 3"
- `style.h4` = "Header 4"
- `style.h5` = "Header 5"
- `style.h6` = "Header 6"

**lists**
- `lists.unordered` = "Unordered list"
- `lists.ordered` = "Ordered list"

**options**
- `options.help` = "Help"
- `options.fullscreen` = "Full Screen"
- `options.codeview` = "Code View"

**paragraph**
- `paragraph.paragraph` = "Paragraph"
- `paragraph.outdent` = "Outdent"
- `paragraph.indent` = "Indent"
- `paragraph.left` = "Align left"
- `paragraph.center` = "Align center"
- `paragraph.right` = "Align right"
- `paragraph.justify` = "Justify full"

**color**
- `color.recent` = "Recent Color"
- `color.more` = "More Color"
- `color.background` = "Background Color"
- `color.foreground` = "Text Color"
- `color.transparent` = "Transparent"
- `color.setTransparent` = "Set transparent"
- `color.reset` = "Reset"
- `color.resetToDefault` = "Reset to default"
- `color.cpSelect` = "Select"

**shortcut**
- `shortcut.shortcuts` = "Keyboard shortcuts"
- `shortcut.close` = "Close"
- `shortcut.textFormatting` = "Text formatting"
- `shortcut.action` = "Action"
- `shortcut.paragraphFormatting` = "Paragraph formatting"
- `shortcut.documentStyle` = "Document Style"
- `shortcut.extraKeys` = "Extra keys"

**help** (keyed by command name; used by the help dialog to label each shortcut)
- `help.escape` = "Escape"
- `help.insertParagraph` = "Insert Paragraph"
- `help.undo` = "Undo the last command"
- `help.redo` = "Redo the last command"
- `help.tab` = "Tab"
- `help.untab` = "Untab"
- `help.bold` = "Set a bold style"
- `help.italic` = "Set a italic style"
- `help.underline` = "Set a underline style"
- `help.strikethrough` = "Set a strikethrough style"
- `help.removeFormat` = "Clean a style"
- `help.justifyLeft` = "Set left align"
- `help.justifyCenter` = "Set center align"
- `help.justifyRight` = "Set right align"
- `help.justifyFull` = "Set full align"
- `help.insertUnorderedList` = "Toggle unordered list"
- `help.insertOrderedList` = "Toggle ordered list"
- `help.outdent` = "Outdent on current paragraph"
- `help.indent` = "Indent on current paragraph"
- `help.formatPara` = "Change current block's format as a paragraph(P tag)"
- `help.formatH1` = "Change current block's format as H1"
- `help.formatH2` = "Change current block's format as H2"
- `help.formatH3` = "Change current block's format as H3"
- `help.formatH4` = "Change current block's format as H4"
- `help.formatH5` = "Change current block's format as H5"
- `help.formatH6` = "Change current block's format as H6"
- `help.insertHorizontalRule` = "Insert horizontal rule"
- `help['linkDialog.show']` = "Show Link Dialog"  (note: key literally contains a dot — `'linkDialog.show'`)

**history**
- `history.undo` = "Undo"
- `history.redo` = "Redo"

**specialChar**
- `specialChar.specialChar` = "SPECIAL CHARACTERS"
- `specialChar.select` = "Select Special characters"

**output**
- `output.noSelection` = "No Selection Made!"

---

### Port-relevant gotchas

- `help['linkDialog.show']` and the keyMap value `'linkDialog.show'` both contain a literal dot; in TS, model `help` as a string-indexed record, not a nested object, or these collide with namespacing logic.
- `colors`/`colorsName` are strictly parallel 8×8 arrays — the swatch tooltip pulls the name by `[row][col]` index; keep them index-aligned.
- `fontSizes`/`lineHeights`/`fontSizes` are strings, not numbers — preserve string type (used directly in select values / style strings).
- The `help` lang object is keyed by **command name** (matching keyMap values), so the help dialog can join shortcut⇄description by command. Both must stay in sync.
- `keyMap` redo divergence (PC `CTRL+Y` vs Mac `CMD+SHIFT+Z`) is the only structural PC/mac difference beyond the modifier swap.
- Source file paths: `c:\github\summernote-react\src\js\settings.js`, `c:\github\summernote-react\src\js\summernote-en-US.js`.

---

<!-- ===== link ===== -->
I now have a complete picture. Here is the spec.

## LinkDialog & LinkPopover

Faithful implementation spec for `src/js/module/LinkDialog.js` and `src/js/module/LinkPopover.js`. These two modules cooperate: the **dialog** creates/edits a link via a modal form; the **popover** is a floating bubble shown when the caret sits on an existing anchor, offering "Edit" (re-opens the dialog) and "Unlink" actions.

---

### 1. Module registration & lifecycle

Both are default-export ES6 classes registered in `options.modules` (settings.js): `linkDialog` and `linkPopover`. Each `constructor(context)` receives the Context; both store `this.context`, `this.ui = $.summernote.ui` (global UI factory), `this.options = context.options`.

- `LinkDialog`: also stores `this.$body = $(document.body)`, `this.$editor = context.layoutInfo.editor`, `this.lang = this.options.langInfo`. In the constructor it registers a help memo: `context.memo('help.linkDialog.show', this.options.langInfo.help['linkDialog.show'])` — used by the Help dialog to describe the `Ctrl/⌘+K` shortcut.
- `LinkDialog` has **no** `shouldInitialize()` (always initializes). It implements `initialize()` and `destroy()`.
- `LinkPopover` implements `shouldInitialize()` returning `!lists.isEmpty(this.options.popover.link)` — i.e. skip entirely if `options.popover.link` is an empty array. It implements `initialize()`, `destroy()`, plus reactive `events`.

In the React/TS port both should be plain modules with `initialize`/`destroy`; the dialog is invoked imperatively (`linkDialog.show`), the popover is event-driven.

---

### 2. LinkDialog — DOM markup (built in `initialize()`)

`$container` target = `this.options.dialogsInBody ? document.body : this.options.container`. Defaults: `dialogsInBody=false`, `container=null` (resolved elsewhere to the editor's editing area). Dialog is built once at init and appended to `$container`; it is shown/hidden, not recreated.

**Body HTML** (joined string), exact structure and classes:

```
<div class="form-group note-form-group">
  <label for="note-dialog-link-txt-{id}" class="note-form-label">{lang.link.textToDisplay}</label>
  <input id="note-dialog-link-txt-{id}" class="note-link-text form-control note-form-control note-input" type="text"/>
</div>
<div class="form-group note-form-group">
  <label for="note-dialog-link-url-{id}" class="note-form-label">{lang.link.url}</label>
  <input id="note-dialog-link-url-{id}" class="note-link-url form-control note-form-control note-input" type="text" value="http://"/>
</div>
{checkbox block, only if !options.disableLinkTarget}
```

- `{id}` = `this.options.id` (per-editor unique id; used to scope label `for`/input `id`).
- URL input has a literal **default `value="http://"`** in markup (overwritten at show-time by `linkInfo.url`).
- The "open in new window" checkbox is rendered only when `options.disableLinkTarget` is falsy. **Note:** `disableLinkTarget` is **not** declared in settings.js defaults — it is `undefined` by default, so the checkbox is shown by default. It is produced by `this.ui.checkbox({...}).render()` wrapped: `$('<div></div>').append(checkbox.render()).html()` — i.e. the checkbox's outer HTML is embedded inside an extra `<div>`.

**Checkbox factory options** passed:
- `className: 'sn-checkbox-open-in-new-window'`
- `text: this.lang.link.openInNewWindow`
- `checked: true`

**Checkbox rendered markup** (lite theme `renderer.create('<div class="checkbox"></div>', …)`), with the `className` applied to the outer div:
```
<div class="checkbox sn-checkbox-open-in-new-window">
  <label>
    <input role="checkbox" type="checkbox" checked aria-checked="true"/>
    {options.text}
  </label>
</div>
```
(If `options.id` were set the label gets `for="note-{id}"` and the input gets `id="note-{id}"`; here no `id` is passed so neither is emitted.) The dialog later locates the input via selector `.sn-checkbox-open-in-new-window input[type=checkbox]`.

**Footer HTML** — a single submit button, **initially disabled**:
```
<input type="button" href="#" class="btn btn-primary note-btn note-btn-primary note-link-btn" value="{lang.link.insert}" disabled>
```
Button class string is exactly `'btn btn-primary note-btn note-btn-primary note-link-btn'`. Located later via `.note-link-btn`.

**Dialog factory call** (`this.ui.dialog({...}).render().appendTo($container)`):
- `className: 'link-dialog'`
- `title: this.lang.link.insert`
- `fade: this.options.dialogsFade` (default `false`)
- `body`, `footer` as above.

Result stored in `this.$dialog`. The rendered modal carries `.note-modal` / `.modal` structure (theme-dependent); the content area selector the popover-side uses is N/A here. For the lite theme the dialog instance is reachable via `$dialog.data('modal')` (an object with `.show()`/`.hide()`).

`destroy()`: `this.ui.hideDialog(this.$dialog)` then `this.$dialog.remove()`.

---

### 3. LinkDialog — URL validation (`checkLinkUrl`)

Three module-level regexes:
- `MAILTO_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`
- `TEL_PATTERN = /^(\+?\d{1,3}[\s-]?)?(\d{1,4})[\s-]?(\d{1,4})[\s-]?(\d{1,4})$/`
- `URL_SCHEME_PATTERN = /^([A-Za-z][A-Za-z0-9+-.]*\:|#|\/)/`

`checkLinkUrl(linkUrl)` logic, **in order**:
1. If `options.onCreateLink` is set → return `options.onCreateLink(linkUrl)` (full delegation; caller-supplied normalization). `onCreateLink` is **not** in settings.js defaults (undefined by default).
2. Else if `MAILTO_PATTERN.test(linkUrl)` → return `'mailto:' + linkUrl`.
3. Else if `TEL_PATTERN.test(linkUrl)` → return `'tel:' + linkUrl`.
4. Else if **not** `URL_SCHEME_PATTERN.test(linkUrl)` (no scheme/`#`/`/` prefix) → return `'http://' + linkUrl`.
5. Else return `linkUrl` unchanged.

`onCheckLinkUrl($input)`: binds `blur` on the URL input → on blur, if value is `''` keep `''`, otherwise replace value with `checkLinkUrl(value)`. (Normalizes the field visibly when the user tabs/clicks away.)

> Override note: `checkLinkUrl` is intentionally an instance method so subclasses can override it (see commit 57959cd2 "Allow LinkDialog.checkLinkUrl override").

---

### 4. LinkDialog — submit-button enable logic (`toggleLinkBtn`)

`toggleLinkBtn($linkBtn, $linkText, $linkUrl)` → `this.ui.toggleBtn($linkBtn, $linkText.val() && $linkUrl.val())`. The button is enabled **iff both** the text field and the URL field are non-empty (truthy). `ui.toggleBtn` (lite) toggles class `disabled` and sets the `disabled` attribute to `!isEnable`.

This is called: once initially (in `onDialogShown`), and on every `input/paste/propertychange` on either the text or URL field.

---

### 5. LinkDialog — show flow (`show()` → `showLinkDialog()` → resolve → `createLink`)

#### `show()` (public entry, invoked as `linkDialog.show`)
1. `const linkInfo = this.context.invoke('editor.getLinkInfo')` — gathers current selection/anchor state (see §6).
2. `this.context.invoke('editor.saveRange')` — saves the current WrappedRange before focus moves to the dialog inputs (selection would otherwise be lost).
3. `this.showLinkDialog(linkInfo)` returns a jQuery Deferred promise.
   - **on resolve** (user submitted): `editor.restoreRange` then `editor.createLink(resolvedLinkInfo)`.
   - **on fail/reject** (dialog dismissed without submit): `editor.restoreRange` only.

#### `showLinkDialog(linkInfo)` — returns `$.Deferred(...).promise()`
On entry it caches jQuery handles: `.note-link-text`, `.note-link-url`, `.note-link-btn`, and `.sn-checkbox-open-in-new-window input[type=checkbox]`.

Registers `this.ui.onDialogShown(this.$dialog, callback)` (lite: `$dialog.one('note.modal.show', …)`). The **shown callback** does, in order:
1. `this.context.triggerEvent('dialog.shown')` — fires `onDialogShown` callback and `summernote.dialog.shown` jQuery event. (The popover listens to this to hide itself — §10.)
2. **URL-from-text inference**: if `!linkInfo.url && func.isValidUrl(linkInfo.text)` → `linkInfo.url = this.checkLinkUrl(linkInfo.text)`. (`func.isValidUrl` uses regex `/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi` — matches `summernote.org` etc., not bare `summernote`.)
3. Binds `$linkText.on('input paste propertychange', …)`: reads `$linkText.val()`, **HTML-escapes it** by setting `div.innerText = text` then reading `div.innerHTML` (escapes `<>&` etc.), assigns the escaped string to `linkInfo.text`, then calls `toggleLinkBtn`. Then `.val(linkInfo.text)` initializes the field. The comment notes once the user edits the text field, auto-cloning from URL stops (because `linkInfo.text` becomes truthy).
4. Binds `$linkUrl.on('input paste propertychange', …)`: **if `!linkInfo.text`** (text still empty) → mirror URL into the text field (`$linkText.val($linkUrl.val())`); then `toggleLinkBtn`. Then `.val(linkInfo.url)` initializes the URL field.
5. If `!env.isSupportTouch` → `$linkUrl.trigger('focus')` (focus URL field on non-touch devices; skip on touch to avoid keyboard popping).
6. `toggleLinkBtn(...)` once (set initial enabled state from prefilled values).
7. `this.bindEnterKey($linkUrl, $linkBtn)` and `this.bindEnterKey($linkText, $linkBtn)` — Enter-to-submit on both inputs.
8. `this.onCheckLinkUrl($linkUrl)` — blur normalization on URL field.
9. **Checkbox initial state**: `isNewWindowChecked = linkInfo.isNewWindow !== undefined ? linkInfo.isNewWindow : this.context.options.linkTargetBlank` (default `linkTargetBlank=true`). Then `$openInNewWindow.prop('checked', isNewWindowChecked)`. So: editing an existing anchor reflects its actual `target`; creating new uses `linkTargetBlank`.
10. `$linkBtn.one('click', event => {...})`: `event.preventDefault()`, then `deferred.resolve({ range: linkInfo.range, url: $linkUrl.val(), text: $linkText.val(), isNewWindow: $openInNewWindow.is(':checked') })`, then `this.ui.hideDialog(this.$dialog)`. **`.one`** ensures single submission.

Registers `this.ui.onDialogHidden(this.$dialog, callback)` (lite: `$dialog.one('note.modal.hide', …)`). The **hidden callback**:
- `$linkText.off(); $linkUrl.off(); $linkBtn.off();` — detach all handlers (prevents leak/duplicate bindings across reopens).
- If `deferred.state() === 'pending'` → `deferred.reject()` (dismissed without submit → triggers the `.fail()` restoreRange path).

Finally `this.ui.showDialog(this.$dialog)` (lite: `$dialog.data('modal').show()`).

#### `bindEnterKey($input, $btn)`
Binds `keypress` on the input: if `event.keyCode === key.code.ENTER` → `event.preventDefault()` then `$btn.trigger('click')`. (Submits via the same `.one('click')` handler.)

> **Resolved payload shape** (what `createLink` receives): `{ range: WrappedRange, url: string, text: string, isNewWindow: boolean }`. The `range` is the **original** `linkInfo.range` captured at open time (not re-read).

---

### 6. `editor.getLinkInfo` contract (consumed by the dialog)

`getLinkInfo()` (Editor.js):
1. If `!this.hasFocus()` → `this.focus()`.
2. `const rng = this.getLastRange().expand(dom.isAnchor)` — expands the selection to cover the whole anchor if the caret is inside one.
3. `$anchor = $(lists.head(rng.nodes(dom.isAnchor)))` — first anchor in range, if any.
4. Returns `{ range: rng, text: rng.toString(), url: $anchor.length ? $anchor.attr('href') : '' }`.
5. If an anchor exists, additionally sets `isNewWindow = ($anchor.attr('target') === '_blank')`.

So `linkInfo` = `{ range, text, url, isNewWindow? }`. `isNewWindow` is **absent** when there is no existing anchor (drives the `!== undefined` fallback in §5.9).

---

### 7. `editor.createLink` command contract (the actual mutation)

`this.createLink = this.wrapCommand((linkInfo) => {...})` — wrapped in `beforeCommand`/`afterCommand` (records undo, normalizes, fires `change`). Argument shape consumed: `{ url, text, isNewWindow, range? }`.

Logic:
- `linkUrl = linkInfo.url`, `linkText = linkInfo.text`, `isNewWindow = linkInfo.isNewWindow`.
- `addNoReferrer = options.linkAddNoReferrer` (default `false`); `addNoOpener = options.linkAddNoOpener`.
  - **Discrepancy to preserve/fix in port:** settings.js declares the default as `addLinkNoOpener: false` (line 116) but Editor.js reads `options.linkAddNoOpener` (line 203). So with stock defaults `addNoOpener` is `undefined` (falsy) and `noopener` is never auto-added unless the user passes `linkAddNoOpener`. CLAUDE.md's option list names it `addLinkNoOpener`. The React port should unify on one name (recommend `linkAddNoOpener`) and document the historical mismatch.
- `rng = linkInfo.range || this.getLastRange()`.
- `additionalTextLength = linkText.length - rng.toString().length`; if `> 0 && this.isLimited(additionalTextLength)` → return (respects `maxTextLength`).
- `isTextChanged = rng.toString() !== linkText`.
- `linkUrl = linkUrl.trim()` if string.
- URL normalization: if `options.onCreateLink` → `linkUrl = options.onCreateLink(linkUrl)`, else `linkUrl = this.checkLinkUrl(linkUrl)` (Editor has its own `checkLinkUrl`, semantically equivalent normalization — note this re-normalizes even though the dialog may already have).
- **Anchor creation**:
  - If `isTextChanged`: `rng = rng.deleteContents()`, then `anchor = rng.insertNode($('<A></A>').text(linkText)[0])`; `anchors = [anchor]`. (Replaces selection with a new `<a>` containing the typed text.)
  - Else: `anchors = this.style.styleNodes(rng, { nodeName: 'A', expandClosestSibling: true, onlyPartialContains: true })` — wraps the existing selection in `<a>` without changing text.
- For each anchor: set `href = linkUrl`. If `isNewWindow`: set `target="_blank"`; collect `rel`: push `'noreferrer'` if `addNoReferrer`, push `'noopener'` if `addNoOpener`; if `rel.length` set `rel="noreferrer noopener"` (space-joined). If **not** new window: `removeAttr('target')` (does **not** remove an existing `rel`).
- Finally `this.setLastRange(this.createRangeFromList(anchors).select())` — re-selects the new anchor(s).

So the final anchor attributes: `href` always; `target="_blank"` + optional `rel` only when new-window; target removed when not.

---

### 8. LinkPopover — DOM markup (`initialize()`)

Guarded by `shouldInitialize()` = `!lists.isEmpty(options.popover.link)`.

`this.$popover = this.ui.popover({ className: 'note-link-popover', callback: ($node) => {...} }).render().appendTo(this.options.container)`.

- Popover base class: **`note-link-popover`**.
- The `callback` runs against the rendered popover node: finds `.popover-content,.note-popover-content` and **prepends** `'<span><a target="_blank"></a>&nbsp;</span>'` — this `<a>` displays the current link's href as both text and href (with a trailing non-breaking space before the action buttons).
- After render: `$content = this.$popover.find('.popover-content,.note-popover-content')`, then `this.context.invoke('buttons.build', $content, this.options.popover.link)` — builds the action buttons from the popover config into the content area.
- `this.$popover.on('mousedown', e => e.preventDefault())` — prevents the popover from stealing focus / collapsing the selection when clicked.

`destroy()`: `this.$popover.remove()`.

**Default `options.popover.link`** (settings.js):
```
link: [
  ['link', ['linkDialogShow', 'unlink']],
]
```
i.e. one button group named `link` containing buttons `linkDialogShow` and `unlink`.

**Button definitions** (Buttons.js `addLinkPopoverButtons()`), each memoized as `button.<name>`:
- `button.linkDialogShow`: contents `ui.icon(options.icons.link)`, tooltip `lang.link.edit` (`"Edit"`), click → `context.createInvokeHandler('linkDialog.show')` (re-opens the dialog in edit mode).
- `button.unlink`: contents `ui.icon(options.icons.unlink)`, tooltip `lang.link.unlink` (`"Unlink"`), click → `context.createInvokeHandler('editor.unlink')`.

The rendered popover (lite) content thus contains: `<span><a target="_blank">{href}</a>&nbsp;</span>` followed by a button group `[Edit][Unlink]`.

`editor.unlink` (Editor.js): if `rng.isOnAnchor()` → expand range to the whole anchor (`range.createFromNode(anchor)`), select, `setLastRange`, then `beforeCommand` / `document.execCommand('unlink')` / `afterCommand`. (In the no-execCommand port, replace with manual anchor unwrap.)

---

### 9. LinkPopover — positioning & visibility (`update()` / `hide()`)

Bound to editor activity via `events` (§10). `update()`:
1. `if (!this.context.invoke('editor.hasFocus')) { this.hide(); return; }` — never show if editor lost focus (comment: prevents focusing editable when `invoke('code')` runs).
2. `const rng = this.context.invoke('editor.getLastRange')`.
3. **Show condition**: `rng.isCollapsed() && rng.isOnAnchor()` — caret collapsed and sitting on an anchor.
   - `anchor = dom.ancestor(rng.sc, dom.isAnchor)`; `href = $(anchor).attr('href')`.
   - Set the popover's display link: `this.$popover.find('a').attr('href', href).text(href)` (the prepended `<a target="_blank">` shows the URL as visible text and link).
   - Position: `pos = dom.posFromPlaceholder(anchor)` = `{ left: anchorOffset.left, top: anchorOffset.top + anchor.outerHeight(true) }` (i.e. just below the anchor, including its margin). Then subtract the container offset: `containerOffset = $(options.container).offset(); pos.top -= containerOffset.top; pos.left -= containerOffset.left` (convert to container-relative coords).
   - `this.$popover.css({ display: 'block', left: pos.left, top: pos.top })`.
4. **Else** → `this.hide()`.

`hide()`: `this.$popover.hide()`.

`rng.isOnAnchor()` is `makeIsOn(dom.isAnchor)` — true when the range's start container has an `<a>` ancestor.

---

### 10. LinkPopover — events bound

`this.events` object (auto-subscribed by the module system to `$note` jQuery custom events):
- `'summernote.keyup summernote.mouseup summernote.change summernote.scroll'` → `this.update()` (re-evaluate show/position on caret moves, edits, and scroll).
- `'summernote.disable summernote.dialog.shown'` → `this.hide()` (hide when editor disabled, and **hide when any dialog opens** — including the link dialog itself, since `showLinkDialog` fires `dialog.shown`).
- `'summernote.blur'` → handler `(we, event) => {...}`:
  - If `event.originalEvent && event.originalEvent.relatedTarget`: hide **only if** the focus did **not** move into the popover (`!this.$popover[0].contains(relatedTarget)`). This keeps the popover open when the user clicks its Edit/Unlink buttons.
  - Else (no relatedTarget): `this.hide()`.

Plus the direct DOM binding from `initialize`: `mousedown` on the popover → `preventDefault()`.

---

### 11. i18n lang keys referenced (full list)

From `lang.link.*` (en-US values in parentheses):
- `lang.link.textToDisplay` — `"Text to display"` (dialog text label)
- `lang.link.url` — `"To what URL should this link go?"` (dialog URL label)
- `lang.link.openInNewWindow` — `"Open in new window"` (checkbox text)
- `lang.link.insert` — `"Insert Link"` (dialog title + submit button value)
- `lang.link.edit` — `"Edit"` (popover edit button tooltip)
- `lang.link.unlink` — `"Unlink"` (popover unlink button tooltip)
- `lang.link.link` — `"Link"` (toolbar Link button tooltip, via Buttons.js, prefix to shortcut)
- `lang.help['linkDialog.show']` — `"Show Link Dialog"` (help memo `help.linkDialog.show`)

---

### 12. Icons, shortcuts, tooltips

- Icons: `options.icons.link` = `'note-icon-link'`; `options.icons.unlink` = `'note-icon-chain-broken'`. Rendered via `ui.icon(className)` → `<i class="{className}"></i>` (unless className already starts with `<`).
- Keyboard shortcut: `CTRL+K` (pc) / `CMD+K` (mac) → `linkDialog.show` (settings.js keyMap). `representShortcut('linkDialog.show')` produces `" (CTRL+K)"` / `" (⌘K)"` (mac replaces `CMD`→`⌘`, `SHIFT`→`⇧`), appended to the toolbar Link tooltip. Returns `''` if `options.shortcuts` is false.
- Enter inside either dialog input also triggers submit (§5 `bindEnterKey`).

---

### 13. Options consumed (with defaults)

| Option | Default | Used by |
|---|---|---|
| `dialogsInBody` | `false` | dialog mount target |
| `dialogsFade` | `false` | dialog `fade` |
| `container` | `null` (resolved to editing area) | dialog/popover mount, popover positioning offset |
| `id` | per-editor unique | input/label id scoping |
| `disableLinkTarget` | `undefined` (→ checkbox shown) | whether the new-window checkbox renders |
| `linkTargetBlank` | `true` | default checkbox state when creating |
| `onCreateLink` | `undefined` | full URL normalization override (in both `checkLinkUrl` and `createLink`) |
| `linkAddNoReferrer` | `false` | add `rel=noreferrer` on new-window links |
| `linkAddNoOpener` / `addLinkNoOpener` | `false` (name mismatch — see §7) | add `rel=noopener` |
| `popover.link` | `[['link', ['linkDialogShow', 'unlink']]]` | popover buttons + `shouldInitialize` |
| `shortcuts` | `true` | enables `Ctrl/⌘+K` and tooltip suffix |
| `maxTextLength` (via `isLimited`) | `0` (unlimited) | blocks createLink if added text exceeds limit |
| `langInfo` / `langInfo.help['linkDialog.show']` | en-US | labels + help memo |
| `icons.link`, `icons.unlink` | `note-icon-link`, `note-icon-chain-broken` | button glyphs |

---

### 14. Non-obvious behavior / ordering / quirks (must preserve)

1. **saveRange before dialog, restoreRange before createLink** — focus moving to the dialog inputs destroys the editor selection; the captured `linkInfo.range` is what `createLink` operates on. Restore order: resolve → `restoreRange` → `createLink`; reject → `restoreRange` only.
2. **Submit button starts `disabled`** and is only enabled when **both** text and URL are non-empty.
3. **Text auto-mirror from URL** happens only while `linkInfo.text` is still empty; once the user types in the text field (or text was prefilled from selection), mirroring stops because `linkInfo.text` becomes truthy.
4. **Text field is HTML-escaped** via a detached `div.innerText → innerHTML` round-trip before being stored to `linkInfo.text` (prevents HTML injection through the display text). Preserve this sanitization in the port.
5. **`isNewWindow` precedence**: existing anchor's actual `target` (via `getLinkInfo`) wins; fallback to `linkTargetBlank`.
6. **`createLink` re-normalizes the URL** independently (`onCreateLink` or `checkLinkUrl`) even though the dialog already normalized on blur — double normalization is idempotent for these patterns.
7. **mailto/tel detection precedes scheme check** — a bare email becomes `mailto:`, a bare phone `tel:`, before the generic `http://` prefix rule.
8. **Touch devices skip auto-focus** of the URL field.
9. **Handlers are `.off()`-detached on dialog hide** and the submit is `.one('click')` + `.one(...)` for shown/hidden — re-opening rebinds fresh; no duplicate submissions.
10. **Popover hides on `summernote.dialog.shown`** (so opening the link dialog from the popover dismisses the popover); shows again on the next keyup/mouseup/change after the dialog closes if caret remains on an anchor.
11. **Popover stays open when clicking its own buttons** — both via `mousedown preventDefault` and the `blur.relatedTarget` containment check.
12. **Popover position is container-relative** (subtracts container offset), placed just below the anchor including margin.
13. **`note.modal.show`/`note.modal.hide`** are lite-theme one-shot events (`.one`). bs3/4/5 themes use Bootstrap's `shown.bs.modal`/`hidden.bs.modal` equivalents inside their `ui_template`. The React port must provide a single dialog abstraction exposing `onShown`/`onHidden`/`show`/`hide` regardless of theme.
14. **Option-name mismatch `linkAddNoOpener` vs `addLinkNoOpener`** is a real latent bug in the legacy source — `noopener` is effectively never auto-added with stock defaults. Decide and unify in the port.

Relevant source files (absolute): `c:\github\summernote-react\src\js\module\LinkDialog.js`, `c:\github\summernote-react\src\js\module\LinkPopover.js`, `c:\github\summernote-react\src\js\module\Editor.js` (`createLink` ~L197-256, `getLinkInfo` ~L923-944, `unlink` ~L900-912), `c:\github\summernote-react\src\js\module\Buttons.js` (`addLinkPopoverButtons` ~L718-734, `button.link` ~L570-576, `representShortcut` ~L18-34), `c:\github\summernote-react\src\js\core\func.js` (`isValidUrl` L171-174), `c:\github\summernote-react\src\js\core\dom.js` (`posFromPlaceholder` L1097-1106), `c:\github\summernote-react\src\js\settings.js` (popover/link/icon defaults, keyMap, `addLinkNoOpener` L116, `linkTargetBlank` L124), `c:\github\summernote-react\src\js\summernote-en-US.js` (`link.*` L52-59, `help['linkDialog.show']` L152), `c:\github\summernote-react\src\styles\lite\summernote-lite.js` (`checkbox` L637-648, `toggleBtn` L693-696, `onDialogShown/Hidden`/`showDialog`/`hideDialog` L707-721).

---

<!-- ===== image ===== -->
I now have a complete and faithful picture of all three files and every contract they touch. Here is the spec.

## ImageDialog, ImagePopover, Handle (image insertion, image popover, image resize handle)

This spec covers three legacy modules and every command, option, event, i18n key, icon, and DOM contract they depend on. The React+TS port must reproduce all behavior described here. All `context.invoke(...)` targets are documented with their argument shapes and the actual Editor implementation they resolve to. Where a class name, lang key, or default value is load-bearing it is given verbatim.

---

### 0. Shared infrastructure these modules rely on

**Module lifecycle contract** (every module is a default-exported class):
- `constructor(context)` — receives the Context. Reads `context.layoutInfo.*`, `context.options`, `context.options.langInfo`. Stores `this.ui = $.summernote.ui` (the theme UI factory instance — global, set per-Context).
- `shouldInitialize()` — optional; if it returns false the module is skipped for both `initialize` and `destroy`, and its `events` are NOT attached. Default (when absent) is "always true".
- `initialize()` — called once after ALL modules are constructed.
- `destroy()` — called in reverse registration order.
- `events = { 'summernote.<ns> summernote.<ns2>': (we, ...args) => {} }` — auto-subscribed via jQuery custom events on `$note`. The first handler arg `we` is the jQuery event wrapper; subsequent args are what `triggerEvent` passed.

**`context.invoke(namespace, ...args)`** routing (Context.js):
- `'editor.method'` → `modules.editor[method](...args)` (only if `editor.shouldInitialize()` is truthy — editor always is).
- bare `'method'` with no dot → Context's own method if it exists, else falls back to `modules.editor[method]`.
- e.g. `'imagePopover.update'` → `modules.imagePopover.update(...)`.

**`context.createInvokeHandler(namespace, value)`** returns a DOM event handler `(event) => {...}` that:
1. calls `event.preventDefault()`,
2. computes `$target = $(event.target)`,
3. invokes `this.invoke(namespace, value || $target.closest('[data-value]').data('value'), $target)`.
   → So if a literal `value` was baked in at memo time, that wins; otherwise the value is read from the nearest ancestor element carrying `data-value`. The clicked `$target` is always passed as the 3rd invoke arg.

**`context.triggerEvent(ns, ...args)`** dual-fires:
1. `options.callbacks['on'+CamelCase(ns)]` with `this === $note[0]` (raw DOM), args spread.
2. jQuery event `summernote.<ns>` on `$note` (args passed as the event's data array).

**`ui.toggleBtn($btn, isEnable)`** (lite): `$btn.toggleClass('disabled', !isEnable); $btn.attr('disabled', !isEnable);` — truthy `isEnable` enables, falsy disables.

---

## A. ImageDialog (`src/js/module/ImageDialog.js`)

The modal for inserting an image either by file selection or by URL.

### A.1 Constructor state
- `this.ui = $.summernote.ui`
- `this.$body = $(document.body)`
- `this.$editor = context.layoutInfo.editor`
- `this.options = context.options`
- `this.lang = options.langInfo`
- No `events`, no `shouldInitialize` → always initializes.

### A.2 `initialize()` — builds the dialog DOM

**Image-size limitation note** (only rendered if `options.maximumImageFileSize` is truthy):
- Computes a human-readable size:
  - `unit = Math.floor(Math.log(maximumImageFileSize) / Math.log(1024))`
  - `readableSize = (maximumImageFileSize / 1024^unit).toFixed(2) * 1 + ' ' + ' KMGTP'[unit] + 'B'`
    - Note the leading space in `' KMGTP'`: `unit===0` → index 0 = a space char, yielding e.g. `"1.50  B"` (two spaces); `unit===1` → `'K'` → `"... KB"`, etc.
    - `.toFixed(2) * 1` strips trailing zeros via numeric coercion (e.g. `2.00 → 2`, `1.50 → 1.5`).
  - `imageLimitation = '<small>' + lang.image.maximumFileSize + ' : ' + readableSize + '</small>'`

**Container** for the dialog: `options.dialogsInBody ? document.body : options.container`. (`options.container` defaults to `layoutInfo.editor` — see Context `_initialize`.)

**Body markup** (this module builds its own body string and passes it to `ui.dialog(...)`; it does NOT use the theme's `ui.imageDialog` helper):
```
<div class="form-group note-form-group note-group-select-from-files">
  <label for="note-dialog-image-file-{id}" class="note-form-label">{lang.image.selectFromFiles}</label>
  <input id="note-dialog-image-file-{id}" class="note-image-input form-control-file note-form-control note-input"
         type="file" name="files" accept="{options.acceptImageFileTypes}" multiple="multiple"/>
  {imageLimitation}
</div>
<div class="form-group note-group-image-url">
  <label for="note-dialog-image-url-{id}" class="note-form-label">{lang.image.url}</label>
  <input id="note-dialog-image-url-{id}" class="note-image-url form-control note-form-control note-input" type="text"/>
</div>
```
- `{id}` = `options.id` (a unique id assigned per Context in `_initialize`).
- File input classes: `note-image-input form-control-file note-form-control note-input`. (Note: the lite theme's own `imageDialog` helper uses a different class `note-note-image-input` and a hardcoded `accept="image/*"`, but THIS module always overrides with its own markup, so the authoritative file-input selector is **`.note-image-input`** and accept comes from `options.acceptImageFileTypes`.)
- URL input class: `note-image-url form-control note-form-control note-input`.

**Footer markup**:
```
<input type="button" href="#" class="btn btn-primary note-btn note-btn-primary note-image-btn" value="{lang.image.insert}" disabled>
```
- Insert button selector: **`.note-image-btn`**, starts `disabled`.

**Dialog construction**:
```
this.$dialog = ui.dialog({
  title: lang.image.insert,
  fade: options.dialogsFade,
  body: <body string above>,
  footer: <footer string above>,
}).render().appendTo($container);
```

**Rendered dialog skeleton** (from lite `dialog` renderer):
```
<div class="note-modal" aria-hidden="false" tabindex="-1" role="dialog" aria-label="{title}">  (+ "fade" class if options.dialogsFade)
  <div class="note-modal-content">
    <div class="note-modal-header">
      <button type="button" class="close" aria-label="Close" aria-hidden="true"><i class="note-icon-close"></i></button>
      <h4 class="note-modal-title">{title}</h4>
    </div>
    <div class="note-modal-body">{body}</div>
    <div class="note-modal-footer">{footer}</div>
  </div>
</div>
```
A `ModalUI` instance is stored at `$dialog.data('modal')`.

### A.3 `destroy()`
- `ui.hideDialog(this.$dialog)` then `this.$dialog.remove()`.

### A.4 `bindEnterKey($input, $btn)`
- Binds `keypress` on `$input`; when `event.keyCode === key.code.ENTER` (13): `preventDefault()` then `$btn.trigger('click')`.

### A.5 `show()` — entry point invoked by the toolbar "picture" button

Invoked via `context.invoke('imageDialog.show')` (toolbar `button.picture`, tooltip `lang.image.image`, icon `options.icons.picture` = `note-icon-picture`).

Flow:
1. `context.invoke('editor.saveRange')` — saves current selection. (Editor.saveRange only collapses if a truthy arg is passed; here no arg, so it is effectively a no-op beyond the contract; the real range preservation is via Editor's persistent `lastRange`, set on every focus/keyup/mouseup/paste. The port must persist the selection that existed before the dialog stole focus.)
2. `this.showImageDialog().then(data => {...}).fail(() => {...})` — opens the modal and resolves a Deferred with either a `FileList`/array of files or a URL string.
3. On resolve:
   - `ui.hideDialog(this.$dialog)` is called BEFORE restoring range. **Ordering constraint (IE quirk):** the comment says "hide dialog before restore range for IE range focus". Hide first, then restore.
   - `context.invoke('editor.restoreRange')` — re-selects `lastRange` and focuses editable.
   - If `typeof data === 'string'` (URL path):
     - If `options.callbacks.onImageLinkInsert` is set → `context.triggerEvent('image.link.insert', data)` (fires `onImageLinkInsert(url)` and `summernote.image.link.insert`). The host app is then responsible for inserting.
     - Else → `context.invoke('editor.insertImage', data)`.
   - Else (file selection) → `context.invoke('editor.insertImagesOrCallback', data)` where `data` is `FileList` or array.
4. On reject (dialog dismissed/closed without choosing): `context.invoke('editor.restoreRange')` only.

### A.6 `showImageDialog()` — returns a jQuery Deferred (Promise)

Resolves with file list OR url string; rejects on dismissal.

Lookups inside `$dialog`:
- `$imageInput = .note-image-input`
- `$imageUrl = .note-image-url`
- `$imageBtn = .note-image-btn`

**On dialog shown** (`ui.onDialogShown($dialog, handler)` = `$dialog.one('note.modal.show', handler)`):
1. `context.triggerEvent('dialog.shown')` (fires `onDialogShown` + `summernote.dialog.shown`). Note: this event also causes ImagePopover and Handle to hide (see their event maps).
2. **File input is cloned to clear it**: `$imageInput.replaceWith($imageInput.clone().on('change', event => deferred.resolve(event.target.files || event.target.value)).val(''))`.
   - Why clone+replace: guarantees a fresh element with no stale value and exactly one change listener each time the dialog opens. The port must reset the file input on each open.
   - On `change`: resolves with `event.target.files` (a `FileList`) if present, else `event.target.value` (string fallback — legacy browsers).
3. **URL input live-enable**: `$imageUrl.on('input paste propertychange', () => ui.toggleBtn($imageBtn, $imageUrl.val())).val('')`.
   - The insert button is enabled iff the URL field is non-empty. Cleared (`.val('')`) on open.
4. **Autofocus**: `if (!env.isSupportTouch) $imageUrl.trigger('focus');` — focus the URL field on non-touch devices only.
5. **Insert button click**: `$imageBtn.on('click', event => { event.preventDefault(); deferred.resolve($imageUrl.val()); })` — resolves with the URL string.
6. `bindEnterKey($imageUrl, $imageBtn)` — Enter in URL field triggers the insert button.

**On dialog hidden** (`ui.onDialogHidden($dialog, handler)` = `$dialog.one('note.modal.hide', handler)`):
- `$imageInput.off(); $imageUrl.off(); $imageBtn.off();` — remove all listeners.
- If `deferred.state() === 'pending'` → `deferred.reject()` (dismissed without choosing → triggers the `.fail` path = restore range only).

**Finally**: `ui.showDialog(this.$dialog)` = `$dialog.data('modal').show()`.

**ModalUI.show()** (lite) behavior the port must reproduce:
- Appends a `<div class="note-modal-backdrop"></div>` to body and shows it.
- `$modal.addClass('open').show()`.
- Triggers `note.modal.show` (this is what fires `onDialogShown` handler).
- Binds close: clicking `.close` calls hide.
- Binds `keydown`: `Escape` (which===27) → preventDefault + hide.

**ModalUI.hide()**: removes `open` class, hides modal + backdrop, triggers `note.modal.hide`, unbinds keydown.

### A.7 Options consumed by ImageDialog (with defaults from settings.js)
| Option | Default | Use |
|---|---|---|
| `maximumImageFileSize` | `null` | If set, renders the "Maximum file size : X" note and (in Editor) rejects oversized files. |
| `acceptImageFileTypes` | `"image/*"` | `accept` attr of the file input. |
| `dialogsInBody` | `false` | If true, dialog appended to `document.body` instead of `options.container`. |
| `dialogsFade` | `false` | Adds `fade` class to the modal. |
| `container` | `null` → `layoutInfo.editor` | Default dialog mount point. |
| `id` | per-Context unique | Suffix for input/label ids. |
| `callbacks.onImageLinkInsert` | `null` | If set, URL inserts route to host callback instead of `editor.insertImage`. |

### A.8 i18n keys referenced by ImageDialog
- `lang.image.maximumFileSize` ("Maximum file size")
- `lang.image.selectFromFiles` ("Select from files")
- `lang.image.url` ("Image URL")
- `lang.image.insert` ("Insert Image") — used for both the dialog title and the insert button value.

### A.9 Icons referenced
- `note-icon-close` (in the modal header close button, supplied by the dialog renderer).
- The toolbar trigger uses `options.icons.picture` = `note-icon-picture` (defined in Buttons, not ImageDialog).

### A.10 Editor commands behind ImageDialog (argument shapes + behavior)

These are the actual implementations that `show()` invokes. The port reimplements these on its own editor engine (without `execCommand`).

**`editor.insertImage(src, param)`** → `insertImage(src, param)`:
- `param` here is the URL string path: only `src` is passed (`param` undefined).
- Uses `createImage(src)` (async helper): creates a hidden `<img>` appended to `document.body`, resolves on `load`, rejects on `error`/`abort`. The port must asynchronously preload to learn natural dimensions.
- On resolve:
  - `beforeCommand()` (snapshot/before.command + focus).
  - Since `param` is not a function and not a string here → `$image.css('width', Math.min($editable.width(), $image.width()))`. **Inserted images are clamped to the editable's width** (never wider than the editor).
  - `$image.show()`, insert at `getLastRange().insertNode($image[0])`, set selection after the image (`range.createFromNodeAfter($image[0]).select()`), `afterCommand()` (records undo + fires `change`).
- On failure: `context.triggerEvent('image.upload.error', e)`.

**`editor.insertImagesOrCallback(files)`** → `insertImagesOrCallback(files)`:
- `files` is a FileList/array.
- If `options.callbacks.onImageUpload` is set → `context.triggerEvent('image.upload', files)` (fires `onImageUpload(files)` and `summernote.image.upload`). The HOST is responsible for uploading and then calling `insertImage(url)` itself. **insertImagesAsDataURL is NOT called in this branch.**
- Else → `insertImagesAsDataURL(files)`.

**`editor.insertImagesAsDataURL(files)`** → `insertImagesAsDataURL(files)`:
- For each `file`:
  - `filename = file.name`.
  - If `options.maximumImageFileSize && options.maximumImageFileSize < file.size` → `context.triggerEvent('image.upload.error', lang.image.maximumFileSizeError)` and skip.
  - Else → `readFileAsDataURL(file).then(dataURL => insertImage(dataURL, filename)).fail(() => triggerEvent('image.upload.error'))`.
- `readFileAsDataURL(file)` (async helper): wraps a `FileReader.readAsDataURL`; resolves with the data URL on load, rejects on error.
- In `insertImage(dataURL, filename)` here `param === filename` (a string): so `$image.attr('data-filename', filename)` is set AND the width-clamp branch runs (`$image.css('width', Math.min(editableWidth, naturalWidth))`). **DataURL-inserted images get a `data-filename` attribute.**

**Related events fired by these commands** (the port must emit equivalents):
- `image.upload` (files) — when host upload callback exists.
- `image.upload.error` (message or error) — oversize, read failure, or load failure.
- `image.link.insert` (url) — URL path when `onImageLinkInsert` is set.

---

## B. ImagePopover (`src/js/module/ImagePopover.js`)

The floating popover shown over a selected image, holding resize/float/remove buttons. Positioning/visibility is DRIVEN BY Handle.js, which calls `imagePopover.update(target, event)`.

### B.1 Constructor state
- `this.ui = $.summernote.ui`
- `this.editable = context.layoutInfo.editable[0]`
- `this.options = context.options`
- `this.events`:
  - `'summernote.disable summernote.dialog.shown'` → `this.hide()` — hide when editor disabled or any dialog opens.
  - `'summernote.blur'` → on blur, hide UNLESS the related target (the element receiving focus) is inside the popover. Logic:
    ```
    if (event.originalEvent && event.originalEvent.relatedTarget) {
      if (!this.$popover[0].contains(event.originalEvent.relatedTarget)) this.hide();
    } else {
      this.hide();
    }
    ```
    → Clicking a popover button (which moves focus into the popover) must NOT hide it; blurring elsewhere hides it.

### B.2 `shouldInitialize()`
- `return !lists.isEmpty(this.options.popover.image)` — only initialize if the image popover config is non-empty (default config IS non-empty, so it initializes by default).

### B.3 `initialize()`
- Renders the popover and appends to `options.container`:
  ```
  this.$popover = ui.popover({ className: 'note-image-popover' }).render().appendTo(options.container);
  ```
- **Rendered popover markup** (lite `popover` renderer):
  ```
  <div class="note-popover bottom note-image-popover">
    <div class="note-popover-arrow"></div>
    <div class="popover-content note-children-container"></div>
  </div>
  ```
  - Starts hidden (`.hide()`), with `bottom` direction class.
- Finds the content area: `$content = this.$popover.find('.popover-content,.note-popover-content')` (matches either class; lite uses `.popover-content`).
- **Builds the buttons**: `context.invoke('buttons.build', $content, options.popover.image)`.
  - `buttons.build($container, groups)` iterates the `[groupName, [buttonNames...]]` tuples. For each group it creates `<div class="note-{groupName}"></div>` (a `note-btn-group`) and appends each memoized button `button.{name}`. So with default config you get groups `note-resize`, `note-float`, `note-remove`.
- `this.$popover.on('mousedown', event => event.preventDefault())` — prevents the popover mousedown from collapsing/moving the editor selection (keeps the image selected when a button is pressed).

### B.4 `destroy()`
- `this.$popover.remove()`.

### B.5 `update(target, event)` — show/position the popover

Called by Handle.update (which is itself called on mousedown/keyup/scroll/change/dialog.shown/codeview.toggled). Behavior:
- If `dom.isImg(target)` (target is an `IMG` element):
  - `position = $(target).offset()` (document-relative top/left of the image).
  - `containerOffset = $(options.container).offset()`.
  - Position model:
    - If `options.popatmouse` (default `true`): `pos = { left: event.pageX - 20, top: event.pageY }` — popover follows the mouse, offset 20px left.
    - Else: `pos = position` (anchored to the image's top-left).
  - Convert to container-relative: `pos.top -= containerOffset.top; pos.left -= containerOffset.left;`.
  - `this.$popover.css({ display: 'block', left: pos.left, top: pos.top })`.
- Else → `this.hide()`.

> Note: when `popatmouse` is true and `update` is called WITHOUT an event (e.g. from Handle's keyup/scroll/change-driven `update()` with no args), `event` is undefined and `event.pageX` would throw. In practice Handle only calls `imagePopover.update(target, event)` with both args set inside its own `update(target, event)`, and the no-arg `update()` calls reach Handle.update → which calls `imagePopover.update(undefined, undefined)` → `dom.isImg(undefined)` is false → `hide()` (the `else` branch), so the throwing path is not hit. The port must preserve this: only read `event.pageX/pageY` when target is an image AND an event is present; otherwise hide.

### B.6 `hide()`
- `this.$popover.hide()`.

### B.7 Options consumed
| Option | Default | Use |
|---|---|---|
| `popover.image` | `[['resize',['resizeFull','resizeHalf','resizeQuarter','resizeNone']], ['float',['floatLeft','floatRight','floatNone']], ['remove',['removeMedia']]]` | Button groups; empty disables the popover. |
| `popatmouse` | `true` | Popover follows the mouse (offset 20px left) vs. anchored to image top-left. |
| `container` | `layoutInfo.editor` | Mount point + offset reference. |

### B.8 Events the popover listens to / triggers
- Listens: `summernote.disable`, `summernote.dialog.shown` (→ hide), `summernote.blur` (→ conditional hide).
- Does not trigger events itself; its buttons invoke Editor commands.

### B.9 Image-popover button factories (defined in Buttons.addImagePopoverButtons) — the per-button commands

Each button is registered as a Context memo `button.{name}` and rendered into the popover. Tooltips come from lang; icons from `options.icons`; the click handler is `context.createInvokeHandler('editor.{cmd}', '{literal value}')`.

| Button memo | Contents / icon | Tooltip (lang key) | Click → invoke | Arg |
|---|---|---|---|---|
| `button.resizeFull` | `<span class="note-fontsize-10">100%</span>` | `lang.image.resizeFull` | `editor.resize` | `'1'` |
| `button.resizeHalf` | `<span class="note-fontsize-10">50%</span>` | `lang.image.resizeHalf` | `editor.resize` | `'0.5'` |
| `button.resizeQuarter` | `<span class="note-fontsize-10">25%</span>` | `lang.image.resizeQuarter` | `editor.resize` | `'0.25'` |
| `button.resizeNone` | icon `options.icons.rollback` (`note-icon-rollback`) | `lang.image.resizeNone` ("Original size") | `editor.resize` | `'0'` |
| `button.floatLeft` | icon `options.icons.floatLeft` (`note-icon-float-left`) | `lang.image.floatLeft` | `editor.floatMe` | `'left'` |
| `button.floatRight` | icon `options.icons.floatRight` (`note-icon-float-right`) | `lang.image.floatRight` | `editor.floatMe` | `'right'` |
| `button.floatNone` | icon `options.icons.rollback` (`note-icon-rollback`) | `lang.image.floatNone` ("Remove float") | `editor.floatMe` | `'none'` |
| `button.removeMedia` | icon `options.icons.trash` (`note-icon-trash`) | `lang.image.remove` | `editor.removeMedia` | (none) |

Each rendered button is `<button type="button" class="note-btn" tabindex="-1" aria-label="{tooltip}">...contents...</button>` (lite `button` renderer; tooltip is wired to a `TooltipUI` only when a container is present, and `tooltip` is dropped entirely if `options.tooltip` is falsy).

### B.10 Editor commands behind the popover buttons (argument shapes + exact effect)

All three are `wrapCommand`-wrapped (so each runs `beforeCommand()` → fn → `afterCommand()`: snapshot, normalize, record undo, fire `change`). The target image is the one saved by Handle via `editor.saveTarget` (stored at `$editable.data('target')`), retrieved via `restoreTarget()`.

**`editor.resize(value)`** → `this.resize`:
```
const $target = $(this.restoreTarget());
value = parseFloat(value);
if (value === 0) {
  $target.css('width', '');           // '0' (resizeNone) → clear inline width → revert to natural/original size
} else {
  $target.css({ width: value*100 + '%', height: '' });  // '1'→100%, '0.5'→50%, '0.25'→25%; height cleared to keep ratio
}
```
- So the resize buttons set the width as a PERCENTAGE of the containing block, and clear height. The "Original size" button removes the inline width entirely.

**`editor.floatMe(value)`** → `this.floatMe`:
```
const $target = $(this.restoreTarget());
$target.toggleClass('note-float-left',  value === 'left');
$target.toggleClass('note-float-right', value === 'right');
$target.css('float', value === 'none' ? '' : value);
```
- Adds/removes `note-float-left` / `note-float-right` classes AND sets the inline `float` CSS (`'none'` clears it). Both class and inline style are applied. The port must add both the class and the float style.

**`editor.removeMedia()`** → `this.removeMedia`:
```
let $target = $(this.restoreTarget()).parent();
if ($target.closest('figure').length) {
  $target.closest('figure').remove();     // if image lives in a <figure>, remove the whole figure
} else {
  $target = $(this.restoreTarget()).detach();  // else detach the image itself
}
this.setLastRange(range.createFromSelection($target).select());
this.context.triggerEvent('media.delete', $target, this.$editable);
```
- Removes the image (or its enclosing `<figure>`), repositions the caret, and fires `media.delete` (callback `onMediaDelete($target, $editable)` + `summernote.media.delete`). Note the dangling reference to `$target.parent()` first — but figure removal uses `.closest('figure')` from the parent, image-only removal re-fetches `restoreTarget()`.

### B.11 i18n keys referenced (via the button factories)
- `lang.image.resizeFull`, `lang.image.resizeHalf`, `lang.image.resizeQuarter`, `lang.image.resizeNone`, `lang.image.floatLeft`, `lang.image.floatRight`, `lang.image.floatNone`, `lang.image.remove`.

### B.12 Icons referenced (via button factories)
- `options.icons.rollback` = `note-icon-rollback` (resizeNone, floatNone)
- `options.icons.floatLeft` = `note-icon-float-left`
- `options.icons.floatRight` = `note-icon-float-right`
- `options.icons.trash` = `note-icon-trash` (removeMedia)
- (resizeFull/Half/Quarter use literal text spans, no icon.)

---

## C. Handle (`src/js/module/Handle.js`)

The selection overlay drawn over an image: a sizing box with corner control handles, a size-info readout, and the drag-to-resize interaction. It also drives ImagePopover visibility and saves the active image target.

### C.1 Constructor state
- `this.$document = $(document)`
- `this.$editingArea = context.layoutInfo.editingArea`
- `this.options = context.options`
- `this.lang = options.langInfo`
- `this.events`:
  - `'summernote.mousedown'` `(we, e)` → `if (this.update(e.target, e)) e.preventDefault();` — on editable mousedown, update the handle; if the mousedown landed on an image, prevent default (stops the browser's native image drag/select).
  - `'summernote.keyup summernote.scroll summernote.change summernote.dialog.shown'` → `this.update()` (no args → recompute/hide).
  - `'summernote.disable summernote.blur'` → `this.hide()`.
  - `'summernote.codeview.toggled'` → `this.update()`.

### C.2 `initialize()` — builds the handle overlay DOM

```
this.$handle = $([
  '<div class="note-handle">',
    '<div class="note-control-selection">',
      '<div class="note-control-selection-bg"></div>',
      '<div class="note-control-holder note-control-nw"></div>',
      '<div class="note-control-holder note-control-ne"></div>',
      '<div class="note-control-holder note-control-sw"></div>',
      '<div class="{sizingClass} note-control-se"></div>',
      {infoDiv}
    '</div>',
  '</div>',
].join('')).prependTo(this.$editingArea);
```
- **There are exactly 4 corner controls**: `note-control-nw`, `note-control-ne`, `note-control-sw`, `note-control-se`. (NW/NE/SW are `note-control-holder` decorative dots; only the SE corner is interactive.)
- The SE corner class is conditional:
  - If `options.disableResizeImage` → `note-control-holder note-control-se` (non-interactive; just a dot like the others).
  - Else → `note-control-sizing note-control-se` (the draggable resize grip — `dom.isControlSizing` matches `.note-control-sizing`).
- **Info readout div** (`note-control-selection-info`) is rendered ONLY if `!options.disableResizeImage`. If resizing is disabled, no info div at all.
- `note-control-selection-bg` is a background fill element behind the box.
- The whole handle is `prependTo` the editing area (so it overlays absolutely-positioned over the content).

### C.3 SE-corner drag-to-resize: `this.$handle.on('mousedown', ...)`

Triggered when mousedown lands on an element where `dom.isControlSizing(event.target)` (i.e., the `.note-control-sizing` SE grip):
1. `event.preventDefault(); event.stopPropagation();`
2. `$target = this.$handle.find('.note-control-selection').data('target')` — the jQuery-wrapped image saved by `update()`.
3. `posStart = $target.offset()` — the image's document-relative top/left at drag start.
4. `scrollTop = this.$document.scrollTop()` — captured once at drag start.
5. Defines `onMouseMove(event)`:
   ```
   this.context.invoke('editor.resizeTo', {
     x: event.clientX - posStart.left,
     y: event.clientY - (posStart.top - scrollTop),
   }, $target, !event.shiftKey);
   this.update($target[0], event);
   ```
   - **Resize geometry**: the new size is computed from the pointer's viewport coordinates minus the image's top-left, with the y baseline corrected by the scroll offset captured at drag start. So:
     - `x = event.clientX - posStart.left` → the new desired WIDTH (distance from image left edge to cursor).
     - `y = event.clientY - (posStart.top - scrollTop)` → the new desired HEIGHT (distance from image top edge to cursor, page-scroll corrected).
   - **`!event.shiftKey` = keep aspect ratio.** Holding Shift while dragging breaks the ratio (free resize); without Shift, ratio is preserved. (Argument name in Editor is `bKeepRatio`.)
   - After each move it re-runs `this.update($target[0], event)` to redraw the overlay box and the size info.
6. Binds the drag listeners on `document`:
   ```
   this.$document
     .on('mousemove', onMouseMove)
     .one('mouseup', (e) => {
       e.preventDefault();
       this.$document.off('mousemove', onMouseMove);
       this.context.invoke('editor.afterCommand');  // record undo + fire change, ONCE at drag end
     });
   ```
   - **Important: undo is recorded once at mouseup** (`editor.afterCommand`), not on every mousemove. The resize itself (`resizeTo`) does NOT go through before/afterCommand per move — only the final `afterCommand` snapshots. The port must mirror: live resize during drag, single history entry on release, fire `change` once.
7. **Original aspect ratio capture**: `if (!$target.data('ratio')) $target.data('ratio', $target.height() / $target.width());` — captures `height/width` once and caches it on the image, used by `resizeTo` for ratio-preserving math.

### C.4 Wheel handling on the overlay
- `this.$handle.on('wheel', event => { event.preventDefault(); this.update(); })` — scrolling over the overlay is captured (prevents the page from scrolling under the floating handle) and forces a reposition/hide.

### C.5 `destroy()`
- `this.$handle.remove()`.

### C.6 `update(target, event)` — position the overlay and sync popover/target

Returns a boolean (`isImage`). Behavior:
1. `if (context.isDisabled()) return false;` — never show overlay when the editor is read-only.
2. `isImage = dom.isImg(target)`; `$selection = this.$handle.find('.note-control-selection')`.
3. **Always** forwards to the popover: `context.invoke('imagePopover.update', target, event)`. (So Handle is the single driver of ImagePopover visibility/positioning.)
4. If `isImage`:
   - `$image = $(target)`.
   - `areaRect = $editingArea[0].getBoundingClientRect()`; `imageRect = target.getBoundingClientRect()`.
   - **Overlay box positioning** (editing-area-relative, using viewport rects so it tracks scroll/zoom correctly):
     ```
     $selection.css({
       display: 'block',
       left:  imageRect.left - areaRect.left,
       top:   imageRect.top  - areaRect.top,
       width:  imageRect.width,
       height: imageRect.height,
     }).data('target', $image);   // cache the active image for the drag handler
     ```
   - **Original-size readout**: creates a detached `new Image()` with `src = $image.attr('src')` to read the natural pixel size (`origImageObj.width/height`), then:
     ```
     sizingText = imageRect.width + 'x' + imageRect.height + ' (' + lang.image.original + ': ' + origImageObj.width + 'x' + origImageObj.height + ')';
     $selection.find('.note-control-selection-info').text(sizingText);
     ```
     - Format: `"{currentW}x{currentH} (Original: {naturalW}x{naturalH})"`. (Note: `new Image()` may not have loaded synchronously, so natural dims can read 0 immediately after assigning src; this is a known limitation reproduced as-is. Port may read `naturalWidth/naturalHeight` on the already-loaded editable image instead.)
   - `context.invoke('editor.saveTarget', target)` — store the raw image node at `$editable.data('target')` so popover/resize commands can act on it.
   - returns `isImage` (true).
5. Else (`target` is not an image, e.g. `update()` called with no args): `this.hide()`; returns false.

### C.7 `hide()`
- `context.invoke('editor.clearTarget')` — `$editable.removeData('target')`.
- `this.$handle.children().hide()` — hide the `.note-control-selection` (and thus the whole overlay contents).

### C.8 Editor commands behind Handle

**`editor.resizeTo(pos, $target, bKeepRatio)`** → `resizeTo(pos, $target, bKeepRatio)`:
```
if (bKeepRatio) {
  const newRatio = pos.y / pos.x;
  const ratio = $target.data('ratio');           // original height/width captured at drag start
  imageSize = {
    width:  ratio > newRatio ? pos.x      : pos.y / ratio,
    height: ratio > newRatio ? pos.x*ratio: pos.y,
  };
} else {
  imageSize = { width: pos.x, height: pos.y };   // free resize (Shift held)
}
$target.css(imageSize);
```
- Ratio-preserving math (when Shift NOT held): compares the drag's current ratio (`pos.y/pos.x`) to the image's original ratio. Whichever dimension is the "binding" one drives the other so the image keeps its aspect ratio. Sets inline `width`/`height` in px.
- Free resize (Shift held): width = pos.x, height = pos.y directly.
- Note: this command is NOT wrapped in before/afterCommand — it directly mutates inline styles during drag. The single undo snapshot is taken by Handle calling `editor.afterCommand` on mouseup.

**`editor.afterCommand()`** (called once at drag end): `normalizeContent()` (`editable.normalize()`), `history.recordUndo()`, and (no isPreventTrigger arg) `triggerEvent('change', editable.html(), $editable)`.

**`editor.saveTarget(node)`**: `$editable.data('target', node)`.
**`editor.clearTarget()`**: `$editable.removeData('target')`.
**`editor.restoreTarget()`**: returns `$editable.data('target')` (used by popover commands).

### C.9 Options consumed by Handle
| Option | Default | Use |
|---|---|---|
| `disableResizeImage` | (not in settings.js defaults → `undefined`/falsy) | If truthy: SE corner is a non-interactive dot, no size-info div, no drag-resize. |
| `container` | `layoutInfo.editor` | (indirectly, via imagePopover.update). |

> `disableResizeImage` is not present in `settings.js` defaults, so it is effectively `false`/undefined unless the host sets it. The port should default it to `false`.

### C.10 i18n keys referenced by Handle
- `lang.image.original` ("Original") — in the size-info readout.

### C.11 DOM class names produced by Handle (for the port's markup + CSS)
- `note-handle` (root overlay container)
- `note-control-selection` (the resizable box; carries `data('target')`)
- `note-control-selection-bg`
- `note-control-holder` + corner classes `note-control-nw` / `note-control-ne` / `note-control-sw`
- SE grip: `note-control-sizing note-control-se` (interactive) or `note-control-holder note-control-se` (disabled)
- `note-control-selection-info` (size readout; only when resize enabled)

---

## D. Cross-cutting flow & ordering constraints (must preserve in the port)

1. **Single image-selection driver**: Handle is the only module that positions the overlay AND tells ImagePopover when/where to show. ImagePopover never reads the selection itself — it is a passive recipient of `imagePopover.update(target, event)`. Keep this one-way dependency.
2. **Target hand-off**: the active image is stored exactly once via `editor.saveTarget` (in Handle.update) and read via `editor.restoreTarget` by every popover command (`resize`/`floatMe`/`removeMedia`). The port needs a single "current media target" slot owned by the editor.
3. **Resize history**: live mutation during drag, one undo entry + one `change` event on mouseup (`editor.afterCommand`). Do not snapshot per mousemove.
4. **Aspect-ratio toggle**: Shift = free resize, no Shift = keep ratio. Ratio captured once per image (`data('ratio') = height/width`) and cached.
5. **Dialog IE ordering**: hide the dialog BEFORE restoring the editor range/focus.
6. **File-input reset**: clone+replace (or otherwise fully reset) the file input every time the dialog opens so a re-pick of the same file still fires `change` and stale values are cleared.
7. **URL insert button gating**: enabled iff URL field non-empty (`input`/`paste` listeners), and disabled at start.
8. **Insert routing branches**:
   - URL + `onImageLinkInsert` set → host callback (`image.link.insert`), no auto-insert.
   - URL otherwise → `editor.insertImage(url)`.
   - Files + `onImageUpload` set → host callback (`image.upload`), no auto-insert.
   - Files otherwise → data-URL insert, with per-file `maximumImageFileSize` check (`maximumFileSizeError`) and `data-filename` attribution.
9. **Inserted image width clamp**: data-URL/URL inserts clamp inline width to `min(editableWidth, naturalWidth)`. Resize-buttons then express width as percentages; "Original size" clears inline width.
10. **Popover dismissal**: hides on `disable`, any `dialog.shown`, and on blur to anything outside the popover. The popover's own `mousedown` is `preventDefault`-ed so clicking a button does not collapse the editor selection / hide the popover.
11. **Disabled editor**: `Handle.update` returns false and shows nothing when `context.isDisabled()`; popover also hides on `summernote.disable`.

---

## E. Complete reference lists for these three modules

**All `context.invoke` targets used (with arg shapes):**
- `editor.saveRange` () — ImageDialog.show
- `editor.restoreRange` () — ImageDialog.show (both then/fail)
- `editor.insertImage` (src:string) — URL insert
- `editor.insertImagesOrCallback` (files: FileList|File[]) — file insert
- `imagePopover.update` (target:Node|undefined, event:Event|undefined) — Handle.update
- `buttons.build` ($content:jQuery, groups:Array) — ImagePopover.initialize
- `editor.resize` (value:string ∈ {'1','0.5','0.25','0'}) — popover resize buttons
- `editor.floatMe` (value:string ∈ {'left','right','none'}) — popover float buttons
- `editor.removeMedia` () — popover remove button
- `editor.resizeTo` (pos:{x,y}, $target:jQuery, bKeepRatio:boolean) — Handle drag
- `editor.afterCommand` () — Handle mouseup
- `editor.saveTarget` (node:Node) — Handle.update
- `editor.clearTarget` () — Handle.hide
- (`editor.restoreTarget` () is called internally by the resize/float/remove Editor methods, not via invoke.)

**All `triggerEvent` (summernote.* + callback) emitted in these flows:**
- `dialog.shown` (→ onDialogShown) — dialog open
- `image.link.insert` (url) (→ onImageLinkInsert) — URL path with host callback
- `image.upload` (files) (→ onImageUpload) — file path with host callback
- `image.upload.error` (msg|err) (→ onImageUploadError) — oversize / read / load fail
- `media.delete` ($target, $editable) (→ onMediaDelete) — removeMedia
- `change` (html, $editable) (→ onChange) — via afterCommand after resize/float/remove/insert

**DOM custom events these modules bind/emit (jQuery namespaced):**
- ImageDialog: `note.modal.show`, `note.modal.hide` (via ui.onDialogShown/onDialogHidden); inputs: `keypress`, `change`, `input paste propertychange`, `click`.
- ImagePopover listens: `summernote.disable`, `summernote.dialog.shown`, `summernote.blur`; binds `mousedown` (preventDefault) on the popover.
- Handle listens: `summernote.mousedown`, `summernote.keyup`, `summernote.scroll`, `summernote.change`, `summernote.dialog.shown`, `summernote.disable`, `summernote.blur`, `summernote.codeview.toggled`; binds `mousedown`/`wheel` on the handle and `mousemove`/`mouseup` on `document` during drag.

**All i18n keys (these three modules):** `image.maximumFileSize`, `image.maximumFileSizeError`, `image.selectFromFiles`, `image.url`, `image.insert`, `image.resizeFull`, `image.resizeHalf`, `image.resizeQuarter`, `image.resizeNone`, `image.floatLeft`, `image.floatRight`, `image.floatNone`, `image.remove`, `image.original`, `image.image` (toolbar trigger tooltip).

**All icon class names:** `note-icon-close` (dialog header), `note-icon-picture` (toolbar trigger), `note-icon-rollback` (resizeNone/floatNone), `note-icon-float-left`, `note-icon-float-right`, `note-icon-trash` (removeMedia).

**Keyboard:** Enter in the URL field → insert (ImageDialog.bindEnterKey). Escape closes the modal (ModalUI keydown which===27). Shift during SE-drag → free resize. No dedicated toolbar shortcut for the image dialog (the picture button has no keyMap entry).

Source files read in full: `src/js/module/ImageDialog.js`, `src/js/module/ImagePopover.js`, `src/js/module/Handle.js`. Supporting contracts verified in `src/js/module/Editor.js`, `src/js/module/Buttons.js` (image popover button factories + `build`), `src/js/core/async.js` (`readFileAsDataURL`/`createImage`), `src/js/settings.js` (option defaults + icons + `popover.image`/`popatmouse`), `src/js/summernote-en-US.js` (lang.image), `src/js/Context.js` (invoke/triggerEvent/createInvokeHandler), `src/js/renderer.js`, `src/styles/lite/summernote-lite.js` (dialog/popover/button/icon/toggleBtn/onDialogShown), `src/styles/lite/js/ModalUI.js`, and `src/js/core/dom.js` (`isImg`, `isControlSizing`).

---

<!-- ===== video-help ===== -->
I now have full context. Producing the spec.

## VideoDialog and HelpDialog — Faithful Port Spec

This spec covers `src/js/module/VideoDialog.js` and `src/js/module/HelpDialog.js` exhaustively. Both are default-export ES6 module classes following the standard module contract (`constructor(context)`, `initialize()`, `destroy()`, plus a public `show()` invoked by toolbar/keymap). Neither defines `shouldInitialize()` or an `events` object.

---

# Shared module contract (both dialogs)

### Constructor (`constructor(context)`)
Both store the same fields off `context`:
- `this.context = context`
- `this.ui = $.summernote.ui` — the global theme UI factory (cached at construction; see CLAUDE.md "global ui" gotcha). In the port, replace with the injected theme UI instance.
- `this.$body = $(document.body)`
- `this.$editor = context.layoutInfo.editor` — the editor root element. (Stored by both; **not actually used** in either file's logic except as a held reference. Keep parity but note it is dead in these two modules.)
- `this.options = context.options`
- `this.lang = this.options.langInfo` — the resolved language pack object (already merged/resolved before module construction). i18n keys below are read from `this.lang.*`.

### Container resolution (both `initialize()`)
```
const $container = this.options.dialogsInBody ? this.$body : this.options.container;
```
- `options.dialogsInBody` default **`false`** → dialog appended to `options.container`.
- `options.container` default is the editor container (`.note-editor` / editing area). When `dialogsInBody` is true, the dialog is appended to `document.body` instead. This matters for stacking/z-index and for `dialogsInBody` form `id` scoping.

### Dialog construction (both)
Created via `this.ui.dialog({...}).render().appendTo($container)` and the returned jQuery element stored as `this.$dialog`. The `ui.dialog` factory options used:
- `title` (string)
- `fade: this.options.dialogsFade` — default **`false`**. Controls CSS fade transition class on the modal.
- `body` (HTML string or jQuery)
- `footer` (HTML string)
- `callback` (function, **HelpDialog only**) — invoked with the rendered `$node` after render.

### `destroy()` (both, identical pattern)
```
this.ui.hideDialog(this.$dialog);
this.$dialog.remove();
```
Hide first (runs theme hide logic / removes backdrop), then remove the DOM node.

### Dialog lifecycle helpers consumed from `this.ui`
- `ui.dialog(opts)` → returns renderer; `.render()` → builds jQuery node; `.appendTo($container)`.
- `ui.showDialog($dialog)` — opens modal.
- `ui.hideDialog($dialog)` — closes modal.
- `ui.onDialogShown($dialog, fn)` — registers a one-time "shown" callback (fires after open animation/visible).
- `ui.onDialogHidden($dialog, fn)` — registers a one-time "hidden" callback (fires after close).
- `ui.toggleBtn($btn, enabledBool)` — enables/disables a button (truthy → enabled).

### Range save/restore pattern (both `show()`)
Both call `editor.saveRange` before showing (focus moves to the dialog input, destroying the selection) and `editor.restoreRange` after. See per-module flow.

---

# `## VideoDialog`

## DOM markup (`initialize()`)

**Body HTML** (string, joined with `''`):
```html
<div class="form-group note-form-group row-fluid">
  <label for="note-dialog-video-url-{id}" class="note-form-label">{lang.video.url} <small class="text-muted">{lang.video.providers}</small></label>
  <input id="note-dialog-video-url-{id}" class="note-video-url form-control note-form-control note-input" type="text"/>
</div>
```
- `{id}` = `this.options.id` — a per-editor unique id (used to namespace the input `id`/`for` so multiple editors on a page don't collide).
- `{lang.video.url}` and `{lang.video.providers}` are i18n-interpolated into the label.

**Footer HTML**:
```html
<input type="button" href="#" class="btn btn-primary note-btn note-btn-primary note-video-btn" value="{lang.video.insert}" disabled>
```
- `buttonClass` literal = `'btn btn-primary note-btn note-btn-primary note-video-btn'`.
- Button starts **`disabled`** (enabled only when the URL field is non-empty).

**Dialog options**:
- `title: this.lang.video.insert`
- `fade: this.options.dialogsFade`
- `body`, `footer` as above.

### Class names (.note-*) used
- `.note-form-group` (+ `form-group`, `row-fluid`)
- `.note-form-label`
- `.note-video-url` (+ `form-control`, `note-form-control`, `note-input`) — the URL `<input>`
- `.note-video-btn` (+ `btn`, `btn-primary`, `note-btn`, `note-btn-primary`) — the insert button
- `.note-video-clip` — added to every successfully created video node (see `createVideoNode`)
- `.vine-embed` — added to Vine iframes (also via `createVideoNode`)

### i18n keys referenced
- `lang.video.url` → "Video URL"
- `lang.video.providers` → "(YouTube, Google Drive, Vimeo, Vine, Instagram, DailyMotion, Youku, Peertube)"
- `lang.video.insert` → "Insert Video" (used for both dialog `title` and button `value`)

(For completeness, the `video` langpack block also has `video`, `videoLink` keys, but VideoDialog itself only consumes `url`, `providers`, `insert`. The toolbar button label/tooltip uses `lang.video.video`/`videoLink` elsewhere.)

### Options consumed
| Option | Default | Use |
|---|---|---|
| `options.dialogsInBody` | `false` | container choice |
| `options.container` | editor container | append target |
| `options.dialogsFade` | `false` | modal fade |
| `options.id` | per-editor unique | input id namespacing |
| `options.langInfo` | resolved langpack | i18n |

### Icons
**None.** VideoDialog renders no `note-icon-*` (the toolbar video button supplies the icon, not this module).

---

## `show()` — public entry (invoked from toolbar `video` button / popover)

Flow:
1. `text = context.invoke('editor.getSelectedText')` — currently selected plain text. **Captured but not used** in the resolve path (passed into `showVideoDialog(text)` whose param is commented out `/* text */`). Preserve call for parity but note it is dead.
2. `context.invoke('editor.saveRange')` — snapshot current selection.
3. `this.showVideoDialog(text).then((url) => {...}).fail(() => {...})` — opens dialog, returns a Deferred/Promise resolving with the entered URL.

On **resolve(url)**:
- `this.ui.hideDialog(this.$dialog)` — **hide BEFORE restoring range.** Comment: *"[workaround] hide dialog before restore range for IE range focus."* Ordering constraint: hide → restore, not restore → hide.
- `context.invoke('editor.restoreRange')` — restore the saved selection.
- `const $node = this.createVideoNode(url)` — build the media element (DOM node or `false`).
- If `$node` truthy: `context.invoke('editor.insertNode', $node)`.
  - **Argument shape:** a **raw DOM node** (`$video[0]`, an `HTMLIFrameElement` or `HTMLVideoElement`), NOT a jQuery object.
  - If `createVideoNode` returns `false` (unknown URL), **nothing is inserted** (no error, no link fallback).

On **reject** (dialog dismissed/closed without submit):
- `context.invoke('editor.restoreRange')` only. No insertion.

> Note: despite the task prompt mentioning "createLink flow," VideoDialog has **no createLink path** — it inserts a media node via `editor.insertNode` or does nothing. (createLink is the LinkDialog/image-fallback behavior, not here.)

### Editor commands invoked (with arg shapes)
| Command | Args | Purpose |
|---|---|---|
| `editor.getSelectedText` | — | get selected text (result unused downstream) |
| `editor.saveRange` | — | snapshot selection |
| `editor.restoreRange` | — | restore selection (both success & fail) |
| `editor.insertNode` | `(rawDomNode)` | insert the built iframe/video element |

---

## `showVideoDialog()` — returns `$.Deferred`

Implementation (port as a Promise):
```
return $.Deferred((deferred) => {
  $videoUrl = this.$dialog.find('.note-video-url')
  $videoBtn = this.$dialog.find('.note-video-btn')

  ui.onDialogShown(this.$dialog, () => {
    context.triggerEvent('dialog.shown')                       // fires onDialogShown callback + summernote.dialog.shown
    $videoUrl.on('input paste propertychange', () =>
      ui.toggleBtn($videoBtn, $videoUrl.val()))                // enable insert btn iff field non-empty
    if (!env.isSupportTouch) $videoUrl.trigger('focus')        // autofocus, skipped on touch devices
    $videoBtn.on('click', (event) => {
      event.preventDefault()
      deferred.resolve($videoUrl.val())                        // resolve with URL string
    })
    this.bindEnterKey($videoUrl, $videoBtn)                    // Enter in field → click button
  })

  ui.onDialogHidden(this.$dialog, () => {
    $videoUrl.off()                                            // unbind all field listeners
    $videoBtn.off()                                            // unbind button listeners
    if (deferred.state() === 'pending') deferred.reject()      // closed w/o submit → reject
  })

  ui.showDialog(this.$dialog)
})
```

### Behavior / contracts
- **Button enable logic:** disabled by default; enabled when `$videoUrl.val()` is truthy (any non-empty string). Re-evaluated on `input`, `paste`, `propertychange` (legacy IE) events. Port: listen to `input` (covers paste in modern browsers) + treat empty string as disabled.
- **Autofocus:** focus URL field on shown **only if `!env.isSupportTouch`** (avoid forcing the soft keyboard open on touch devices).
- **Submit paths:** (a) click the insert button; (b) press Enter in the URL field (`bindEnterKey`). Both resolve the Deferred with the URL string.
- **Cancel/dismiss:** closing the dialog (X, backdrop, ESC — handled by theme modal) triggers `onDialogHidden`; if still pending, reject → `show()`'s `.fail()` restores range.
- **Cleanup on hidden:** unbinds field & button listeners every time (prevents duplicate handlers across re-opens). Port must replicate by removing exactly these listeners.
- **Event fired:** `context.triggerEvent('dialog.shown')` → fires `options.callbacks.onDialogShown` (this = `$note[0]`) and jQuery `summernote.dialog.shown`.

### `bindEnterKey($input, $btn)`
```
$input.on('keypress', (event) => {
  if (event.keyCode === key.code.ENTER) {
    event.preventDefault();
    $btn.trigger('click');
  }
});
```
- Uses `key.code.ENTER` (from `src/js/core/key`). On Enter keypress in the input: prevent default (no newline/form submit) and synthetically click the insert button.

### Events bound (DOM)
- On `$videoUrl`: `input`, `paste`, `propertychange` (→ toggle button), `keypress` (→ Enter submit).
- On `$videoBtn`: `click` (→ resolve).
- All removed on dialog hidden via `.off()`.

---

## `createVideoNode(url)` — provider URL parsing (the core)

Returns a **raw DOM element** (`$video[0]`) with class `note-video-clip` added, or **`false`** if no provider matched. All regexes are run **eagerly up-front** (every `url.match(...)` executes regardless of which branch wins), then an `if/else-if` chain selects the first matching branch **in the order below**. Order is significant (first match wins).

> Security note for the port: these regexes parse untrusted user input into iframe `src`/`video src`. The legacy code does **no sanitization or whitelist** beyond pattern matching, and constructs `src` by string concatenation of captured groups. Most providers force a known host prefix (safe), but **peertube** and **mp4/ogg/webm** echo user-controlled host/URL into `src` (see warnings). The codeview iframe whitelist (`codeviewIframeWhitelistSrc`) is a *separate* layer and does not gate insertion here.

### Regex table (verbatim)

| Provider | Variable | Regex |
|---|---|---|
| YouTube (+shorts/live) | `ytRegExp` | `/(?:youtu\.be\/|youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/|live\/))([^&\n?]+)(?:.*[?&]t=([^&\n]+))?.*/` |
| YouTube start-time | `ytRegExpForStart` | `/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/` |
| Google Drive | `gdRegExp` | `/(?:\.|\/\/)drive\.google\.com\/file\/d\/(.[a-zA-Z0-9_-]*)\/view/` |
| Instagram | `igRegExp` | `/(?:www\.|\/\/)instagram\.com\/(reel|p)\/(.[a-zA-Z0-9_-]*)/` |
| Vine | `vRegExp` | `/\/\/vine\.co\/v\/([a-zA-Z0-9]+)/` |
| Vimeo | `vimRegExp` | `/\/\/(player\.)?vimeo\.com\/([a-z]*\/)*(\d+)[?]?.*/` |
| DailyMotion | `dmRegExp` | `/.+dailymotion.com\/(video|hub)\/([^_]+)[^#]*(#video=([^_&]+))?/` |
| Youku | `youkuRegExp` | `/\/\/v\.youku\.com\/v_show\/id_(\w+)=*\.html/` |
| PeerTube | `peerTubeRegExp` | `/\/\/(.*)\/videos\/watch\/([^?]*)(?:\?(?:start=(\w*))?(?:&stop=(\w*))?(?:&loop=([10]))?(?:&autoplay=([10]))?(?:&muted=([10]))?)?/` |
| QQ (vid param) | `qqRegExp` | `/\/\/v\.qq\.com.*?vid=(.+)/` |
| QQ (page/cover) | `qqRegExp2` | `/\/\/v\.qq\.com\/x?\/?(page|cover).*?\/([^\/]+)\.html\??.*/` |
| MP4 | `mp4RegExp` | `/^.+.(mp4|m4v)$/` |
| OGG | `oggRegExp` | `/^.+.(ogg|ogv)$/` |
| WebM | `webmRegExp` | `/^.+.(webm)$/` |
| Facebook | `fbRegExp` | `/(?:www\.|\/\/)facebook\.com\/([^\/]+)\/videos\/([0-9]+)/` |

> Caveat: `mp4RegExp` etc. use an unescaped `.` before the extension (`.+.(mp4|m4v)$`), so the `.` is "any char," not a literal dot — port must preserve this exact behavior (it still matches typical `...something.mp4`).

### Branch-by-branch output markup (in selection order)

**1. YouTube** — condition `ytMatch && ytMatch[1].length === 11` (the video id must be exactly 11 chars).
- `youtubeId = ytMatch[1]`.
- **Start time** computed into `start` (default `0`): if `ytMatch[2]` defined (the `t=` capture):
  - Try `ytMatch[2].match(ytRegExpForStart)` → if it matches the `XhYmZs` form, sum: `n = [3600, 60, 1]` over captures `[1..3]` → `start += n[i] * parseInt(groupi+1)`.
  - Else `start = parseInt(ytMatch[2], 10)` (raw seconds).
- Output:
  ```html
  <iframe frameborder="0"
          src="//www.youtube.com/embed/{youtubeId}{start>0 ? '?start='+start : ''}"
          width="640" height="360"></iframe>
  ```

**2. Google Drive** — condition `gdMatch && gdMatch[0].length`.
```html
<iframe frameborder="0"
        src="https://drive.google.com/file/d/{gdMatch[1]}/preview"
        width="640" height="480"></iframe>
```

**3. Instagram** — condition `igMatch && igMatch[0].length`. (`igMatch[1]` is `reel`|`p`, `igMatch[2]` is the shortcode.)
```html
<iframe frameborder="0"
        src="https://instagram.com/p/{igMatch[2]}/embed/"
        width="612" height="710" scrolling="no" allowtransparency="true"></iframe>
```
(Note: always uses `/p/` in the embed URL even for reels.)

**4. Vine** — condition `vMatch && vMatch[0].length`. Uses the **whole match** `vMatch[0]` as base.
```html
<iframe frameborder="0"
        src="{vMatch[0]}/embed/simple"
        width="600" height="600" class="vine-embed"></iframe>
```
(Extra class `vine-embed` here, plus `note-video-clip` added afterward.)

**5. Vimeo** — condition `vimMatch && vimMatch[3].length` (`vimMatch[3]` = numeric id).
```html
<iframe webkitallowfullscreen mozallowfullscreen allowfullscreen frameborder="0"
        src="//player.vimeo.com/video/{vimMatch[3]}"
        width="640" height="360"></iframe>
```
(The fullscreen attrs are baked into the `$('<iframe ...>')` template string.)

**6. DailyMotion** — condition `dmMatch && dmMatch[2].length` (`dmMatch[2]` = video id).
```html
<iframe frameborder="0"
        src="//www.dailymotion.com/embed/video/{dmMatch[2]}"
        width="640" height="360"></iframe>
```

**7. Youku** — condition `youkuMatch && youkuMatch[1].length`.
```html
<iframe webkitallowfullscreen mozallowfullscreen allowfullscreen frameborder="0"
        height="498" width="510"
        src="//player.youku.com/embed/{youkuMatch[1]}"></iframe>
```

**8. PeerTube** — condition `peerTubeMatch && peerTubeMatch[0].length`.
- Defaults & param extraction (note the **bug preserved for parity**: each check is `if (peerTubeMatch[N] !== 'undefined')` comparing to the **string** `'undefined'`, never the value `undefined`, so these conditions are effectively always true and `begin/end/loop/autoplay/muted` take the captured group value — which may be the JS `undefined` value — directly):
  - `begin = peerTubeMatch[2]` (the video slug capture — itself reused as id!), `end = peerTubeMatch[3]`, `loop = peerTubeMatch[4]`, `autoplay = peerTubeMatch[5]`, `muted = peerTubeMatch[6]`. Each defaults to `0` only in the (unreached) else.
- Output:
  ```html
  <iframe allowfullscreen sandbox="allow-same-origin allow-scripts allow-popups" frameborder="0"
          src="//{peerTubeMatch[1]}/videos/embed/{peerTubeMatch[2]}?loop={loop}&autoplay={autoplay}&muted={muted}{begin>0 ? '&start='+begin : ''}{end>0 ? '&end='+start : ''}"
          width="560" height="315"></iframe>
  ```
  - **Bugs to preserve verbatim:** (a) `peerTubeMatch[1]` (the host) is echoed unsanitized into `src` — security-relevant; (b) the trailing `'&end=' + start` references the **YouTube `start` var** (out of scope here, may be `undefined`), not `end` — this is the legacy behavior. Embeds the `watch` slug (`[2]`) as the embed id.
  - Host `peerTubeMatch[1]` is attacker-controllable → if porting, consider whitelisting; but for strict parity, replicate as-is.

**9. QQ** — condition `(qqMatch && qqMatch[1].length) || (qqMatch2 && qqMatch2[2].length)`.
- `vid = (qqMatch && qqMatch[1].length) ? qqMatch[1] : qqMatch2[2]`.
```html
<iframe webkitallowfullscreen mozallowfullscreen allowfullscreen frameborder="0"
        height="310" width="500"
        src="https://v.qq.com/txp/iframe/player.html?vid={vid}&amp;auto=0"></iframe>
```
(The `&amp;` is literal in the source string — note when porting via `setAttribute` the literal `&amp;` becomes part of the URL query; preserve verbatim.)

**10. Direct media (MP4 / OGG / WebM)** — condition `mp4Match || oggMatch || webmMatch`. Produces a `<video>`, not an iframe.
```html
<video controls src="{url}" width="640" height="360"></video>
```
- `src` is the **raw user URL** (echoed unsanitized). Security-relevant for the port.

**11. Facebook** — condition `fbMatch && fbMatch[0].length`.
```html
<iframe frameborder="0"
        src="https://www.facebook.com/plugins/video.php?href={encodeURIComponent(fbMatch[0])}&show_text=0&width=560"
        width="560" height="301" scrolling="no" allowtransparency="true"></iframe>
```
(Only branch that `encodeURIComponent`s its captured value.)

**12. No match** → `return false;` (comment: *"this is not a known video link. Now what, Cat? Now what?"*). `show()` then inserts nothing.

### Post-processing (all matched branches)
```
$video.addClass('note-video-clip');
return $video[0];   // raw DOM element
```
Every produced element gets class `note-video-clip` and is returned as a raw DOM node.

### Default dimensions summary
| Provider | width × height | element |
|---|---|---|
| YouTube | 640×360 | iframe |
| Google Drive | 640×480 | iframe |
| Instagram | 612×710 | iframe |
| Vine | 600×600 | iframe (`.vine-embed`) |
| Vimeo | 640×360 | iframe (fullscreen attrs) |
| DailyMotion | 640×360 | iframe |
| Youku | 510×498 | iframe (fullscreen attrs) |
| PeerTube | 560×315 | iframe (sandbox attrs) |
| QQ | 500×310 | iframe (fullscreen attrs) |
| MP4/OGG/WebM | 640×360 | `<video controls>` |
| Facebook | 560×301 | iframe |

### Provider mismatch vs. lang.providers
`lang.video.providers` advertises *"YouTube, Google Drive, Vimeo, Vine, Instagram, DailyMotion, Youku, Peertube"* but `createVideoNode` **also** supports QQ, Facebook, and direct mp4/ogg/webm. Port should keep all parser branches regardless of the label text. The header comment lists yet another (slightly different) set: *"youtube, instagram, vimeo, dailymotion, youku, peertube, mp4, ogg, webm"* — neither comment is authoritative; the code is.

### Keyboard / tooltips (VideoDialog)
- No tooltips defined in this module.
- Keyboard: only the in-dialog **Enter → submit** (via `bindEnterKey`). No global shortcut maps to `videoDialog.show` in the default keyMap (the video button has no keymap entry).

---

# `## HelpDialog`

## DOM markup (`initialize()`)

**Footer HTML** (the `body` local var, used as `footer`):
```html
<p class="text-center">
  <a href="http://summernote.org/" target="_blank" rel="noopener noreferrer">Summernote @@VERSION@@</a> ·
  <a href="https://github.com/summernote/summernote" target="_blank" rel="noopener noreferrer">Project</a> ·
  <a href="https://github.com/summernote/summernote/issues" target="_blank" rel="noopener noreferrer">Issues</a>
</p>
```
- `@@VERSION@@` is a **build-time token** replaced by the Vite banner with the real semver (from `package.json`). In the port, substitute the actual version string at build.
- All three links: `target="_blank" rel="noopener noreferrer"`.

**Dialog options**:
- `title: this.lang.options.help`
- `fade: this.options.dialogsFade`
- `body: this.createShortcutList()` — the shortcut table (HTML string).
- `footer: body` (the links `<p>` above).
- `callback: ($node) => { $node.find('.modal-body,.note-modal-body').css({ 'max-height': 300, 'overflow': 'scroll' }); }` — after render, constrains the body to `max-height:300px; overflow:scroll` (matches `.modal-body` for bs themes and `.note-modal-body` for lite). Port: apply this scroll-cap to the rendered body.

### `createShortcutList()` — shortcut table builder
```
const keyMap = this.options.keyMap[env.isMac ? 'mac' : 'pc'];
return Object.keys(keyMap).map((key) => {
  const command = keyMap[key];                       // e.g. 'undo'
  const $row = $('<div><div class="help-list-item"></div></div>');
  $row.append($('<label><kbd>' + key + '</kdb></label>').css({ 'width': 180, 'margin-right': 10 }))
      .append($('<span></span>').html(this.context.memo('help.' + command) || command));
  return $row.html();
}).join('');
```

Per shortcut row markup (note the verbatim quirks):
```html
<div>
  <div class="help-list-item"></div>          <!-- empty, sibling of the appended label/span -->
  <label style="width:180px; margin-right:10px;"><kbd>{keyCombo}</kbd></label>
  <span>{help text for command, or command name fallback}</span>
</div>
```
> **Verbatim quirks to preserve:**
> - The label template is `'<label><kbd>' + key + '</kdb></label>'` — note the typo **`</kdb>`** (mismatched closing tag). Browser parses `<kbd>` open then an unknown `</kdb>` close; net effect renders the key text. The port should render the keycombo inside a `<kbd>` but may correct the typo (visually identical). Flag as a known legacy artifact.
> - `.append()` adds label & span as **siblings of** the empty `.help-list-item` div, not inside it. The `.help-list-item` div is rendered empty. Then `$row.html()` returns the **innerHTML** of the outer `<div>` (so the outer `<div>` wrapper itself is discarded; only its children — the empty `.help-list-item`, the `<label>`, the `<span>` — are concatenated). Rows are joined with `''` into one flat HTML string. Port: emit, per shortcut, an empty `.help-list-item` div + a fixed-width `<label><kbd>combo</kbd></label>` + a `<span>description</span>`.
> - Inline styles: label `width:180` (px) and `margin-right:10` (px).

**Source of key combos:** `options.keyMap.mac` or `options.keyMap.pc` chosen by `env.isMac`. Keys are the combo strings (`'CTRL+Z'`, `'ENTER'`, …); values are command names. The **iteration order is `Object.keys` order** = literal source order in `settings.js` (preserve this order in the port).

**Description lookup:** `context.memo('help.' + command) || command`. The `help.*` memos are registered by **Editor** (`Editor.initialize`), so HelpDialog depends on Editor having initialized first (module registration order guarantees this). Memo values come from `lang.help.*`. If a command has no `help.*` memo, the raw command string is shown.

### keyMap → help-text mapping (default pc; mac mirrors with CMD)

| Key (pc) | command | `help.*` text (en-US) |
|---|---|---|
| ESC | escape | Escape |
| ENTER | insertParagraph | Insert Paragraph |
| CTRL+Z | undo | Undo the last command |
| CTRL+Y | redo | Redo the last command |
| TAB | tab | Tab |
| SHIFT+TAB | untab | Untab |
| CTRL+B | bold | Set a bold style |
| CTRL+I | italic | Set a italic style |
| CTRL+U | underline | Set a underline style |
| CTRL+SHIFT+S | strikethrough | Set a strikethrough style |
| CTRL+BACKSLASH | removeFormat | Clean a style |
| CTRL+SHIFT+L | justifyLeft | Set left align |
| CTRL+SHIFT+E | justifyCenter | Set center align |
| CTRL+SHIFT+R | justifyRight | Set right align |
| CTRL+SHIFT+J | justifyFull | Set full align |
| CTRL+SHIFT+NUM7 | insertUnorderedList | Toggle unordered list |
| CTRL+SHIFT+NUM8 | insertOrderedList | Toggle ordered list |
| CTRL+LEFTBRACKET | outdent | Outdent on current paragraph |
| CTRL+RIGHTBRACKET | indent | Indent on current paragraph |
| CTRL+NUM0 | formatPara | Change current block's format as a paragraph(P tag) |
| CTRL+NUM1..6 | formatH1..6 | Change current block's format as H1..H6 |
| CTRL+ENTER | insertHorizontalRule | Insert horizontal rule |
| CTRL+K | linkDialog.show | Show Link Dialog |

(mac map: `CMD` instead of `CTRL`, plus `CMD+SHIFT+Z` for redo. Same commands.) The `help.*` memos registered in Editor cover: escape, undo, redo, tab, untab, insertParagraph, insertOrderedList, insertUnorderedList, indent, outdent, formatPara, insertHorizontalRule, fontName, the native-command set (bold, italic, underline, strikethrough, superscript, subscript, justifyLeft/Center/Right/Full, formatBlock, removeFormat, backColor), and formatH1..6. **`linkDialog.show` has NO `help.*` memo** → its row falls back to showing the raw string `"linkDialog.show"`. (`lang.help['linkDialog.show']` exists = "Show Link Dialog" but is **never registered as a memo**, so it is not used — the fallback raw command string is shown instead. Preserve this discrepancy or, if improving, register the memo; flag as legacy.)

### Class names (.note-* and others)
- `.help-list-item` (per row, rendered empty)
- `.modal-body` / `.note-modal-body` (targeted by the callback to set scroll/max-height)
- `.text-center` (footer paragraph)
- `<kbd>`, `<label>`, `<span>` semantic elements

### i18n keys referenced
- `lang.options.help` → "Help" (dialog title)
- `lang.help.*` (indirectly, via Editor-registered `help.*` memos) — every key listed above.

### Options consumed
| Option | Default | Use |
|---|---|---|
| `options.dialogsInBody` | `false` | container |
| `options.container` | editor container | append target |
| `options.dialogsFade` | `false` | modal fade |
| `options.keyMap` | pc/mac maps in settings.js | shortcut list source |
| `options.langInfo` | resolved langpack | title + (via memos) descriptions |

### Icons
**None** (`note-icon-*` not used; the toolbar help button supplies its icon).

---

## `show()` and `showHelpDialog()`

`show()`:
```
context.invoke('editor.saveRange');
this.showHelpDialog().then(() => {
  context.invoke('editor.restoreRange');
});
```
- Save selection, open dialog, restore selection once shown. **No `.fail()` handler** (unlike VideoDialog) — Help dialog has no submit/reject path; it resolves immediately on shown.

`showHelpDialog()` → returns `$.Deferred(...).promise()`:
```
ui.onDialogShown(this.$dialog, () => {
  context.triggerEvent('dialog.shown');     // onDialogShown callback + summernote.dialog.shown
  deferred.resolve();                        // resolves immediately on shown
});
ui.showDialog(this.$dialog);
```
- The help dialog is **read-only**: it resolves as soon as it is shown (so `restoreRange` runs right after open). There is no insert action, no input binding, no Enter handling, no `onDialogHidden` cleanup (nothing to unbind).

### Editor commands invoked (with arg shapes)
| Command | Args | Purpose |
|---|---|---|
| `editor.saveRange` | — | snapshot selection before dialog |
| `editor.restoreRange` | — | restore after shown |

### Events fired
- `context.triggerEvent('dialog.shown')` on shown → `options.callbacks.onDialogShown` (this = `$note[0]`) + jQuery `summernote.dialog.shown`.

### Keyboard / tooltips (HelpDialog)
- No global keymap entry maps to `helpDialog.show` by default (the help toolbar button triggers it). No in-dialog keyboard handling. No tooltips in-module.

---

## Port checklist / non-obvious constraints (both)

1. **Ordering: hide-before-restore (Video).** In `show()` success, hide the dialog *before* `restoreRange` (IE focus workaround). Keep this order.
2. **insertNode receives a raw DOM node**, not a wrapper — the port's `editor.insertNode` contract must accept an `HTMLElement`.
3. **Eager regex evaluation + ordered if/else** in `createVideoNode`: every provider regex runs on every call; first matching branch (in the documented order) wins. YouTube requires id length exactly 11; Vimeo requires `[3]` group; DailyMotion requires `[2]`; etc. Reproduce the exact guard conditions.
4. **Preserve verbatim legacy bugs** for byte-parity (or flag+fix consciously): peertube `'undefined'` string comparisons, peertube `'&end=' + start` referencing the YouTube `start` var, peertube/mp4 unsanitized host/url echo, the `</kdb>` typo in HelpDialog, QQ literal `&amp;`, unescaped `.` in mp4/ogg/webm regexes, Instagram always using `/p/` embed path.
5. **Security (port hardening, deviates from legacy):** iframe/video `src` for peertube (host) and mp4/ogg/webm (full url) are attacker-controllable. Legacy does no validation; consider an allowlist or URL validation in the React port, but document the deviation. Facebook is the only branch that `encodeURIComponent`s.
6. **Button-enable parity (Video):** disabled by default; enabled iff URL field non-empty; re-checked on input/paste/propertychange.
7. **Touch autofocus skip (Video):** focus URL only when `!env.isSupportTouch`.
8. **HelpDialog ordering dependency:** the `help.*` memos are registered by the Editor module's `initialize`, so HelpDialog must read them after Editor init. `linkDialog.show` row shows the raw command string (no memo registered).
9. **`@@VERSION@@`** must be replaced at build time in HelpDialog footer.
10. **Body scroll cap (Help):** `max-height:300px; overflow:scroll` on the body, applied via the dialog `callback`.
11. Both dialogs read `options.id` (Video) / nothing extra (Help) for input id namespacing; ensure per-editor unique ids to support multiple editors per page.

---

<!-- ===== table-status-fs-ph ===== -->
I now have full confirmation of all contracts. Here is the spec.

## TablePopover, Statusbar, Fullscreen, Placeholder — Implementation Spec

Source files: `src/js/module/TablePopover.js`, `src/js/module/Statusbar.js`, `src/js/module/Fullscreen.js`, `src/js/module/Placeholder.js`. Supporting: `Buttons.js` (table button factories), `settings.js` (defaults), `summernote-lite.js` (markup), `summernote-en-US.js` (lang), `core/dom.js` (`isCell`, `posFromPlaceholder`).

All four are standard modules following the contract: `constructor(context)`, optional `shouldInitialize()`, `initialize()`, `destroy()`, optional `events` map (auto-subscribed by Context to `summernote.*` jQuery custom events). Context provides: `context.options`, `context.layoutInfo`, `context.$note`, `context.invoke(target, ...args)`, `context.triggerEvent(ns, ...)`, `context.isDisabled()`, `context.memo(key[, fn])`.

In the React/TS port: `context.invoke('module.method', ...args)` routes to that module's method (gated by `shouldInitialize()`). Bare invoke targets (`'focus'`) resolve against Context first, then fall back to the `editor` module. `summernote.*` events become the editor's internal event bus; `$().css/height/offset/data` become direct DOM/style manipulation.

---

### 1. TablePopover

A floating popover anchored below the currently-focused table cell, containing row/column add/delete buttons. Visible only when the caret/mouse is inside a `TD`/`TH`.

#### shouldInitialize
Returns `!lists.isEmpty(options.popover.table)`. If `options.popover.table` is an empty array, the module is skipped entirely (no initialize/destroy/events). Default `options.popover.table` is non-empty (see below), so by default it initializes.

#### Constructor — captured references
- `this.ui = $.summernote.ui` (the active theme UI factory).
- `this.options = context.options`.
- Defines `this.events` (below). No DOM created in constructor.

#### Options consumed
- `options.popover.table` — toolbar-tuple group array. **Default:**
  ```
  [
    ['add',    ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
    ['delete', ['deleteRow', 'deleteCol', 'deleteTable']],
  ]
  ```
  Each group renders as a `<div class="note-btn-group note-{groupName}">` (so `.note-add` and `.note-delete`), with buttons looked up by name via `context.memo('button.{name}')`.
- `options.container` — DOM node/selector the popover is appended to and used as the positioning origin. Default `null` → resolved at Context init to `document.body` (or editor element in air mode). The popover's absolute `top`/`left` are computed relative to this container's offset.

#### initialize() — DOM creation
1. Create popover via `this.ui.popover({ className: 'note-table-popover' }).render()`, append to `options.container`.
   - **Lite markup** (`ui.popover`):
     ```
     <div class="note-popover bottom note-table-popover">
       <div class="note-popover-arrow"></div>
       <div class="popover-content note-children-container"></div>
     </div>
     ```
     The factory adds the direction class (`bottom` default) and calls `.hide()` immediately (element starts hidden via inline `display:none`). `hideArrow` option not passed → arrow shown.
   - **Note class-name divergence across themes:** lite uses `.popover-content`; bs4/bs5 use `.note-popover-content`. The code resolves the content container with the combined selector `'.popover-content,.note-popover-content'`. The React port should pick ONE content container class and target it consistently.
2. `context.invoke('buttons.build', $content, options.popover.table)` — builds the button groups into the content container. `Buttons.build($container, groups)`:
   - For each group tuple `[groupName, [btnNames...]]`: create `<div class="note-btn-group note-{groupName}">`; for each button name, fetch `context.memo('button.'+name)` (a render function or rendered node) and append; append the group to `$container`.
3. **Firefox workaround:** if `env.isFF`, call `document.execCommand('enableInlineTableEditing', false, false)` to disable Firefox's native table editor overlay. The port has no execCommand — must replicate by ensuring Firefox's inline table editing UI is suppressed (e.g., this is a known FF behavior on contentEditable tables; in the port, suppress via the equivalent or accept that FF's native handles won't appear).
4. Bind `mousedown` on the popover → `event.preventDefault()`. **Why:** prevents the editor from losing selection/focus when a popover button is pressed (keeps the table cell selection intact so the command applies to the right cell).

#### Table popover button factories (from Buttons.addTablePopoverButtons)
Each is registered via `context.memo('button.{name}', factory)`. All have `className: 'btn-md'`, an icon, a tooltip (from lang), and a click handler created with `context.createInvokeHandler('editor.{cmd}', arg)`.

| memo key | icon (options.icons.*) | icon class | tooltip (lang.table.*) | command invoked | arg |
|---|---|---|---|---|---|
| `button.addRowUp` | `rowAbove` | `note-icon-row-above` | `addRowAbove` ("Add row above") | `editor.addRow` | `'top'` |
| `button.addRowDown` | `rowBelow` | `note-icon-row-below` | `addRowBelow` ("Add row below") | `editor.addRow` | `'bottom'` |
| `button.addColLeft` | `colBefore` | `note-icon-col-before` | `addColLeft` ("Add column left") | `editor.addCol` | `'left'` |
| `button.addColRight` | `colAfter` | `note-icon-col-after` | `addColRight` ("Add column right") | `editor.addCol` | `'right'` |
| `button.deleteRow` | `rowRemove` | `note-icon-row-remove` | `delRow` ("Delete row") | `editor.deleteRow` | (none) |
| `button.deleteCol` | `colRemove` | `note-icon-col-remove` | `delCol` ("Delete column") | `editor.deleteCol` | (none) |
| `button.deleteTable` | `trash` | `note-icon-trash` | `delTable` ("Delete table") | `editor.deleteTable` | (none) |

**Editor command argument shapes** (the popover never passes a range — Editor derives it):
- `editor.addRow(position)` — `position` ∈ `{'top','bottom'}`; reads current selection range, calls `Table.addRow(rng, position)`.
- `editor.addCol(position)` — `position` ∈ `{'left','right'}`; `Table.addCol(rng, position)`.
- `editor.deleteRow()` / `editor.deleteCol()` / `editor.deleteTable()` — no args; operate on current selection's cell/table.
All are wrapped through Editor's command lifecycle (`beforeCommand`/`afterCommand` → records undo, normalizes, fires `change`).

Rendered button markup (lite `ui.button`): `<button type="button" class="note-btn btn-md" tabindex="-1" aria-label="{tooltip}">{icon html}</button>`. Tooltip is shown via a TooltipUI instance attached on `_lite_tooltip` data, hidden on click; requires a valid `options.container`. Icon html: `<i class="note-icon-row-above"></i>` etc.

#### events (auto-bound to summernote.* bus)
| event(s) | handler |
|---|---|
| `summernote.mousedown` | `this.update(event.target)` — re-evaluate using the moused-down element as anchor target. |
| `summernote.keyup summernote.scroll summernote.change` | `this.update()` — re-evaluate using the current selection (no explicit target). |
| `summernote.disable summernote.dialog.shown` | `this.hide()` — hide while editor disabled or any dialog is open. |
| `summernote.blur` | If `event.originalEvent.relatedTarget` exists and is NOT contained within the popover element, `hide()`. If no `relatedTarget`, `hide()`. **Purpose:** don't hide when focus moves into the popover itself (so its buttons remain clickable), but hide on a genuine blur. |

#### update(target)
1. If `context.isDisabled()` → return `false` (do nothing).
2. Determine cell: `isCell = dom.isCell(target) || dom.isCell(target?.parentElement)`. `dom.isCell(node)` = `node && /^TD|^TH/.test(node.nodeName.toUpperCase())` (matches `TD`/`TH`, prefix-anchored so also `TD*`/`TH*` — effectively any TD/TH). The `?.parentElement` check catches the case where the target is a text node or inline element directly inside the cell.
   - **When `update()` is called with no target** (keyup/scroll/change path): `target` is `undefined`, so `isCell` is `false` → the popover is **hidden**. So the popover only *appears* via the `summernote.mousedown` path where a concrete target element is available. (This is the actual runtime behavior to replicate — the selection-based events only ever hide it, they don't reposition it onto the current selection's cell.)
3. If a cell:
   - `pos = dom.posFromPlaceholder(target)`:
     - `posFromPlaceholder(el)` returns `{ left: offset().left, top: offset().top + outerHeight(true) }` where `outerHeight(true)` includes margin. I.e., the popover top = the cell's top page offset plus the cell's full outer height → anchored at the bottom edge of the cell.
   - Subtract container offset: `pos.top -= container.offset().top; pos.left -= container.offset().left`. Converts page coordinates to coordinates relative to the positioned container.
   - Set CSS on popover: `{ display: 'block', left: pos.left, top: pos.top }` (numbers → px).
   - Returns `true`.
4. Else (not a cell) → `this.hide()`, return `false`.

#### hide()
`this.$popover.hide()` → sets inline `display:none`.

#### destroy()
`this.$popover.remove()` — removes the popover DOM. (No event unbinding needed beyond removal; the `events` map is auto-detached by Context.)

#### Port notes / quirks
- Positioning is **absolute relative to `options.container`'s positioned box**, using page offsets minus container offset. The container must be a positioning context (or treated as the page origin).
- The popover element must be excluded from `summernote.blur`-triggered hide when focus enters it (relatedTarget containment check).
- The mousedown `preventDefault` on the popover root is essential to keep table-cell selection so the row/col commands target the correct cell.

---

### 2. Statusbar

A draggable resize bar at the bottom of the editor that resizes the editable and codable heights by vertical mouse/touch drag.

#### Constructor — captured references
- `this.$document = $(document)`.
- `this.$statusbar = layoutInfo.statusbar`, `this.$editable = layoutInfo.editable`, `this.$codable = layoutInfo.codable`.
- `this.options = context.options`.
- Module-level constant: `EDITABLE_PADDING = 24` (px) — accounts for the editable's vertical padding so the computed height maps the cursor to content height, not box top.

#### Statusbar markup (lite createLayout)
The statusbar region rendered into the editor:
```
<output class="note-status-output" role="status" aria-live="polite"></output>
<div class="note-statusbar" role="status">
  <div class="note-resizebar" aria-label="resize">
    <div class="note-icon-bar"></div>
    <div class="note-icon-bar"></div>
    <div class="note-icon-bar"></div>
  </div>
</div>
```
`layoutInfo.statusbar` resolves to the `.note-statusbar` element (`$editor.find('.note-statusbar')`). The three `.note-icon-bar` divs are the visual grip lines. `.note-status-output` is a separate live region (used elsewhere for messages, e.g. max file size errors), not by Statusbar logic.

#### Options consumed
- `options.airMode` — default `false`. If `true`, statusbar is destroyed (no resize).
- `options.disableResizeEditor` — **not present in settings.js defaults** (so default `undefined`/falsy). If truthy, statusbar is destroyed.
- `options.minheight` — **lowercase**, used in the height clamp. ⚠️ **Not defined in settings.js defaults** (defaults define `minHeight` camelCase elsewhere for layout, but Statusbar reads `options.minheight`). So by default this is `undefined`, the `> 0` test is false, and **no minimum clamp is applied** unless the consumer explicitly sets `minheight`. Replicate this exact key (`minheight`).
- `options.maxHeight` — camelCase. Also **not in settings.js defaults** → `undefined` → no max clamp by default. Replicate this key (`maxHeight`).

(Note the inconsistent casing: min uses `minheight`, max uses `maxHeight`. This is a real, load-bearing quirk in the legacy source.)

#### initialize()
1. If `options.airMode || options.disableResizeEditor` → call `this.destroy()` and return (statusbar gets locked/hidden, no drag).
2. Bind `mousedown touchstart` on `$statusbar`:
   - `event.preventDefault(); event.stopPropagation()`.
   - Capture drag origin tops (page-relative, scroll-adjusted) at mousedown time:
     - `editableTop = $editable.offset().top - $document.scrollTop()`
     - `editableCodeTop = $codable.offset().top - $document.scrollTop()`
   - Define `onStatusbarMove(event)`:
     - Normalize pointer: `originalEvent = (event.type == 'mousemove') ? event : event.originalEvent.touches[0]` — for touch, use the first touch point.
     - `height     = originalEvent.clientY - (editableTop + EDITABLE_PADDING)`
     - `heightCode = originalEvent.clientY - (editableCodeTop + EDITABLE_PADDING)`
     - Clamp each independently:
       - `if (options.minheight > 0)` → `Math.max(height, options.minheight)`
       - `if (options.maxHeight > 0)` → `Math.min(height, options.maxHeight)`
       - same two clamps for `heightCode`.
     - Apply: `$editable.height(height)` and `$codable.height(heightCode)` (px). (`.height()` sets content-box height in jQuery; the port should set the equivalent so visual result matches — i.e., set the element's height such that content height equals the computed value.)
   - Bind move + one-shot up:
     - `$document.on('mousemove touchmove', onStatusbarMove)`
     - `.one('mouseup touchend', () => $document.off('mousemove touchmove', onStatusbarMove))` — releases the move listener on release.

**Height math summary:** new editable height = `pointerClientY − (editableTopAtDragStart + 24)`. Because origins are captured at mousedown and not recomputed during the drag, page scroll during drag is not re-accounted (the `- scrollTop()` is applied once). `clientY` is viewport-relative, matching the viewport-relative origin. The editable and codable get distinct heights because their top offsets differ.

#### destroy()
- `this.$statusbar.off()` — remove all bound handlers.
- `this.$statusbar.addClass('locked')` — adds `.note-statusbar.locked` (CSS hides/disables the resize grip).

#### Port notes / quirks
- Two parallel height computations (editable + codable) — both must be updated on each move so codeview and wysiwyg stay in sync.
- The min/max option keys are inconsistently cased (`minheight` vs `maxHeight`) and absent from defaults — by default there is NO clamp; height can go negative if dragged above origin. Preserve unless intentionally fixing.
- Touch support: read `touches[0]` for non-mousemove events.
- `event.stopPropagation()` on mousedown prevents the editor from treating the drag start as an editor mousedown.

---

### 3. Fullscreen

Toggles a fullscreen mode by adding a `fullscreen` class to the editor frame and a body class for scroll lock, sizing the editable/codable to the viewport, and binding window resize.

#### Constructor — captured references
- `this.$editor = layoutInfo.editor` (the `.note-editor.note-frame` root).
- `this.$toolbar = layoutInfo.toolbar`, `this.$editable = layoutInfo.editable`, `this.$codable = layoutInfo.codable`.
- `this.$window = $(window)`.
- `this.$scrollbar = $('html, body')`.
- `this.scrollbarClassName = 'note-fullscreen-body'`.
- `this.onResize = () => this.resizeTo({ h: $window.height() - $toolbar.outerHeight() })` — recompute editable height = viewport height minus toolbar outer height. Stored as a stable reference so it can be `.off()`'d later.

No `shouldInitialize` (always initializes), no `initialize()` body beyond the constructor, no `events` map — the module is purely command-driven via `fullscreen.toggle`. Triggered by the toolbar Fullscreen button (`button.fullscreen`, click → `createInvokeHandler('fullscreen.toggle')`).

#### resizeTo(size)
- `$editable.css('height', size.h)` and `$codable.css('height', size.h)`.
- If CodeMirror is active (`$codable.data('cmeditor')`): `cmeditor.setsize(null, size.h)`. (The port without CodeMirror can drop this branch; just set the textarea height.)

#### toggle()
1. `$editor.toggleClass('fullscreen')` — adds/removes `fullscreen` on `.note-editor`. (Selector targeted by Toolbar: a fullscreen editor matches `.note-editor.fullscreen`.)
2. `isFullscreen = this.isFullscreen()` = `$editor.hasClass('fullscreen')`.
3. `$scrollbar.toggleClass('note-fullscreen-body', isFullscreen)` — adds `note-fullscreen-body` to `<html>` and `<body>` when entering fullscreen (CSS sets `overflow: hidden` → page scroll lock), removes when exiting.
4. **Entering** (isFullscreen true):
   - Save original sizes on the editable's data store:
     - `$editable.data('orgHeight', $editable.css('height'))`
     - `$editable.data('orgMaxHeight', $editable.css('maxHeight'))`
   - `$editable.css('maxHeight', '')` — clear maxHeight so it can grow to full viewport.
   - `$window.on('resize', this.onResize).trigger('resize')` — bind resize handler and immediately fire once to size to current viewport.
5. **Exiting** (isFullscreen false):
   - `$window.off('resize', this.onResize)` — unbind.
   - `this.resizeTo({ h: $editable.data('orgHeight') })` — restore saved height.
   - `$editable.css('maxHeight', $editable.css('orgMaxHeight'))` — restore maxHeight. ⚠️ **Bug to preserve faithfully:** it reads `$editable.css('orgMaxHeight')` (a CSS get of a non-CSS property → returns `undefined`/empty) instead of `$editable.data('orgMaxHeight')`. Net effect: maxHeight is effectively reset to empty on exit, NOT restored to its saved value. Decide deliberately whether to replicate or fix in the port.
6. `context.invoke('toolbar.updateFullscreen', isFullscreen)` — updates the toolbar fullscreen button's active state. `Toolbar.updateFullscreen(isFullscreen)` calls `ui.toggleBtnActive($toolbar.find('.btn-fullscreen'), isFullscreen)` → toggles `active` class on the `.btn-fullscreen` button. (The fullscreen button has `className: 'btn-fullscreen note-codeview-keep'`.)

#### isFullscreen()
`$editor.hasClass('fullscreen')`.

#### destroy()
`$scrollbar.removeClass('note-fullscreen-body')` — ensures the body scroll lock is removed if the editor is destroyed while fullscreen. (Does not remove the `fullscreen` class from the editor, but the whole editor is being torn down.)

#### Classes / contracts summary
- `.note-editor.fullscreen` — the editor frame in fullscreen.
- `html.note-fullscreen-body`, `body.note-fullscreen-body` — scroll lock.
- `.btn-fullscreen` toolbar button gets `.active` when fullscreen.
- Editable/codable height set to `viewportHeight - toolbarOuterHeight`; recomputed on every window resize while fullscreen.
- Original `height` and `maxHeight` stashed on editable `data('orgHeight'|'orgMaxHeight')` for restore.

#### Options consumed
None directly (reads layout + window only). Tooltip/lang for the button come from Buttons: `lang.options.fullscreen` ("Full Screen"), icon `options.icons.arrowsAlt` (`note-icon-arrows-alt`).

---

### 4. Placeholder

A click-through placeholder overlay shown when the editor content is empty (and codeview is not active).

#### Constructor
- `this.$editingArea = layoutInfo.editingArea` (the `.note-editing-area` wrapper containing codable+editable).
- `this.options = context.options`.
- **Inherit placeholder:** if `options.inheritPlaceholder === true`, set `options.placeholder = context.$note.attr('placeholder') || options.placeholder`. I.e., when enabled, read the `placeholder` attribute from the original target element (e.g., a `<textarea placeholder="...">`), falling back to the existing option.
- Defines `this.events` (below).

#### shouldInitialize
`!!options.placeholder` — only initializes if a non-empty placeholder string is set (after the inherit step). Default `options.placeholder` is `null` → by default Placeholder does NOT initialize.

#### Options consumed
- `options.placeholder` — default `null`. The text/HTML shown.
- `options.inheritPlaceholder` — default `false`. When true, pulls from `$note[placeholder]`.

#### initialize() — DOM
1. Create `<div class="note-placeholder"></div>`.
2. Bind `click` → `context.invoke('focus')` (focuses the editable). `'focus'` is a bare invoke target resolving to `editor.focus()`.
3. `.html(options.placeholder)` — placeholder set as **HTML** (not escaped text). Then `.prependTo($editingArea)` — inserted as the FIRST child of `.note-editing-area` (so it overlays the editable, which it precedes in document order; CSS positions it).
4. Call `this.update()` once to set initial visibility.

Resulting markup inside editing area:
```
<div class="note-editing-area">
  <div class="note-placeholder">{placeholder html}</div>
  <textarea class="note-codable" ...></textarea>
  <div class="note-editable" contenteditable="true" ...></div>
</div>
```

#### events (auto-bound)
| event(s) | handler |
|---|---|
| `summernote.init summernote.change` | `this.update()` |
| `summernote.codeview.toggled` | `this.update()` |

So visibility re-evaluates on init, every content change, and whenever codeview is toggled. (`codeview.toggled` is fired by Codeview via `context.triggerEvent('codeview.toggled')` after activate/deactivate.)

#### update()
```
isShow = !context.invoke('codeview.isActivated') && context.invoke('editor.isEmpty')
$placeholder.toggle(isShow)   // show iff isShow, else hide
```
- `codeview.isActivated()` → true when the code-view textarea is shown. Placeholder is hidden during codeview.
- `editor.isEmpty()` → `dom.isEmpty($editable[0]) || dom.emptyPara === $editable.html()`. I.e., empty when the editable has no meaningful content OR its HTML equals the canonical empty paragraph (`dom.emptyPara`, which is `<p><br></p>`).
- Shown only when both: not in codeview AND editor is empty.

#### destroy()
`this.$placeholder.remove()`.

#### Port notes
- Placeholder content is injected as HTML (supports markup); preserve or sanitize per security policy.
- Visibility predicate must combine codeview-active and editor-empty checks; the empty check must treat `<p><br></p>` as empty.
- Clicking the placeholder must focus the editable (it sits above the editable visually but must not block focusing).
- It is prepended (first child) of `.note-editing-area`.

---

### Cross-cutting reference (for all four)

**Icon class names referenced** (via `options.icons`, default mapping in settings.js): `note-icon-row-above`, `note-icon-row-below`, `note-icon-col-before`, `note-icon-col-after`, `note-icon-row-remove`, `note-icon-col-remove`, `note-icon-trash` (TablePopover buttons); `note-icon-arrows-alt` (Fullscreen toolbar button). Statusbar/Placeholder use no icons (Statusbar grip is plain `.note-icon-bar` divs styled by CSS).

**i18n keys referenced:** TablePopover (via button factories) — `lang.table.addRowAbove`, `lang.table.addRowBelow`, `lang.table.addColLeft`, `lang.table.addColRight`, `lang.table.delRow`, `lang.table.delCol`, `lang.table.delTable`. Fullscreen button — `lang.options.fullscreen`. Statusbar and Placeholder reference no lang keys.

**Editor commands invoked (with arg shapes):** `editor.addRow('top'|'bottom')`, `editor.addCol('left'|'right')`, `editor.deleteRow()`, `editor.deleteCol()`, `editor.deleteTable()` (TablePopover); `fullscreen.toggle()` and internally `toolbar.updateFullscreen(boolean)` (Fullscreen); `focus()` → `editor.focus()`, `codeview.isActivated()`, `editor.isEmpty()` (Placeholder); `buttons.build($content, groups)` (TablePopover init).

**No keyboard shortcuts** are owned by any of these four modules (table commands are popover-only; fullscreen/codeview/placeholder have none in the keyMap).

**Class-name contracts:** `.note-table-popover` (+ `.note-popover.bottom`, `.note-popover-arrow`, content container `.popover-content`/`.note-popover-content`), `.note-add`/`.note-delete` button groups, `.note-btn.btn-md` table buttons; `.note-statusbar` (+ `.note-resizebar`, `.note-icon-bar`×3, `.locked` when disabled), `.note-status-output`; `.note-editor.fullscreen`, `html/body.note-fullscreen-body`, `.btn-fullscreen.active`; `.note-placeholder`.

---

<!-- ===== codeview-air ===== -->
I now have everything needed to write the exhaustive spec.

## Codeview (`src/js/module/Codeview.js`)

The Codeview module is the editor's "source / HTML mode." It swaps the visible WYSIWYG editing surface (`layoutInfo.editable`, a contentEditable `div`) for a raw HTML `<textarea>` (`layoutInfo.codable`), optionally upgraded to a CodeMirror instance. The toggle is gated through the `codeview` module (default registered in `settings.js`). Codeview is a security boundary: the raw HTML the user types is purified on exit before being written back into the editable.

### Construction / wiring (constructor)

Stores references resolved from `context`:
- `this.context`
- `this.$editor = context.layoutInfo.editor` — the root `.note-editor` element. Codeview state is encoded as a CSS class on this element (`codeview`).
- `this.$editable = context.layoutInfo.editable` — the contentEditable WYSIWYG `div` (`.note-editable`).
- `this.$codable = context.layoutInfo.codable` — the raw HTML `<textarea>` (`.note-codable`).
- `this.options = context.options`
- `this.CodeMirrorConstructor = window.CodeMirror` — defaults to the global `CodeMirror` if present on `window`.
  - **Override path:** if `options.codemirror.CodeMirrorConstructor` is truthy, it replaces the global (`this.CodeMirrorConstructor = options.codemirror.CodeMirrorConstructor`). This lets a consumer inject a module-imported CodeMirror without putting it on `window`.
- **Throughout the module, the presence/absence of `this.CodeMirrorConstructor` (local var `CodeMirror`) is the single switch between the "CodeMirror path" and the "plain textarea path."**

For the React/TS port (no CodeMirror, no jQuery): the entire CodeMirror branch can be dropped; only the plain-textarea path is required. CodeMirror is a fully optional integration.

### State predicate

- `isActivated()` → returns `this.$editor.hasClass('codeview')`. Codeview "active" is purely the presence of the `codeview` class on the root editor element. (Port: maintain a boolean / state flag plus that class for CSS.)

### `initialize()`

Binds a single DOM event on the codable textarea:
- `keyup` on `$codable`: if `event.keyCode === key.code.ESCAPE`, call `this.deactivate()`. **ESC in the source textarea exits codeview.** (`key.code.ESCAPE` = 27.)

Note: This `keyup` listener is bound once at init and persists for the lifetime of the module (it is *not* the CodeMirror instance — CodeMirror intercepts its own keys, so ESC-to-exit via this handler effectively applies to the plain-textarea path; the CodeMirror DOM textarea is hidden/replaced).

### `toggle()`

- If `isActivated()` → `deactivate()`, else `activate()`.
- After toggling (unconditionally), fires `this.context.triggerEvent('codeview.toggled')`. → callback `onCodeviewToggled` (per the camelCase event→callback mapping) and jQuery event `summernote.codeview.toggled`. Port must emit a `codeview.toggled` event after every toggle.

This is the method wired to the toolbar/air "codeview" button (`click: createInvokeHandler('codeview.toggle')`, see Buttons below).

### `activate()` — enter source mode

Order is significant:
1. `this.$codable.val(dom.html(this.$editable, this.options.prettifyHtml))` — seed the textarea with the editable's HTML.
   - `dom.html($node, isNewlineOnBlock)`: returns `$node.html()` (or `.val()` if the node is a TEXTAREA); when `isNewlineOnBlock` is truthy, inserts `\n` after closing tags of inline containers (`DIV`, `TD`, `TH`, `P`, `LI`, `H1-7` — only on the *end* tag) and around block nodes (`BLOCKQUOTE`, `TABLE`, `TBODY`, `TR`, `HR`, `UL`, `OL` — both open and close), then `.trim()`s. This is a lightweight HTML pretty-printer (no reindentation, just newline insertion).
   - `options.prettifyHtml` is **not defined in `settings.js`** → default `undefined` → falsy. So by default no newline formatting is applied; HTML is dumped verbatim. (Port: treat as optional boolean, default off.)
2. `this.$codable.height(this.$editable.height())` — match the textarea height to the current editable height.
3. `this.context.invoke('toolbar.updateCodeview', true)` — disable toolbar (see Toolbar interplay).
4. `this.context.invoke('airPopover.updateCodeview', true)` — sync air popover codeview button + hide it.
5. `this.$editor.addClass('codeview')` — flip the state class (this is what `isActivated()` reads, and what CSS uses to show the textarea / hide the editable).
6. `this.$codable.trigger('focus')` — focus the textarea.
7. **CodeMirror path (if `CodeMirror` truthy):**
   - `cmEditor = CodeMirror.fromTextArea(this.$codable[0], this.options.codemirror)` — upgrade the textarea. `options.codemirror` defaults: `{ mode: 'text/html', htmlMode: true, lineNumbers: true }` (plus optional `CodeMirrorConstructor`, `tern`).
   - **Tern integration:** if `options.codemirror.tern`, create `new CodeMirror.TernServer(options.codemirror.tern)`, assign to `cmEditor.ternServer`, and on `cursorActivity` call `server.updateArgHints(cm)`.
   - Bind `cmEditor.on('blur', …)` → `triggerEvent('blur.codeview', cmEditor.getValue(), event)`.
   - Bind `cmEditor.on('change', …)` → `triggerEvent('change.codeview', cmEditor.getValue(), cmEditor)`.
   - `cmEditor.setSize(null, this.$editable.outerHeight())` — CodeMirror has no padding, so size off `outerHeight`.
   - `this.$codable.data('cmEditor', cmEditor)` — stash the instance on the node for later retrieval in `sync()`/`deactivate()`.
8. **Plain textarea path (else):**
   - Bind `$codable.on('blur', …)` → `triggerEvent('blur.codeview', this.$codable.val(), event)`.
   - Bind `$codable.on('input', …)` → `triggerEvent('change.codeview', this.$codable.val(), this.$codable)`.

Events emitted while in codeview:
- `blur.codeview` → callback `onBlurCodeview(value, event)`, jQuery `summernote.blur.codeview`. Args: `(currentSourceValue, originalEvent)`.
- `change.codeview` → callback `onChangeCodeview(value, editorOrTextarea)`, jQuery `summernote.change.codeview`. Args: `(currentSourceValue, codableNodeOrCmEditor)`.

(Port: bind `blur` and `input` on the textarea; emit `blur.codeview`/`change.codeview` with the textarea value.)

### `deactivate()` — exit source mode (the security-critical path)

Order is significant:
1. **CodeMirror teardown (if `CodeMirror` truthy):** retrieve `cmEditor = $codable.data('cmEditor')`, copy its value back into the textarea (`$codable.val(cmEditor.getValue())`), then `cmEditor.toTextArea()` (restores the plain `<textarea>`, removing CodeMirror DOM).
2. `const value = this.purify(dom.value(this.$codable, this.options.prettifyHtml) || dom.emptyPara)` — **read raw source, fall back to `dom.emptyPara` if empty, then PURIFY.**
   - `dom.value($node, stripLinebreaks)`: returns `$node.val()` for a TEXTAREA; if `stripLinebreaks` truthy, removes all `\n`/`\r` (`.replace(/[\n\r]/g, '')`). Here `stripLinebreaks` = `options.prettifyHtml` (falsy by default → linebreaks kept).
   - `dom.emptyPara` = `"<p><br></p>"` (`blankHTML` = `"<br>"`). Used when the textarea is empty/whitespace-falsy so the editable is never left truly empty.
   - `purify(value)` — see security section below.
3. `const isChange = this.$editable.html() !== value` — detect whether content actually changed (compare current editable HTML to the new purified value).
4. `this.$editable.html(value)` — write the purified HTML into the editable. **This is the only point where codeview content re-enters the WYSIWYG DOM, and it is always purified first.**
5. `this.$editable.height(this.options.height ? this.$codable.height() : 'auto')` — restore editable height: if `options.height` is set (default `null`), use the textarea's current height; otherwise `'auto'`.
6. `this.$editor.removeClass('codeview')` — clear the state class.
7. If `isChange`: `this.context.triggerEvent('change', this.$editable.html(), this.$editable)` — fire a normal content-change event (callback `onChange(contents, editable)`, jQuery `summernote.change`) **only when content actually changed.**
8. `this.$editable.trigger('focus')` — return focus to the WYSIWYG surface.
9. `this.context.invoke('toolbar.updateCodeview', false)` — re-enable toolbar.
10. `this.context.invoke('airPopover.updateCodeview', false)` — sync air popover codeview button off.

Note: `deactivate()` does **not** push to History/undo directly here; the `change` event drives downstream sync (e.g. `Context.code` setter / `AutoSync`). The change is only signaled when `isChange` is true.

### `sync(html)` — flush source ↔ model

Called by `Context.code()` getter before reading content (and elsewhere) to make sure the canonical value is current.
- `const isCodeview = this.isActivated()`. If not in codeview, **does nothing.**
- If in codeview:
  - If `html` argument provided (truthy):
    - CodeMirror path: `$codable.data('cmEditor').getDoc().setValue(html)` (write into CodeMirror doc).
    - else: `$codable.val(html)` (write into textarea).
  - If no `html` argument:
    - CodeMirror path: `$codable.data('cmEditor').save()` (flush CodeMirror's content into the underlying textarea so `.val()`/`.value` is current).
    - else: **no-op** (plain textarea is already authoritative).
- **Important contract (documented in CLAUDE.md):** when codeview is active, the canonical content getter returns the textarea value, *not* the editable HTML, and these can differ until `deactivate()` purifies and writes back. `sync()` exists so the CodeMirror in-memory doc gets flushed to the textarea before a read.

(Port: `sync(html?)` — if active and `html` given, set the textarea value; if active and no `html`, no-op for the plain path. Otherwise no-op.)

### `destroy()`

- If `isActivated()`, call `deactivate()` (ensures purify-and-restore happens on teardown so content isn't lost or left unpurified).

### SECURITY — `purify(value)` (exact behavior)

Runs on `deactivate()` only (i.e., whenever raw source HTML is about to be injected into the live editable). Steps:

1. **Guard:** if `options.codeviewFilter` is falsy → return value unchanged (no filtering). Default `codeviewFilter: true`.
2. **Tag blocklist (regex strip):** `value = value.replace(options.codeviewFilterRegex, '')`.
   - Default `codeviewFilterRegex`:
     ```
     /<\/*(?:applet|b(?:ase|gsound|link)|embed|frame(?:set)?|ilayer|l(?:ayer|ink)|meta|object|s(?:cript|tyle)|t(?:itle|extarea)|xml)[^>]*?>/gi
     ```
   - Matches both opening and closing forms (`<\/*`) of: `applet`, `base`, `bgsound`, `blink`, `embed`, `frame`, `frameset`, `ilayer`, `layer`, `link`, `meta`, `object`, `script`, `style`, `title`, `textarea`, `xml`. Case-insensitive, global. Each matched tag is removed (replaced with empty string). Note this strips the *tags*, not necessarily their text content (e.g. `<script>` and `</script>` tags removed; any text between them remains as plain text).
3. **Iframe whitelist filtering:** only if `options.codeviewIframeFilter` is truthy (default `true`):
   - Build `whitelist = options.codeviewIframeWhitelistSrc.concat(options.codeviewIframeWhitelistSrcBase)`.
     - `codeviewIframeWhitelistSrc` default: `[]` (consumer-supplied extra hosts).
     - `codeviewIframeWhitelistSrcBase` default (built-in trusted embed hosts):
       `['www.youtube.com', 'www.youtube-nocookie.com', 'www.facebook.com', 'vine.co', 'instagram.com', 'player.vimeo.com', 'www.dailymotion.com', 'player.youku.com', 'jumpingbean.tv', 'v.qq.com']`.
   - `value = value.replace(/(<iframe.*?>.*?(?:<\/iframe>)?)/gi, fn)` — match every `<iframe …>…</iframe>` (closing tag optional, non-greedy, case-insensitive, global). For each matched iframe `tag`:
     - **Duplicate-`src` defense:** if the tag matches `/<.+src(?==?('|"|\s)?)[\s\S]+src(?=('|"|\s)?)[^>]*?>/i` (i.e. it contains two `src` occurrences — an attribute-injection / parser-confusion vector), return `''` (remove the iframe entirely).
     - Otherwise, iterate `whitelist`; for each `src` host, build regex:
       `new RegExp('src="(https?:)?\/\/' + src.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\/(.+)"')`
       — i.e. `src="[http(s):]//<escaped-host>/<something>"` (the host is regex-escaped; protocol optional/scheme-relative allowed). If the iframe's `src` matches any whitelisted host, return `tag` unchanged (keep it).
     - If no whitelist host matches → return `''` (remove the iframe).
   - Net effect: **any iframe whose `src` host is not in the whitelist is removed; any iframe with a duplicated `src` attribute is removed.**
4. Return the (possibly modified) `value`.

Port requirements: implement `purify` with the exact same default regex and whitelist semantics. Because the port has no jQuery and replaces `.html()` assignment, the purify must run on the raw string *before* it is parsed/inserted into the DOM. The host-escaping (`replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')`) and scheme-relative allowance must be preserved exactly to avoid widening the trust set.

### Toolbar / Air interplay during codeview

When codeview activates/deactivates it calls `toolbar.updateCodeview(bool)` and `airPopover.updateCodeview(bool)`:

- **`Toolbar.updateCodeview(isCodeview)`** (`src/js/module/Toolbar.js`):
  - `ui.toggleBtnActive($toolbar.find('.btn-codeview'), isCodeview)` — toggle the active/pressed state of the codeview toggle button (class `.btn-codeview`).
  - If `isCodeview` → `this.deactivate()`; else `this.activate()`.
  - `Toolbar.activate(isIncludeCodeview)` / `deactivate(isIncludeCodeview)`: select `$toolbar.find('button')`; if **not** `isIncludeCodeview`, exclude buttons with class `.note-codeview-keep` (`$btn.not('.note-codeview-keep')`), then `ui.toggleBtn($btn, enabled)`. So entering codeview **disables every toolbar button except those flagged `.note-codeview-keep`** (the codeview toggle and fullscreen buttons keep working so you can leave codeview / go fullscreen).
  - Note the naming inversion: `Codeview.activate()` (enter source) → `toolbar.updateCodeview(true)` → `Toolbar.deactivate()` (disable buttons). Keep this mapping straight in the port.
- **Buttons that stay enabled in codeview** (`Buttons.js`): the codeview button (`className: 'btn-codeview note-codeview-keep'`) and the fullscreen button (`className: 'btn-fullscreen note-codeview-keep'`). Both carry `note-codeview-keep`.
  - Codeview button: `contents: ui.icon(options.icons.code)`, `tooltip: lang.options.codeview`, `click → createInvokeHandler('codeview.toggle')`.
  - Fullscreen button: `contents: ui.icon(options.icons.arrowsAlt)`, `tooltip: lang.options.fullscreen`, `click → createInvokeHandler('fullscreen.toggle')`.
- **`options.codeviewKeepButton`** (default `false`): a related toolbar option (consumed in Toolbar/Buttons) governing whether the codeview button itself stays visible/enabled. Default off. (Mentioned for completeness; the `.note-codeview-keep` class is the actual mechanism in the activate/deactivate exclusion.)
- **`AirPopover.updateCodeview(isCodeview)`** — see AirPopover section.

### i18n lang keys (Codeview)
Codeview.js itself references **no** lang keys. The associated button labels (in Buttons.js) use: `lang.options.codeview`, `lang.options.fullscreen`.

### Icon class names (Codeview)
Codeview.js references no icons directly. Button icons (Buttons.js): `options.icons.code` (codeview), `options.icons.arrowsAlt` (fullscreen) — resolved to `note-icon-*` classes via the icons option map.

### Keyboard
- **ESC** (keyCode 27) in the codable textarea → `deactivate()` (exit codeview). Bound in `initialize()`.

### DOM / class names (Codeview)
- Root editor element: `.note-editor`; codeview state class toggled on it: `codeview`.
- Editable: `layoutInfo.editable` (`.note-editable`, contentEditable div).
- Codable: `layoutInfo.codable` (`.note-codable`, `<textarea>`).
- Codeview toggle button: `.btn-codeview` (+ `.note-codeview-keep`).
- Buttons excluded from disable: `.note-codeview-keep`.

### Options consumed (Codeview) with defaults
| Option | Default | Use |
|---|---|---|
| `codemirror` | `{ mode:'text/html', htmlMode:true, lineNumbers:true }` | CodeMirror init opts; `.CodeMirrorConstructor` and `.tern` optional sub-keys |
| `prettifyHtml` | `undefined` (falsy) | newline formatting on activate; strip-linebreaks on deactivate read |
| `height` | `null` | on deactivate, decides editable height (codable height vs `'auto'`) |
| `codeviewFilter` | `true` | master switch for purify |
| `codeviewFilterRegex` | (tag blocklist regex above) | tags stripped |
| `codeviewIframeFilter` | `true` | enable iframe whitelist filtering |
| `codeviewIframeWhitelistSrc` | `[]` | extra trusted iframe hosts |
| `codeviewIframeWhitelistSrcBase` | (10-host list above) | built-in trusted iframe hosts |
| `codeviewKeepButton` | `false` | keep codeview button active (toolbar) |

### Events emitted (Codeview)
- `codeview.toggled` — after every `toggle()`.
- `blur.codeview (value, event)` — textarea/CodeMirror blur.
- `change.codeview (value, node)` — textarea `input` / CodeMirror `change`.
- `change (html, $editable)` — on `deactivate()` only if content changed.

---

## AirPopover (`src/js/module/AirPopover.js`)

AirPopover implements "air mode": no fixed toolbar; instead a floating popover appears at the current text selection and carries the toolbar buttons (configured by `options.popover.air`). It is only active when `options.airMode` is true.

### Constants
- `AIRMODE_POPOVER_X_OFFSET = -5`
- `AIRMODE_POPOVER_Y_OFFSET = 5`
These nudge the popover relative to the computed anchor point (left −5px, top +5px).

### Construction (constructor)
- `this.context`
- `this.ui = $.summernote.ui` — the active theme UI factory (global). Port: inject the UI/render layer.
- `this.options = context.options`
- State:
  - `this.hidable = true` — guards `hide()`; toggled false while interacting with the popover itself (see mousedown/mouseup below) so a blur doesn't dismiss it mid-click.
  - `this.onContextmenu = false` — set true when a contextmenu opened the popover, consumed/cleared on the next keyup/mouseup/scroll so that event doesn't immediately re-`update()`.
  - `this.pageX = null`, `this.pageY = null` — last-known anchor coordinates (page-relative).

### Events bound (`this.events`) — auto-subscribed via the module `events` contract

1. **`summernote.contextmenu`** `(event)`:
   - Only if `options.editing` is truthy. **NOTE:** `options.editing` defaults to `true` (settings.js line 40); it gates whether air interactions run.
   - `event.preventDefault()`, `event.stopPropagation()` — suppress the native context menu.
   - `this.onContextmenu = true`.
   - `this.update(true)` — force-open the popover (forcelyOpen, even on a collapsed selection).

2. **`summernote.mousedown`** `(we, event)`:
   - Record `this.pageX = event.pageX`, `this.pageY = event.pageY`. (Captures the press point for later positioning.) `we` is the wrapped/custom-event arg; `event` is the native event.

3. **`summernote.keyup summernote.mouseup summernote.scroll`** `(we, event)` — the primary show trigger:
   - Only if `options.editing` **and** `!this.onContextmenu`:
     - If `event.type == 'keyup'`: derive anchor from the selection's word range.
       - `range = context.invoke('editor.getLastRange')`
       - `wordRange = range.getWordRange()`
       - `bnd = func.rect2bnd(lists.last(wordRange.getClientRects()))` — take the **last** client rect of the word range, convert to a bound.
         - `func.rect2bnd(rect)`: if `rect` falsy → `{top:0,left:0,width:0,height:0}`; else `{ top: rect.top + document.scrollTop, left: rect.left + document.scrollLeft, width: rect.right-rect.left, height: rect.bottom-rect.top }` (page coordinates).
       - `this.pageX = bnd.left`, `this.pageY = bnd.top`. (Keyboard caret → anchor at the word's last rect, page-relative.)
     - Else (mouseup / scroll): `this.pageX = event.pageX`, `this.pageY = event.pageY` (anchor at pointer).
     - `this.update()` (no force; only shows on non-collapsed selection).
   - Always (after the conditional): `this.onContextmenu = false` (consume the contextmenu flag).

4. **`summernote.disable summernote.change summernote.dialog.shown summernote.blur`** `()`:
   - `this.hide()` — dismiss the air popover when the editor is disabled, content changes, a dialog opens, or the editor blurs.

5. **`summernote.focusout`** `()`:
   - If the popover is **not** itself active/focused (`!this.$popover.is(':active,:focus')`) → `this.hide()`. (Don't hide if focus moved into the popover.)

### `shouldInitialize()`
Returns `this.options.airMode && !lists.isEmpty(this.options.popover.air)`. So the module is only initialized when air mode is on **and** the air popover button config is non-empty. Otherwise `initialize`/`destroy`/events are skipped entirely.
- `options.airMode` default: `false`.
- `options.popover.air` default (the air toolbar content — array of `[group, [buttonNames]]` tuples):
  ```
  [
    ['color', ['color']],
    ['font', ['bold', 'underline', 'clear']],
    ['para', ['ul', 'paragraph']],
    ['table', ['table']],
    ['insert', ['link', 'picture']],
    ['view', ['fullscreen', 'codeview']],
  ]
  ```

### `initialize()`
1. `this.$popover = this.ui.popover({ className: 'note-air-popover' }).render().appendTo(this.options.container)` — create the popover DOM, class `note-air-popover`, attach to `options.container` (default `null` → typically resolves to body/editor container; consumers may set `dialogsInBody`/`container`).
2. `const $content = this.$popover.find('.popover-content,.note-popover-content')` — locate the content slot (Bootstrap uses `.popover-content`, lite uses `.note-popover-content`).
3. `this.context.invoke('buttons.build', $content, this.options.popover.air)` — build the configured button groups into the popover content. (`buttons.build($container, groupTuples)` renders `[group, [names]]` into `.note-btn-group`s of buttons resolved from `button.<name>` memos.)
4. `this.$popover.on('mousedown', () => { this.hidable = false; })` — while pressing inside the popover, suppress hide-on-blur (a `summernote.blur` fires when focus leaves the editable to click a button).
5. `this.$popover.on('mouseup', () => { this.hidable = true; })` — re-enable hiding after the press is handled.

### `destroy()`
- `this.$popover.remove()`.

### `update(forcelyOpen)` — positioning / show decision
1. `const styleInfo = this.context.invoke('editor.currentStyle')` — current selection + format snapshot. Must contain `.range` (a `WrappedRange`).
2. **Show condition:** `if (styleInfo.range && (!styleInfo.range.isCollapsed() || forcelyOpen))`:
   - i.e. show only when there is a range **and** (the selection is non-collapsed **or** `forcelyOpen` was passed — the contextmenu path forces open even on a caret).
   - Compute anchor `rect = { left: this.pageX, top: this.pageY }`.
   - `const containerOffset = $(this.options.container).offset()` — convert page coords to container-relative: `rect.top -= containerOffset.top; rect.left -= containerOffset.left`.
   - Apply CSS to `$popover`:
     - `display: 'block'`
     - `left: Math.max(rect.left, 0) + AIRMODE_POPOVER_X_OFFSET` (clamp left ≥ 0, then −5)
     - `top: rect.top + AIRMODE_POPOVER_Y_OFFSET` (+5)
   - `this.context.invoke('buttons.updateCurrentStyle', this.$popover)` — refresh active/pressed states of the popover buttons (bold/italic/list/etc.) to reflect `styleInfo`.
3. **Else** (no range, or collapsed and not forced): `this.hide()`.

### `updateCodeview(isCodeview)` — called by Codeview activate/deactivate
- `this.ui.toggleBtnActive(this.$popover.find('.btn-codeview'), isCodeview)` — toggle active state of the air popover's codeview button.
- If `isCodeview` → `this.hide()` (hide the air popover while in source mode).

### `hide()`
- `if (this.hidable) this.$popover.hide()`. The `hidable` flag (toggled by the popover's own mousedown/mouseup) prevents the popover from vanishing when you click one of its buttons (which blurs the editable and would otherwise fire a hide).

### DOM / class names (AirPopover)
- Popover root: `.note-air-popover` (also carries the theme's generic popover classes).
- Content slot: `.popover-content` (bs) / `.note-popover-content` (lite).
- Codeview button inside it: `.btn-codeview`.
- Buttons rendered from `options.popover.air` via `buttons.build` (groups → `.note-btn-group` of `.note-btn`s).

### Editor commands invoked (AirPopover) with arg shapes
- `editor.getLastRange()` → `WrappedRange` (keyup anchor derivation).
- `editor.currentStyle()` → `{ range, ... }` style snapshot (show decision + button state).
- `buttons.build($content, options.popover.air)` → render air buttons.
- `buttons.updateCurrentStyle($popover)` → refresh button active states.
- (Air buttons themselves invoke their own editor commands via their `button.<name>` memos — e.g. `editor.bold`, `editor.insertUnorderedList`, `fullscreen.toggle`, `codeview.toggle`, `linkDialog.show`, etc. — defined in Buttons.js, not here.)

### Options consumed (AirPopover) with defaults
| Option | Default | Use |
|---|---|---|
| `airMode` | `false` | gates `shouldInitialize` |
| `popover.air` | (6-group array above) | air toolbar content; gates `shouldInitialize` (must be non-empty) |
| `editing` | `true` | gates contextmenu + keyup/mouseup/scroll handlers |
| `container` | `null` | popover mount point + offset basis for positioning |

### Events bound / triggered (AirPopover)
Listens to: `summernote.contextmenu`, `summernote.mousedown`, `summernote.keyup`, `summernote.mouseup`, `summernote.scroll`, `summernote.disable`, `summernote.change`, `summernote.dialog.shown`, `summernote.blur`, `summernote.focusout`. Plus raw DOM `mousedown`/`mouseup` on its own `$popover`. Emits no `triggerEvent`s of its own (it only manipulates DOM and invokes other modules).

### i18n lang keys (AirPopover)
AirPopover.js references **none directly**; the air buttons it builds use the same lang keys as their toolbar counterparts (e.g. `lang.font.bold`, `lang.lists.unordered`, `lang.options.fullscreen`, `lang.options.codeview`, `lang.link.link`, `lang.image.image`, `lang.color.*`, `lang.style.p`, `lang.table.table`) via Buttons.js.

### Icon class names (AirPopover)
None directly in AirPopover.js; icons come from the built buttons (`options.icons.*`).

### Non-obvious behavior / ordering / quirks (both modules)
- **Naming inversion** between Codeview and Toolbar: `Codeview.activate()` (enter source) → `toolbar.updateCodeview(true)` → `Toolbar.deactivate()` (disable buttons). Don't conflate the two `activate`s.
- **Purify runs only on exit** (`deactivate`), never on entry — so the textarea can hold dangerous markup while editing source; it's neutralized only when written back to the editable. Port must keep purify on the write-back path and never bypass it (including `destroy`).
- **Empty-source fallback:** empty textarea → `dom.emptyPara` (`<p><br></p>`), so the editable is never left empty.
- **`change` only fires when content actually differs** on codeview exit (`isChange` guard) — avoids spurious undo/change churn from merely toggling.
- **AirPopover `hidable` dance:** without the popover-mousedown→`hidable=false` / mouseup→`hidable=true`, clicking a popover button would blur the editable, fire `summernote.blur`, and hide the popover before the click registers. Port must replicate this guard (or equivalent: ignore blur when the related target is inside the popover).
- **Contextmenu flag (`onContextmenu`)** prevents the keyup/mouseup that accompanies a right-click from immediately re-running `update()` and repositioning/closing the just-opened popover.
- **keyup vs pointer anchoring:** keyboard selection anchors at the *last* client rect of the *word range* (so the popover tracks the caret/word, not a stale mouse position); pointer events anchor at `pageX/pageY`. `rect2bnd` adds document scroll to make coordinates page-absolute, then `update()` subtracts the container offset to make them container-relative.
- **`shouldInitialize` short-circuit:** in a non-air, normal-toolbar editor, AirPopover does nothing (no DOM, no listeners). The fixed Toolbar handles button rendering instead.
- **CodeMirror is fully optional** and absent in the no-deps port; only the plain-textarea path (`input`/`blur` events, `$codable.val()`, ESC-to-exit) needs porting.

### Relevant file paths
- `c:\github\summernote-react\src\js\module\Codeview.js`
- `c:\github\summernote-react\src\js\module\AirPopover.js`
- `c:\github\summernote-react\src\js\settings.js` (option defaults: lines ~40 `editing`, 77 `codeviewKeepButton`, 90–112 `popover`/`popover.air`, 119 `airMode`, 122–124 `width`/`height`, 234–255 `codemirror`/`codeviewFilter*`)
- `c:\github\summernote-react\src\js\core\dom.js` (`value` ~1062, `html` ~1078, `emptyPara`/`blank` ~1138–1140)
- `c:\github\summernote-react\src\js\core\func.js` (`rect2bnd` ~90)
- `c:\github\summernote-react\src\js\module\Toolbar.js` (`updateCodeview`/`activate`/`deactivate` 126–149)
- `c:\github\summernote-react\src\js\module\Buttons.js` (codeview/fullscreen buttons, `note-codeview-keep` 601–616)

---

<!-- ===== lite-ui ===== -->
## Summernote Lite Theme — `ui_template` Factory + Standalone DropdownUI / ModalUI / TooltipUI

This is the implementation contract for the **lite (no-Bootstrap)** UI layer of summernote. It exports a single factory `ui(editorOptions)` returning an object of UI-builder methods consumed by `Context.createLayout()` and by every module's `memo('button.*')` / dialog / popover code. The React+TS port must reproduce every class string, markup shape, event, and behavior described below with zero external deps (no jQuery, no Bootstrap, no `execCommand` reliance in this layer — this layer is pure DOM/markup + show/hide/position logic).

> Renderer contract: each `renderer.create(markup, callback)` produces a **factory** `f(options | childrenArray)` returning a `renderable` whose `.render()` returns the DOM node. Children passed as an array are appended; a `callback(node, options)` runs after markup + children are mounted; `options.callback` (when present) also runs. In the port, model a `renderable` as `{ render(): HTMLElement }` and support both `f(optionsObject)` and `f(childArray)` call forms. Class strings and structure below are normative.

---

### 1. Global registration

At module load the lite entry registers:
- `$.summernote.ui_template = ui` (the factory below)
- `$.summernote.interface = 'lite'`

`Context` later does `ui = ui_template(options)` once per editor and caches it. (Port note: `$.summernote.ui` is global and overwritten per Context — multiple differing themes on one page are unsupported.)

---

### 2. Base renderable factories (static markup)

Each is `renderer.create(<markup>)` and may take a children array.

| Factory | Root markup (exact) |
|---|---|
| `editor` | `<div class="note-editor note-frame"></div>` |
| `toolbar` | `<div class="note-toolbar" role="toolbar"></div>` |
| `editingArea` | `<div class="note-editing-area"></div>` |
| `codable` | `<textarea class="note-codable" aria-multiline="true"></textarea>` |
| `editable` | `<div class="note-editable" contentEditable="true" role="textbox" aria-multiline="true"></div>` |
| `statusbar` | multi-node (see below) |
| `airEditor` | `<div class="note-editor note-airframe"></div>` |
| `airEditable` | multi-node (see below) |
| `buttonGroup` | `<div class="note-btn-group"></div>` |

**`statusbar`** renders this exact concatenated markup (two top-level siblings):
```
<output class="note-status-output" role="status" aria-live="polite"></output>
<div class="note-statusbar" role="status">
  <div class="note-resizebar" aria-label="resize">
    <div class="note-icon-bar"></div>
    <div class="note-icon-bar"></div>
    <div class="note-icon-bar"></div>
  </div>
</div>
```

**`airEditable`** renders:
```
<div class="note-editable" contentEditable="true" role="textbox" aria-multiline="true"></div>
<output class="note-status-output" role="status" aria-live="polite"></output>
```

---

### 3. `button(options)` factory

Root: `<button type="button" class="note-btn" tabindex="-1"></button>`. Callback `(node, options)` does, in order:

1. **Tooltip**: if `options.tooltip` truthy:
   - Set attribute `aria-label = options.tooltip`.
   - Let `container = options.container`. If `container` exists and resolves to ≥1 element:
     - Instantiate `new TooltipUI($node, { title: options.tooltip, container })` and store it on the node under data key `'_lite_tooltip'`.
     - Bind `click` on the button → calls stored tooltip's `.hide()` (so the tooltip disappears the moment the button is clicked).
   - Else: `console.warn('Summernote: Tooltip container not found, please set the container property for the Summernote Config, skipping tooltip initialization')` and no tooltip is created.
2. **Contents**: if `options.contents` provided, set as inner HTML.
3. **Dropdown toggle**: if `options.data && options.data.toggle === 'dropdown'`, instantiate `new DropdownUI($node, { container: options.container })` and store under data key `'_lite_dropdown'`.
4. **Codeview keep**: if `options.codeviewKeepButton`, add class `note-codeview-keep` (marks buttons that stay enabled while codeview is active).

`options` fields consumed: `tooltip`, `container`, `contents`, `data.toggle`, `codeviewKeepButton`. (Other generic renderer fields used elsewhere: `className`, `click`, `callback`.) Note the renderer also applies `options.className` (added to the button) and wires `options.click` as a click handler — these are renderer-level conventions used heavily by callers (e.g. `colorDropdownButton` passes `click`/`callback`).

> Port note: the `ui.button` wrapper (section 12) injects `container: options.container || editorOptions.container` so every button inherits the editor-level tooltip container by default.

---

### 4. `dropdown(options)` factory

Root: `<div class="note-dropdown-menu" role="list"></div>`. Callback:

- If `options.items` is an **array**: map each item to an anchor:
  ```
  <a class="note-dropdown-item" href="#" data-value="<value>" role="listitem" aria-label="<value>"></a>
  ```
  - `value = typeof item === 'string' ? item : (item.value || '')`.
  - `content = options.template ? options.template(item) : item`. Set as the anchor's inner HTML.
  - Store the original `item` object on the anchor under data key `'item'`.
- If `options.items` is **not** an array, use it verbatim as the menu's content (raw HTML string or child nodes — used by table/color dropdowns).
- Set the menu's `aria-label = options.title`.
- **Delegated click** on `> .note-dropdown-item`: read `item = $a.data('item')`, `value = $a.data('value')`; if `item.click` exists call `item.click($a)`, else if `options.itemClick` exists call `options.itemClick(e, item, value)`.
- If `options.codeviewKeepButton`, add class `note-codeview-keep`.

`options` consumed: `items`, `template`, `title`, `itemClick`, `codeviewKeepButton` (also `className` via renderer).

---

### 5. `dropdownCheck(options)` factory

Root: `<div class="note-dropdown-menu note-check" role="list"></div>`. Same as `dropdown` except each item anchor's inner HTML is `[ icon(options.checkClassName), ' ', content ]` — i.e. a leading check icon (whose class is `options.checkClassName`, e.g. `note-icon-menu-check`) then a space then the content. (Bug-for-bug detail: `aria-label` here is set to the raw `item` object, not `value`.) Same delegated click and `codeviewKeepButton` handling. The active item gets class `checked` toggled by `ui.check` (section 12).

`options` consumed: `items`, `template`, `checkClassName`, `title`, `itemClick`, `codeviewKeepButton`.

---

### 6. `dropdownButtonContents(contents, options)`

Pure function (not a renderable): returns `contents + ' ' + icon(options.icons.caret, 'span')`. I.e. appends a caret icon as a `<span>` using the caret icon class from `options.icons.caret`.

---

### 7. `dropdownButton(opt, callback)` — composite

Returns a rendered `buttonGroup([ toggleButton, dropdown ], { callback })`:
- Toggle button: `button({ className: 'dropdown-toggle', contents: opt.title + ' ' + icon('note-icon-caret'), tooltip: opt.tooltip, data: { toggle: 'dropdown' } })`. So the toggle always shows `title` + a hardcoded `note-icon-caret` icon and is wired as a dropdown via DropdownUI.
- Dropdown: `dropdown({ className: opt.className, items: opt.items, template: opt.template, itemClick: opt.itemClick })`.

`opt` consumed: `title`, `tooltip`, `className`, `items`, `template`, `itemClick`.

---

### 8. `dropdownCheckButton(opt, callback)` — composite

Same as `dropdownButton` but the menu is `dropdownCheck` and additionally passes `checkClassName: opt.checkClassName`. Toggle button identical (`title` + `note-icon-caret`, `data.toggle=dropdown`).

`opt` consumed: `title`, `tooltip`, `className`, `checkClassName`, `items`, `template`, `itemClick`.

---

### 9. `paragraphDropdownButton(opt)` — composite

Returns `buttonGroup([ toggleButton, dropdown([ alignGroup, listGroup ]) ])`:
- Toggle button: same pattern (`opt.title` + `note-icon-caret`, `data.toggle=dropdown`, `tooltip`).
- Dropdown contains **two** nested button groups:
  - `buttonGroup({ className: 'note-align', children: opt.items[0] })`
  - `buttonGroup({ className: 'note-list', children: opt.items[1] })`
- So `opt.items` is a 2-element array: `[ alignButtonsArray, listButtonsArray ]`.

`opt` consumed: `title`, `tooltip`, `items[0]`, `items[1]`.

---

### 10. Table dropdown — `tableDropdownButton(opt)` + `tableMoveHandler`

**`tableDropdownButton(opt)`** returns `buttonGroup([ toggleButton, dropdown ], { callback })`:
- Toggle button: standard (`opt.title` + `note-icon-caret`, `data.toggle=dropdown`, `tooltip`).
- Dropdown `className: 'note-table'`, items = exact markup:
  ```
  <div class="note-dimension-picker">
    <div class="note-dimension-picker-mousecatcher" data-event="insertTable" data-value="1x1"></div>
    <div class="note-dimension-picker-highlighted"></div>
    <div class="note-dimension-picker-unhighlighted"></div>
  </div>
  <div class="note-dimension-display">1 x 1</div>
  ```
- `callback($node)`: find `.note-dimension-picker-mousecatcher`, set its CSS `width = opt.col + 'em'`, `height = opt.row + 'em'`; bind `mouseup → opt.itemClick`; bind `mousemove → tableMoveHandler(e, opt.col, opt.row)`.

`opt` consumed: `title`, `tooltip`, `col`, `row`, `itemClick`.

**`tableMoveHandler(event, col, row)`** — the live grid-size picker:
- `PX_PER_EM = 18`.
- `$picker = event.target.parentNode` (target is the mousecatcher). `$dimensionDisplay = $picker.next()` (the `.note-dimension-display`). Locate `.note-dimension-picker-mousecatcher`, `.note-dimension-picker-highlighted`, `.note-dimension-picker-unhighlighted` within picker.
- Compute pointer offset relative to the catcher: if `event.offsetX === undefined` (Firefox quirk), compute from `event.pageX/pageY` minus the catcher's page offset; else use `event.offsetX/offsetY`.
- `dim.c = Math.ceil(offsetX / 18) || 1`, `dim.r = Math.ceil(offsetY / 18) || 1` (min 1×1).
- Set highlighted block CSS `width = dim.c + 'em'`, `height = dim.r + 'em'`.
- Store `data-value = "<c>x<r>"` on the catcher (this is what `mouseup`→`itemClick` reads, e.g. value `"3x2"`).
- If `dim.c > 3 && dim.c < col`: set unhighlighted `width = (dim.c + 1) + 'em'`. If `dim.r > 3 && dim.r < row`: set unhighlighted `height = (dim.r + 1) + 'em'` (grows the “grid” preview one cell beyond cursor up to max col/row).
- Update `$dimensionDisplay` text to `"<c> x <r>"`.

---

### 11. `palette(options)` factory + `colorDropdownButton`

**`palette`** root: `<div class="note-color-palette"></div>`. Callback builds rows:
- For each `row` in `options.colors` (array of arrays): build a `<div class="note-color-row">…</div>` containing one button per color:
  ```
  <button type="button" class="note-btn note-color-btn"
          style="background-color:<color>"
          data-event="<eventName>" data-value="<color>"
          data-title="<colorName>" aria-label="<colorName>"
          data-toggle="button" tabindex="-1"></button>
  ```
  where `eventName = options.eventName`, `color = options.colors[row][col]`, `colorName = options.colorsName[row][col]`.
- After mounting, for each `.note-color-btn`: if `options.container` resolves to ≥1 element, attach `new TooltipUI($btn, { container })` stored under `'_lite_tooltip'` (title falls back to the button's `title`/`data-title`); else `console.warn('Summernote: Tooltip container not found, skipping tooltip initialization for color buttons')`.

`options` consumed: `colors` (2D array), `colorsName` (2D array, parallel), `eventName`, `container`.

**`colorDropdownButton(opt, type)`** — `type` is `'fore'`, `'back'`, or `'foreColor'`. Returns `buttonGroup({ className: 'note-color', children: [...] })` with three children:

1. **Current-color button** `button({ className: 'note-current-color-button', contents: opt.title, tooltip: opt.lang.color.recent, click: opt.currentClick, callback })`. Callback finds `.note-recent-color` inside; if `type !== 'foreColor'` sets its `background-color: #FFFF00` and sets button attr `data-backColor = #FFFF00` (default recent back-color = yellow). `opt.title` is expected to embed the `.note-recent-color` element.
2. **Dropdown toggle** `button({ className: 'dropdown-toggle', contents: icon('note-icon-caret'), tooltip: opt.lang.color.more, data: { toggle: 'dropdown' } })`.
3. **Dropdown** with this exact items markup (two sub-groups):
   - Background group `<div class="note-btn-group btn-background-color">`:
     - `<div class="note-palette-title">{opt.lang.color.background}</div>`
     - reset button `<button … class="note-color-reset note-btn note-btn-block" data-event="backColor" data-value="transparent">{opt.lang.color.transparent}</button>`
     - `<div class="note-holder" data-event="backColor"></div>` (palette injected here)
     - custom-color row `<div class="btn-sm">`: `<input type="color" id="html5bcp" class="note-btn btn-default" value="#21104A" style="width:100%;" data-value="cp">` + `<button … class="note-color-reset btn" data-event="backColor" data-value="cpbackColor">{opt.lang.color.cpSelect}</button>`
   - Foreground group `<div class="note-btn-group btn-foreground-color">`:
     - `<div class="note-palette-title">{opt.lang.color.foreground}</div>`
     - reset button `<button … class="note-color-reset note-btn note-btn-block" data-event="removeFormat" data-value="foreColor">{opt.lang.color.resetToDefault}</button>`
     - `<div class="note-holder" data-event="foreColor"></div>`
     - custom-color row `<div class="btn-sm">`: `<input type="color" id="html5fcp" class="note-btn btn-default" value="#21104A" style="width:100%;" data-value="cp">` + `<button … class="note-color-reset btn" data-event="foreColor" data-value="cpforeColor">{opt.lang.color.cpSelect}</button>`
   - **Dropdown callback**: for each `.note-holder`, append `palette({ colors: opt.colors, eventName: $holder.data('event') }).render()`. Then if `type === 'fore'`: hide `.btn-background-color`, set dropdown `min-width: 210px`. If `type === 'back'`: hide `.btn-foreground-color`, set `min-width: 210px`. (When neither, both groups show — combined color picker.)
   - **Dropdown click handler** (`options.click`): `$button = event.target`; read `eventName = data-event`, `value = data-value`; read both color-input values `foreinput = #html5fcp.value`, `backinput = #html5bcp.value`. Then:
     - `value === 'cp'` → `event.stopPropagation()` (clicking the native color input must NOT close the dropdown).
     - `value === 'cpbackColor'` → `value = backinput`.
     - `value === 'cpforeColor'` → `value = foreinput`.
     - If `eventName && value`: `key = eventName === 'backColor' ? 'background-color' : 'color'`; within the enclosing `.note-color`, set `.note-recent-color` CSS `key=value` and set the `.note-current-color-button` attr `data-<eventName>=value`. Then dispatch: `type === 'fore'` → `opt.itemClick('foreColor', value)`; `type === 'back'` → `opt.itemClick('backColor', value)`; else → `opt.itemClick(eventName, value)`.

`opt` consumed: `title`, `colors`, `currentClick`, `itemClick`, `lang.color.{recent,more,background,foreground,transparent,cpSelect,resetToDefault}`.

IDs `html5bcp` and `html5fcp` are **hardcoded** (DOM-global). Port must namespace these per editor to avoid collisions with multiple editors on a page.

---

### 12. `dialog(options)` factory + dialog builders

**`dialog`** root: `<div class="note-modal" aria-hidden="false" tabindex="-1" role="dialog"></div>`. Callback:
- If `options.fade`, add class `fade`.
- Set `aria-label = options.title`.
- Inner HTML:
  ```
  <div class="note-modal-content">
    [ if options.title:
      <div class="note-modal-header">
        <button type="button" class="close" aria-label="Close" aria-hidden="true"><i class="note-icon-close"></i></button>
        <h4 class="note-modal-title">{options.title}</h4>
      </div>
    ]
    <div class="note-modal-body">{options.body}</div>
    [ if options.footer: <div class="note-modal-footer">{options.footer}</div> ]
  </div>
  ```
- Instantiate `new ModalUI($node, options)` and store under data key `'modal'`.

`options` consumed: `fade`, `title`, `body`, `footer` (and `className` via renderer — e.g. `linkDialog` passes `className: 'link-dialog'`).

#### 12a. `videoDialog(opt)`
Body: one form group with label `for="note-dialog-video-url-{opt.id}"` text `{opt.lang.video.url}` plus a `<small class="text-muted">{opt.lang.video.providers}</small>`, and input `<input id="note-dialog-video-url-{opt.id}" class="note-video-url note-input" type="text"/>`. Footer: `<button … class="note-btn note-btn-primary note-video-btn disabled" disabled>{opt.lang.video.insert}</button>`. Dialog `title = opt.lang.video.insert`, `fade = opt.fade`.

#### 12b. `imageDialog(opt)`
Body, two groups:
- `<div class="note-form-group note-group-select-from-files">`: label `for="note-dialog-image-file-{id}"` = `{opt.lang.image.selectFromFiles}`; input `<input id="note-dialog-image-file-{id}" class="note-note-image-input note-input" type="file" name="files" accept="image/*" multiple="multiple"/>`; then `{opt.imageLimitation}` (raw HTML, the size-limit notice).
- `<div class="note-form-group">`: label `for="note-dialog-image-url-{id}"` = `{opt.lang.image.url}`; input `<input id="note-dialog-image-url-{id}" class="note-image-url note-input" type="text"/>`.
Footer: `<button … class="note-btn note-btn-primary note-btn-large note-image-btn disabled" disabled>{opt.lang.image.insert}</button>`. Dialog `title = opt.lang.image.insert`, `fade = opt.fade`. (Note input class is literally `note-note-image-input`.)

#### 12c. `linkDialog(opt)`
Body:
- group: label `for="note-dialog-link-txt-{id}"` = `{opt.lang.link.textToDisplay}`; input `<input id="note-dialog-link-txt-{id}" class="note-link-text note-input" type="text"/>`.
- group: label `for="note-dialog-link-url-{id}"` = `{opt.lang.link.url}`; input `<input id="note-dialog-link-url-{id}" class="note-link-url note-input" type="text" value="http://"/>` (default value `http://`).
- if **not** `opt.disableLinkTarget`: `<div class="checkbox"><label for="note-dialog-link-nw-{id}"><input id="note-dialog-link-nw-{id}" type="checkbox" checked> {opt.lang.link.openInNewWindow}</label></div>` (checkbox checked by default).
Footer: `<button … class="note-btn note-btn-primary note-link-btn disabled" disabled>{opt.lang.link.insert}</button>`. Dialog `className: 'link-dialog'`, `title = opt.lang.link.insert`, `fade = opt.fade`.

`opt` for the three builders consumes: `id`, `fade`, `imageLimitation` (image only), `disableLinkTarget` (link only), and the i18n keys listed in section 16.

---

### 13. `popover(options)` factory

Root markup:
```
<div class="note-popover bottom">
  <div class="note-popover-arrow"></div>
  <div class="popover-content note-children-container"></div>
</div>
```
Callback:
- `direction = options.direction ?? 'bottom'`; add that class to the node and **hide it** (`display:none` initially).
- If `options.hideArrow`, hide `.note-popover-arrow`.

`options` consumed: `direction`, `hideArrow`. (Content area selector used by modules: `.popover-content` / `.note-children-container`. Note `getPopoverContent` queries `.note-popover-content`, which differs — see section 12 ui methods.)

---

### 14. `checkbox(options)` factory

Root: `<div class="checkbox"></div>`. Inner HTML:
```
<label [for="note-{id}"]>
  <input role="checkbox" type="checkbox" [id="note-{id}"] [checked] aria-checked="{true|false}"/>
  {text}
</label>
```
- `for`/`id` only emitted when `options.id` present.
- `checked` attribute present when `options.checked`; `aria-checked` reflects `options.checked`.
- `text` is appended after the input.

`options` consumed: `id`, `checked`, `text`.

---

### 15. `icon(iconClassName, tagName)`

Pure function: if `iconClassName` starts with `<` (already markup) return it verbatim. Else `tagName = tagName || 'i'` and return `<{tag} class="{iconClassName}"></{tag}>`.

**Icon classes referenced literally in this file**: `note-icon-caret` (dropdown carets, hardcoded in `dropdownButton`/`dropdownCheckButton`/`paragraphDropdownButton`/`tableDropdownButton`/`colorDropdownButton`), `note-icon-close` (dialog close button, via `<i class="note-icon-close">`). Other icon classes arrive via options (`options.icons.caret` in `dropdownButtonContents`; `options.checkClassName` in `dropdownCheck`). The toolbar/popover button icons themselves come from the modules, not this file.

---

### 16. i18n lang keys referenced (exhaustive, this file)

- **video**: `lang.video.url`, `lang.video.providers`, `lang.video.insert`
- **image**: `lang.image.selectFromFiles`, `lang.image.url`, `lang.image.insert`
- **link**: `lang.link.textToDisplay`, `lang.link.url`, `lang.link.openInNewWindow`, `lang.link.insert`
- **color** (via `opt.lang.color.*`): `recent`, `more`, `background`, `foreground`, `transparent`, `cpSelect`, `resetToDefault`

(These reach the builders as `opt.lang.*`; the consuming module passes the resolved langpack.)

---

### 17. The `ui(editorOptions)` returned object — method map

Returns an object exposing every factory plus helpers:

- Pass-throughs: `editor, toolbar, editingArea, codable, editable, statusbar, airEditor, airEditable, buttonGroup, dropdown, dropdownCheck, dropdownButton, dropdownButtonContents, dropdownCheckButton, paragraphDropdownButton, tableDropdownButton, colorDropdownButton, palette, dialog, videoDialog, imageDialog, linkDialog, popover, checkbox, icon`.
- `options: editorOptions` (the resolved editor options).
- **`button(options)`** wrapper: calls base `button({ ...options, container: options.container || editorOptions.container })` — injects default tooltip container.

Helper methods:
- **`toggleBtn($btn, isEnable)`**: toggle class `disabled` (= `!isEnable`) AND set `disabled` attribute = `!isEnable`.
- **`toggleBtnActive($btn, isActive)`**: toggle class `active`.
- **`check($dom, value)`**: remove class `checked` from all `.checked`, add `checked` to `[data-value="{value}"]` (used for dropdownCheck active state).
- **`onDialogShown($dialog, handler)`**: bind one-shot listener for custom event `note.modal.show`.
- **`onDialogHidden($dialog, handler)`**: bind one-shot listener for custom event `note.modal.hide`.
- **`showDialog($dialog)`**: `$dialog.data('modal').show()`.
- **`hideDialog($dialog)`**: `$dialog.data('modal').hide()`.
- **`getPopoverContent($popover)`**: returns `$popover.find('.note-popover-content')`. (⚠️ inconsistency: the `popover` factory produces `.popover-content` / `.note-children-container`, not `.note-popover-content`. Preserve or reconcile knowingly.)
- **`getDialogBody($dialog)`**: returns `.note-modal-body`.

#### 17a. `createLayout($note)`

Builds the editor skeleton, choosing structure by options:
- **airMode**: `airEditor([ editingArea([ codable(), airEditable() ]) ])`.
- **toolbarPosition === 'bottom'**: `editor([ editingArea([ codable(), editable() ]), toolbar(), statusbar() ])`.
- **otherwise (default, top toolbar)**: `editor([ toolbar(), editingArea([ codable(), editable() ]), statusbar() ])`.

Render → `$editor.insertAfter($note)` (editor DOM is placed immediately after the original element). Returns `layoutInfo`:
```
{ note: $note, editor: $editor,
  toolbar: .note-toolbar, editingArea: .note-editing-area,
  editable: .note-editable, codable: .note-codable, statusbar: .note-statusbar }
```
(Each found by querying within `$editor`. In airMode there is no `.note-toolbar`/`.note-statusbar` so those queries are empty.)

`editorOptions` consumed by createLayout: `airMode`, `toolbarPosition` (`'bottom'` vs other), and `container` (indirectly via the button wrapper).

#### 17b. `removeLayout($note, layoutInfo)`

Teardown: copy editable HTML back into original (`$note.html(layoutInfo.editable.html())`), remove the `$editor` DOM, unbind all `summernote`-namespaced events from `$note`, and `show()` the original element (it was hidden during init).

---

### 18. `DropdownUI` — standalone (no-Bootstrap) dropdown

State model: the **`.note-btn-group`** parent toggles class `open`; the toggle button toggles class `active`; the menu (`.note-dropdown-menu`) is the toggle button's **next sibling**.

Constructor `($node, options)`: `$button = $node`; `options = { target: options.container, ...options }` (so `target` defaults to container). Calls `setEvent()`.

- **`setEvent()`**: bind `click` on `$button` → `toggle()` then `e.stopImmediatePropagation()` (prevents the document-level close handler from immediately re-closing it).
- **`clear()`**: for every currently-open group (`.note-btn-group.open`), remove `active` from its `.note-btn.active` and remove `open` from the group. (Closes all other open dropdowns.)
- **`show()`**:
  1. add `active` to button, add `open` to its parent group.
  2. `$dropdown = $button.next()` (the menu). Compute `offset = $dropdown.offset()`, `width = $dropdown.outerWidth()`, `windowWidth = window width`, `targetMarginRight = parseFloat(css('margin-right') of options.target)`.
  3. **Right-edge collision**: if `offset.left + width > windowWidth - targetMarginRight`, set menu `margin-left = windowWidth - targetMarginRight - (offset.left + width)` (a negative shift to keep it on-screen); else reset `margin-left = ''`.
- **`hide()`**: remove `active` from button, remove `open` from parent.
- **`toggle()`**: `isOpened = parent.hasClass('open')`; call `clear()` (close everything); then if it was open → `hide()`, else → `show()`. (Net effect: clicking an open toggle closes it; clicking a closed one closes others and opens this.)

**Two document-level click handlers** (namespace `click.note-dropdown-menu`), registered once at module load:
1. If the click target is **not** inside any `.note-btn-group` (`closest('.note-btn-group').length === 0`): remove `active` from all `.note-btn-group.open .note-btn.active` and remove `open` from all `.note-btn-group.open`. (Outside-click closes all dropdowns.)
2. For the `.note-dropdown-menu` the target is inside: remove `open` from its parent group and remove `active` from that group's active button. (Clicking a menu item closes that dropdown.)

> Port translation: replicate with a single global `document` click listener (added once, ref-counted/cleaned on unmount), `stopImmediatePropagation` on toggle to avoid self-close, and `getBoundingClientRect` + `window.innerWidth` for the right-edge shift. There is no flip/top placement — only horizontal clamp.

---

### 19. `ModalUI` — standalone (no-Bootstrap) modal

Constructor `($node /*, options unused */)`: `$modal = $node`; create a detached backdrop `<div class="note-modal-backdrop"></div>` (`$backdrop`).

- **`show()`**:
  1. append backdrop to `document.body` and show it.
  2. add class `open` to modal and show it (modal default CSS is hidden until `open` + display).
  3. trigger custom event `note.modal.show` on the modal (this fires the `onDialogShown` one-shot).
  4. (re)bind: `off('click','.close')` then `on('click','.close', this.hide)` — the header close button hides the modal.
  5. bind `keydown` on modal: if `event.which === 27` (Esc) → `preventDefault()` + `hide()`.
- **`hide()`**:
  1. remove `open` from modal and hide it.
  2. hide backdrop.
  3. trigger `note.modal.hide` (fires `onDialogHidden`).
  4. `off('keydown')` (unbind the Esc handler).

Custom events: **`note.modal.show`**, **`note.modal.hide`** (consumed by `ui.onDialogShown` / `ui.onDialogHidden`). No fade/animation logic here (the `fade` class is purely CSS).

> Port note: backdrop is created per ModalUI instance but appended to `body` on show; ensure it's removed/hidden on hide and cleaned on unmount. Esc handling is bound on show, unbound on hide.

---

### 20. `TooltipUI` — standalone (no-Bootstrap) tooltip

Constructor `($node, options)`:
- `options = { title:'', target: options.container, trigger:'hover focus', placement:'bottom', ...options }`.
- Build tooltip DOM (detached):
  ```
  <div class="note-tooltip">
    <div class="note-tooltip-arrow"></div>
    <div class="note-tooltip-content"></div>
  </div>
  ```
- If `trigger !== 'manual'`, split `trigger` by spaces and bind per token:
  - `'hover'` → first `off('mouseenter mouseleave')` then `mouseenter → show`, `mouseleave → hide`.
  - `'click'` → `click → toggle`.
  - `'focus'` → `focus → show`, `blur → hide`.
  - (Default `'hover focus'` binds both hover and focus.)

- **`show()`**:
  1. `offset = $node.offset()`; subtract the target's offset (`targetOffset = $(target).offset()`) so coordinates are **relative to the target container** (the container must be positioned).
  2. `title = options.title || $node.attr('title') || $node.data('title')`.
  3. `placement = options.placement || $node.data('placement')`.
  4. add `placement` class to tooltip; set `.note-tooltip-content` **text** = title (text, not HTML — XSS-safe); append tooltip to `options.target`.
  5. measure node W/H and tooltip W/H (outer), then position:
     - **bottom**: `top = offset.top + nodeHeight`, `left = offset.left + (nodeWidth/2 - tooltipWidth/2)`.
     - **top**: `top = offset.top - tooltipHeight`, same left centering.
     - **left**: `top = offset.top + (nodeHeight/2 - tooltipHeight/2)`, `left = offset.left - tooltipWidth`.
     - **right**: `top = same vertical centering`, `left = offset.left + nodeWidth`.
  6. add class `in` (CSS reveals/animates the tooltip).
- **`hide()`**: remove class `in`, then `setTimeout(() => $tooltip.remove(), 200)` (200 ms removal delay to allow fade-out; the node is recreated on next `show` via re-append — note `$tooltip` reference persists, so after removal a subsequent `show` re-appends the same detached node).
- **`toggle()`**: if tooltip has `in` → `hide()`, else `show()`.

Classes: `.note-tooltip`, `.note-tooltip-arrow`, `.note-tooltip-content`, placement classes `top|bottom|left|right`, visibility class `in`. Default placement `bottom`.

> Port translation: container must be `position: relative` (offsets are container-relative). Use `getBoundingClientRect` deltas. Bind/unbind via the same trigger tokens; default `hover focus`. The 200 ms removal-after-hide is load-bearing for the fade-out — keep it (and guard against removing a tooltip that was re-shown within the window).

---

### 21. Cross-cutting port notes / quirks

- **No Bootstrap, no jQuery dependency in target**: all three UI classes are pure show/hide/position with manual class toggling and `document`-level click delegation.
- **Class-state contract** the rest of summernote relies on: dropdown open = `.note-btn-group.open` + toggle `.active`; modal open = `.note-modal.open` + `.note-modal-backdrop` shown; tooltip shown = `.note-tooltip.in`; check item = `.note-dropdown-item.checked`; disabled button = `.note-btn.disabled` + `disabled` attr; active button = `.note-btn.active`.
- **Hardcoded global IDs** `html5bcp` / `html5fcp` in the color dropdown — must be made per-editor-unique in the port.
- **`note-note-image-input`** double-`note` class on the image-file input is intentional/existing — keep selectors consistent with the imageDialog module.
- **Positioning is manual** (no popper/flip): dropdown only clamps horizontally; tooltip uses fixed placement; modal centers via CSS.
- **`getPopoverContent` selector mismatch** (`.note-popover-content` vs the factory's `.popover-content`/`.note-children-container`) — verify against the popover modules in the port; the popover module typically appends its content container separately.
- **`data` storage keys** used as integration points: button→`_lite_tooltip`, `_lite_dropdown`; dialog→`modal`; dropdown items→`item`. Model these as instance fields/maps in the port.
- **Event names to preserve** for module compatibility: custom `note.modal.show` / `note.modal.hide`; document click namespace `click.note-dropdown-menu` (semantics, not the literal jQuery namespace).

---

<!-- ===== renderer-toolbar-layout ===== -->
I now have all the material needed. Let me produce the spec.

## Toolbar / Renderer / createLayout — Port Spec

This spec covers the toolbar UI-assembly subsystem: the `renderer.create()` component-factory pattern, how `Context` instantiates the UI and builds the layout, how `Toolbar.js` + `Buttons.js` turn `options.toolbar` (`[group, [buttonNames]]` tuples) into rendered DOM via `'button.<name>'` memo lookup, sticky/following behavior, and the `layoutInfo` shape returned by `createLayout`. Source files: `src/js/renderer.js`, `src/js/module/Toolbar.js`, `src/js/module/Buttons.js`, `src/js/Context.js`, `src/js/summernote.js`, `src/styles/lite/summernote-lite.js`, `src/js/settings.js`.

---

### 1. The `renderer.create()` component-factory pattern (`renderer.js`)

The renderer is a tiny declarative DOM-builder. Two things: a `Renderer` class and a `create` factory. **Port note: no jQuery; replace `$node` jQuery ops with native DOM (`createElement`/`innerHTML`/`classList`/`setAttribute`/`addEventListener`) or React elements. The contract below is what must be preserved.**

#### `Renderer` instance — fields
- `markup` — an HTML string template (e.g. `'<div class="note-editor note-frame"></div>'`). Parsed into a single root node via `$(markup)`.
- `children` — array of *other Renderer instances* (not DOM), each having its own `.render()`.
- `options` — the options object passed at call time.
- `callback` — a "static" callback bound at factory-definition time (2nd arg to `create`), signature `(\$node, options) => void`.

#### `Renderer.render($parent)` — exact ordered behavior
Given the parsed root node `$node`, in this order:
1. If `options.contents` is set → `$node.html(options.contents)` (replaces inner HTML).
2. If `options.className` is set → `$node.addClass(options.className)` (space-delimited add, not replace).
3. If `options.data` is set → for each key `k`→`v`, set attribute `data-<k>` = `v`.
4. If `options.click` is set → bind a `click` DOM listener = `options.click`.
5. If `this.children` is truthy → find `.note-children-container` inside `$node`; if found, render each child into that container, else render each child directly into `$node`. **Order: children appended in array order.** `.note-children-container` is how popover/wrapper markup designates the insertion slot (see popover markup which contains `<div class="popover-content note-children-container">`).
6. If factory `callback` exists → call `callback($node, options)` (the static decorator — e.g. lite `button` attaches tooltip/dropdown behavior here).
7. If `options.callback` exists → call `options.callback($node)` (the *per-call* callback — e.g. the table button uses this to wire mouse handlers to the dimension picker).
8. If `$parent` was passed → append `$node` to it.
9. Return `$node`.

Quirk: both a factory-level `callback` (step 6, gets `(node, options)`) and an instance-level `options.callback` (step 7, gets `(node)`) can run; they are distinct hooks.

#### `create(markup, callback)` — factory signature resolution
`create` returns a *factory function*. When that factory is invoked, it inspects its arguments to disambiguate `(children?, options?)`:
- `options = (typeof arguments[1] === 'object') ? arguments[1] : arguments[0]` — i.e. if a 2nd arg object is present it's options; otherwise the 1st arg is options.
- `children = Array.isArray(arguments[0]) ? arguments[0] : []` — 1st arg is children only if it's an array.
- If `options.children` is set, it overrides → `children = options.children`.
- Returns `new Renderer(markup, children, options, callback)` — **does NOT render yet**. The caller must call `.render()`.

So a factory accepts three call shapes: `factory(optionsObj)`, `factory([childRenderers])`, `factory([childRenderers], optionsObj)`, and also `factory({children:[...], ...opts})`.

**Port contract:** Each component factory = `(args) => RendererLike` with a deferred `.render()`. In React this maps to a component-builder that returns an element/descriptor; the two-callback hooks (factory decorator + per-call callback) and the `.note-children-container` slot must be reproduced.

---

### 2. UI instantiation + how `ui` is registered (`summernote.js` + `Context.js`)

#### Theme registration (module-load side effect)
Each theme entry file ends with:
```
$.summernote = $.extend($.summernote, { ui_template: ui, interface: 'lite' });
```
`ui_template` is a **factory** `ui(editorOptions) → uiObject`. `interface` is a theme id string (`'lite'`/`'bs3'`/`'bs4'`/`'bs5'`). **The last theme imported wins globally** (single global `$.summernote.ui`). Port: replace the global with explicit injection of a `ui` object/provider per editor instance.

#### `$.fn.summernote` (entry, `summernote.js`)
On init (first arg is an object or absent):
- Merge options **shallow**: `options = $.extend({}, $.summernote.options, userOptions)`. ⚠️ Top-level only — `callbacks`, `keyMap`, `popover`, `codemirror` are wholesale-replaced if partially supplied.
- `options.langInfo = $.extend(true, {}, lang['en-US'], lang[options.lang])` — deep-merged langpack with en-US fallback.
- `options.icons = $.extend(true, {}, defaultIcons, options.icons)` — deep-merged.
- `options.tooltip`: if `'auto'` → resolves to `!env.isSupportTouch` (no tooltips on touch).
- For each matched element without existing `data('summernote')`: create `new Context($note, options)`, store on `$note.data('summernote')`, then `triggerEvent('init', context.layoutInfo)` → fires `onInit` callback + `summernote.init` event with the layoutInfo.
- If first arg is a string → it's a method call → `context.invoke.apply(context, args)` (see invoke routing in CLAUDE.md). If `options.focus` → `invoke('editor.focus')`.

#### `Context` constructor + `initialize` (`Context.js`)
- `this.options = $.extend(true, {}, options)` — **deep clone** per context.
- **`$.summernote.ui = $.summernote.ui_template(this.options)`** then `this.ui = $.summernote.ui`. So the UI object is re-instantiated per Context, closing over *this context's* options (notably `editorOptions.container`, `airMode`, `toolbarPosition`).
- `initialize()`: `this.layoutInfo = this.ui.createLayout(this.$note)` → `_initialize()` → `this.$note.hide()`.
- `_initialize()` order (critical):
  1. `options.id = func.uniqueId($.now())` — unique numeric id, used for dialog/palette element ids (`backColorPicker-<id>`, `note-dialog-image-url-<id>`, etc.).
  2. `options.container = options.container || layoutInfo.editor` — default tooltip/popover/dialog container = the editor frame.
  3. Register custom buttons: for each key in `options.buttons` → `memo('button.'+key, factory)`.
  4. `modules = {...options.modules, ...$.summernote.plugins}` — instantiate **every** module first (`module(key, Class, withoutInitialize=true)`), THEN `initializeModule` for each in registration order. Note `buttons` is registered **before** `toolbar` in `options.modules`, so all `button.*` memos exist before `Toolbar.initialize` runs `buttons.build`.

---

### 3. `createLayout` + `layoutInfo` (lite theme — `summernote-lite.js`)

`ui.createLayout($note)` assembles the editor frame by composing renderer factories, calls `.render()`, inserts after `$note`, and returns `layoutInfo`.

#### Branching (decided at create time from `editorOptions`)
- `airMode === true` → `airEditor([ editingArea([ codable(), airEditable() ]) ])`
- else `toolbarPosition === 'bottom'` → `editor([ editingArea([codable(), editable()]), toolbar(), statusbar() ])`
- else (default, top) → `editor([ toolbar(), editingArea([codable(), editable()]), statusbar() ])`

`$editor.insertAfter($note)`.

#### `layoutInfo` returned (THE structure every module reads)
| key | selector resolved | element |
|---|---|---|
| `note` | (the original `$note`) | source element (textarea/div), hidden after init |
| `editor` | `$editor` | `.note-editor.note-frame` (default container) |
| `toolbar` | `.note-toolbar` | `<div class="note-toolbar" role="toolbar">` |
| `editingArea` | `.note-editing-area` | `<div class="note-editing-area">` |
| `editable` | `.note-editable` | `<div class="note-editable" contentEditable="true" role="textbox" aria-multiline="true">` — the live edit surface |
| `codable` | `.note-codable` | `<textarea class="note-codable" aria-multiline="true">` — codeview source |
| `statusbar` | `.note-statusbar` | `<div class="note-statusbar" role="status">` containing `.note-resizebar` with 3× `.note-icon-bar` |

Note: the statusbar markup also includes a sibling `<output class="note-status-output" role="status" aria-live="polite">` (used for error/status messages). The air editable bundles the same `.note-status-output`.

In air mode, `editor` resolves to `.note-editor.note-airframe`; `toolbar`/`statusbar` queries return empty sets (air has none). The `editable` is `airEditable`'s div.

#### Exact markup per component (lite)
- editor: `<div class="note-editor note-frame"></div>` (bs5: `note-editor note-frame card`)
- toolbar: `<div class="note-toolbar" role="toolbar"></div>` (bs5 adds `card-header`)
- editingArea: `<div class="note-editing-area"></div>`
- codable: `<textarea class="note-codable" aria-multiline="true"></textarea>`
- editable: `<div class="note-editable" contentEditable="true" role="textbox" aria-multiline="true"></div>`
- airEditor: `<div class="note-editor note-airframe"></div>`
- airEditable: editable div + `<output class="note-status-output" role="status" aria-live="polite">`
- statusbar: `<output class="note-status-output" …>` + `<div class="note-statusbar" role="status"><div class="note-resizebar" aria-label="resize"><div class="note-icon-bar">×3</div></div>`

#### `removeLayout($note, layoutInfo)`
1. `$note.html(layoutInfo.editable.html())` — copy current content back into the source element.
2. `layoutInfo.editor.remove()`.
3. `$note.off('summernote')` — remove all `summernote.*` custom event handlers.
4. `$note.show()`.

`Context.destroy()` calls `_destroy()` (modules destroyed in **reversed** order, memos removed, `triggerEvent('destroy')`) then `removeData('summernote')` then `ui.removeLayout`.

---

### 4. `Toolbar.js` — building groups + sticky behavior

#### Fields (from `context.layoutInfo` + `options`)
`$note`, `$editor`, `$toolbar`, `$editable`, `$statusbar`, `options`, `ui = $.summernote.ui`, `$window`, `$document`. `isFollowing = false`.

#### `shouldInitialize()`
Returns `!options.airMode` — **Toolbar is skipped entirely in air mode** (AirPopover replaces it).

#### `initialize()` — exact sequence
1. `options.toolbar = options.toolbar || []`.
2. If `options.toolbar.length === 0` → `$toolbar.hide()`. Else → `context.invoke('buttons.build', $toolbar, options.toolbar)`.
3. If `options.toolbarContainer` → `$toolbar.appendTo(options.toolbarContainer)` (relocate toolbar into a host element).
4. `changeContainer(false)`.
5. Bind: `$note.on('summernote.keyup summernote.mouseup summernote.change', () => invoke('buttons.updateCurrentStyle'))`. So **button active/checked states refresh on keyup, mouseup, and change**.
6. Immediately `invoke('buttons.updateCurrentStyle')` once.
7. If `options.followingToolbar` → `$window.on('scroll resize', this.followScroll)`.

#### `destroy()`
`$toolbar.children().remove()`; if `followingToolbar` → unbind `scroll resize`.

#### `followScroll()` — sticky toolbar math (only when `followingToolbar`)
Early-returns `false` if `$editor.hasClass('fullscreen')`.
Reads: `editorHeight=$editor.outerHeight()`, `editorWidth=$editor.width()`, `toolbarHeight=$toolbar.height()`, `statusbarHeight=$statusbar.height()`, `otherBarHeight = options.otherStaticBar ? $(otherStaticBar).outerHeight() : 0`.
Computes: `currentOffset=$document.scrollTop()`, `editorOffsetTop=$editor.offset().top`, `editorOffsetBottom=editorOffsetTop+editorHeight`, `activateOffset=editorOffsetTop-otherBarHeight`, `deactivateOffsetBottom=editorOffsetBottom-otherBarHeight-toolbarHeight-statusbarHeight`.
- **Activate** (not following AND `currentOffset>activateOffset` AND `currentOffset<deactivateOffsetBottom-toolbarHeight`): set `isFollowing=true`; `$editable.css({marginTop: $toolbar.outerHeight()})` (reserve space); `$toolbar.css({position:'fixed', top:otherBarHeight, width:editorWidth, zIndex:1000})`.
- **Deactivate** (following AND (`currentOffset<activateOffset` OR `currentOffset>deactivateOffsetBottom`)): `isFollowing=false`; `$toolbar.css({position:'relative', top:0, width:'100%', zIndex:'auto'})`; `$editable.css({marginTop:''})`.

#### `changeContainer(isFullscreen)`
- If fullscreen → `$toolbar.prependTo($editor)` (force toolbar back into the editor frame).
- Else if `options.toolbarContainer` → `$toolbar.appendTo(toolbarContainer)`.
- If `followingToolbar` → call `followScroll()`.

#### `updateFullscreen(isFullscreen)`
`ui.toggleBtnActive($toolbar.find('.btn-fullscreen'), isFullscreen)` then `changeContainer(isFullscreen)`. Called by Fullscreen module.

#### `updateCodeview(isCodeview)`
`ui.toggleBtnActive($toolbar.find('.btn-codeview'), isCodeview)`; if codeview on → `deactivate()`, else `activate()`. Called by Codeview module.

#### `activate(isIncludeCodeview)` / `deactivate(isIncludeCodeview)`
Select `$toolbar.find('button')`; unless `isIncludeCodeview`, exclude `.not('.note-codeview-keep')`. Then `ui.toggleBtn($btn, true/false)`. So in codeview, all toolbar buttons are disabled EXCEPT those with `.note-codeview-keep` (fullscreen + codeview buttons). Context.`enable()`/`disable()` call `toolbar.activate(true)`/`toolbar.deactivate(true)` (include codeview = full enable/disable).

`ui.toggleBtn($btn, isEnable)` = `toggleClass('disabled', !isEnable)` + `attr('disabled', !isEnable)`. `ui.toggleBtnActive($btn, isActive)` = `toggleClass('active', isActive)`.

---

### 5. `Buttons.build` — `[group, [names]]` → DOM (`Buttons.js`)

#### `build($container, groups)`
For each `group` in `groups`:
- `groupName = Array.isArray(group) ? group[0] : group`.
- `buttons = Array.isArray(group) ? (group.length===1 ? [group[0]] : group[1]) : [group]`. (Tolerant of `['name']`, `['groupName',[...]]`, or bare `'name'`.)
- Create `$group = ui.buttonGroup({ className: 'note-' + groupName }).render()` → `<div class="note-btn-group note-<groupName>">`.
- For each button name: `btn = context.memo('button.' + name)`. If found: if `btn` is a function → `$group.append(btn(this.context))`, else `$group.append(btn)`. (Most memos store a render *function* that returns the node lazily; some store the rendered node.) **Unknown names are silently skipped.**
- `$group.appendTo($container)`.

So `['font', ['bold','underline','clear']]` → `<div class="note-btn-group note-font">` containing the bold/underline/clear buttons. Group `className` is always `note-<groupName>` — these classNames are arbitrary labels, not behavioral.

#### Button memo factories — naming + contracts
Memo key = `'button.<name>'`. Each (except a few stored as already-rendered nodes) is a thunk `() => this.button({...}).render()`. `this.button(o)` deletes `o.tooltip` if `!options.tooltip`, sets `o.container = options.container`, returns `ui.button(o)`.

`ui.button` markup (lite): `<button type="button" class="note-btn" tabindex="-1">`, with factory-callback wiring: if `tooltip` → set `aria-label` + create `TooltipUI` (needs container, else console.warn) + hide tooltip on click; if `contents` → set innerHTML; if `data.toggle==='dropdown'` → create `DropdownUI`; if `codeviewKeepButton` → add `.note-codeview-keep`.

Each factory's `click` is `context.createInvokeHandler(namespace, value?)` or `createInvokeHandlerAndUpdateState(...)`:
- `createInvokeHandler(ns, value)` → `(e) => { e.preventDefault(); invoke(ns, value || $(e.target).closest('[data-value]').data('value'), $target); }`. So when no static `value`, the clicked element's nearest `[data-value]` supplies the argument.
- `createInvokeHandlerAndUpdateState(ns, value)` → same, then `invoke('buttons.updateCurrentStyle')`. Used for toggle-style format buttons so they re-highlight immediately.

#### Full catalog of toolbar button memos
Format: **memo name → invoke target (arg) → icon → tooltip lang key (+shortcut) → notable class**

Style/format:
- `style` → buttonGroup[dropdown-toggle + dropdown `.dropdown-style`]; items=`options.styleTags`; click `editor.formatBlock`. icon `magic`. tooltip `style.style`. Dropdown item template renders `<tag style className>title</tag>`; title from `lang.style[tag]` (e.g. `lang.style.p`, `.h1`…`.h6`, `.blockquote`, `.pre`) else raw tag.
- `style.<tag>` (one per styleTag, e.g. `style.h1`) → single button, class `note-btn-style-<tag>`, contents `<div data-value="<tag>">TAG</div>`, click `editor.formatBlock`, tooltip `lang.style[tag]`.
- `bold` → `editor.bold` (updateState), icon `bold`, tooltip `font.bold`+shortcut, class `note-btn-bold`.
- `italic` → `editor.italic` (updateState), icon `italic`, `font.italic`, class `note-btn-italic`.
- `underline` → `editor.underline` (updateState), icon `underline`, `font.underline`, class `note-btn-underline`.
- `clear` → `editor.removeFormat`, icon `eraser`, `font.clear`+shortcut(removeFormat).
- `strikethrough` → `editor.strikethrough` (updateState), icon `strikethrough`, `font.strikethrough`, class `note-btn-strikethrough`.
- `superscript` → `editor.superscript` (updateState), icon `superscript`, `font.superscript`, class `note-btn-superscript`.
- `subscript` → `editor.subscript` (updateState), icon `subscript`, `font.subscript`, class `note-btn-subscript`.

Font dropdowns:
- `fontname` → buttonGroup[toggle(`<span class="note-current-fontname">`) + `dropdownCheck .dropdown-fontname`]. items=`options.fontNames.filter(isFontInstalled)`; checkClassName `icons.menuCheck`; template `<span style="font-family:validFontName(item)">item</span>`; click `editor.fontName` (updateState); tooltip `font.name`. If `options.addDefaultFonts`, merges installed fonts from current selection's `font-family` into `options.fontNames`.
- `fontsize` → toggle(`<span class="note-current-fontsize">`) + `dropdownCheck .dropdown-fontsize`; items=`options.fontSizes`; click `editor.fontSize` (updateState); tooltip `font.size`.
- `fontsizeunit` → toggle(`<span class="note-current-fontsizeunit">`) + `dropdownCheck .dropdown-fontsizeunit`; items=`options.fontSizeUnits`; click `editor.fontSizeUnit` (updateState); tooltip `font.sizeunit`.

Colors (`colorPalette(className, tooltip, backColor, foreColor)`):
- `color` → `colorPalette('note-color-all', lang.color.recent, true, true)`.
- `forecolor` → `colorPalette('note-color-fore', lang.color.foreground, false, true)`.
- `backcolor` → `colorPalette('note-color-back', lang.color.background, true, false)`.
- Structure: `buttonGroup .note-color .<className>` containing: (a) `.note-current-color-button` (icon `font`+`.note-recent-color`, tooltip = passed in; click invokes `editor.color`/`editor.backColor`/`editor.foreColor` from `data-backColor`/`data-foreColor` attrs; callback seeds recent color from `options.colorButton.backColor`/`.foreColor`), (b) `dropdown-toggle` (`data.toggle:dropdown`, tooltip `color.more`), (c) `ui.dropdown` palette.
- Palette dropdown markup uses lang: `color.background`, `color.transparent`, `color.cpSelect`, `color.foreground`, `color.resetToDefault`. Holders filled by `ui.palette({colors:options.colors, colorsName:options.colorsName, eventName, container, tooltip})`. Custom-color holders + `<input type="color">` pickers wired (`backColorPicker-<id>`, `foreColorPicker-<id>`, etc.).
- Palette click: `data-event` ∈ {`backColor`,`foreColor`,`openPalette`,`removeFormat`}; updates `.note-recent-color` + `.note-current-color-button` data attr, then `invoke('editor.'+eventName, value)`.

Paragraph / lists / align:
- `ul` → `editor.insertUnorderedList`, icon `unorderedlist`, `lists.unordered`+shortcut.
- `ol` → `editor.insertOrderedList`, icon `orderedlist`, `lists.ordered`+shortcut.
- `paragraph` → buttonGroup[toggle(icon `alignLeft`) + dropdown[`buttonGroup .note-align`(justifyLeft/Center/Right/Full) + `buttonGroup .note-list`(outdent/indent)]]; tooltip `paragraph.paragraph`.
- `justifyLeft`/`justifyCenter`/`justifyRight`/`justifyFull` → `editor.justifyLeft/Center/Right/Full`, icons `alignLeft/Center/Right/Justify`, lang `paragraph.left/center/right/justify`+shortcuts. (These four are pre-rendered nodes memoized via `func.invoke(node,'render')`, and the same node instances are reused inside the paragraph dropdown.)
- `outdent`/`indent` → `editor.outdent`/`editor.indent`, icons `outdent`/`indent`, lang `paragraph.outdent`/`.indent`+shortcuts.
- `height` → buttonGroup[toggle(icon `textHeight`) + `dropdownCheck .dropdown-line-height`]; items=`options.lineHeights`; click `editor.lineHeight`; tooltip `font.height`.

Table / insert / view:
- `table` → buttonGroup[toggle(icon `table`) + dropdown `.note-table` containing dimension picker]; tooltip `table.table`. Per-call `callback` wires `.note-dimension-picker-mousecatcher` size = `options.insertTableMaxSize.col/row` em, `mouseup`→`editor.insertTable`, `mousemove`→`tableMoveHandler`. Picker markup: `.note-dimension-picker` > `.note-dimension-picker-mousecatcher[data-event=insertTable][data-value=1x1]` + `.note-dimension-picker-highlighted` + `.note-dimension-picker-unhighlighted`; plus `.note-dimension-display` ("1 x 1").
- `link` → `linkDialog.show`, icon `link`, `link.link`+shortcut(`linkDialog.show`).
- `picture` → `imageDialog.show`, icon `picture`, `image.image`.
- `video` → `videoDialog.show`, icon `video`, `video.video`.
- `hr` → `editor.insertHorizontalRule`, icon `minus`, `hr.insert`+shortcut.
- `fullscreen` → `fullscreen.toggle`, icon `arrowsAlt`, `options.fullscreen`, class `btn-fullscreen note-codeview-keep`.
- `codeview` → `codeview.toggle`, icon `code`, `options.codeview`, class `btn-codeview note-codeview-keep`.
- `undo` → `editor.undo`, icon `undo`, `history.undo`+shortcut.
- `redo` → `editor.redo`, icon `redo`, `history.redo`+shortcut.
- `help` → `helpDialog.show`, icon `question`, `options.help`.

#### Popover button memos (registered by `addImagePopoverButtons`/`addLinkPopoverButtons`/`addTablePopoverButtons`, consumed via the same `build` path by the popover modules)
- Image resize: `resizeFull`→`editor.resize('1')` "100%" tooltip `image.resizeFull`; `resizeHalf`→`('0.5')` "50%" `image.resizeHalf`; `resizeQuarter`→`('0.25')` "25%" `image.resizeQuarter`; `resizeNone`→`('0')` icon `rollback` `image.resizeNone`. (Contents `<span class="note-fontsize-10">`.)
- Image float: `floatLeft`→`editor.floatMe('left')` icon `floatLeft` `image.floatLeft`; `floatRight`→`('right')` icon `floatRight` `image.floatRight`; `floatNone`→`('none')` icon `rollback` `image.floatNone`.
- `removeMedia`→`editor.removeMedia` icon `trash` `image.remove`.
- Link: `linkDialogShow`→`linkDialog.show` icon `link` `link.edit`; `unlink`→`editor.unlink` icon `unlink` `link.unlink`.
- Table (all `className:'btn-md'`): `addRowUp`→`editor.addRow('top')` icon `rowAbove` `table.addRowAbove`; `addRowDown`→`('bottom')` icon `rowBelow` `table.addRowBelow`; `addColLeft`→`editor.addCol('left')` icon `colBefore` `table.addColLeft`; `addColRight`→`('right')` icon `colAfter` `table.addColRight`; `deleteRow`→`editor.deleteRow` icon `rowRemove` `table.delRow`; `deleteCol`→`editor.deleteCol` icon `colRemove` `table.delCol`; `deleteTable`→`editor.deleteTable` icon `trash` `table.delTable`.

---

### 6. `buttons.updateCurrentStyle($container?)` — toolbar reflection of selection state

Called on `summernote.keyup/mouseup/change` and after every updateState invoke. `$cont = $container || $toolbar`. Reads `styleInfo = invoke('editor.currentStyle')` (a flat object). Then:
- `updateBtnStates` toggles `.active` via `ui.toggleBtnActive` on: `.note-btn-bold` (font-bold==='bold'), `.note-btn-italic` (font-italic), `.note-btn-underline` (font-underline), `.note-btn-subscript` (font-subscript), `.note-btn-superscript` (font-superscript), `.note-btn-strikethrough` (font-strikethrough). Each compares `styleInfo['font-<x>'] === '<x>'`.
- If `styleInfo['font-family']`: split, strip quotes/whitespace, `fontName = lists.find(names, isFontInstalled)`; toggle `.checked` on `.dropdown-fontname a` where `data-value === fontName`; set `.note-current-fontname` text + `font-family`.
- If `styleInfo['font-size']`: toggle `.checked` on `.dropdown-fontsize a`; set `.note-current-fontsize` text. Also `font-size-unit` → `.dropdown-fontsizeunit a` + `.note-current-fontsizeunit`.
- If `styleInfo['line-height']`: toggle `.checked` on `.dropdown-line-height a`; set `.note-current-line-height` text.

(String comparison via `(value+'')` to avoid number/string mismatch.)

`tableMoveHandler(event)`: `PX_PER_EM=18`; computes `dim.c/r = ceil(offset/18)||1` (Firefox: derives offset from `pageX/Y - catcher.offset` since `event.offsetX` is undefined); sets `.note-dimension-picker-highlighted` w/h em, `$catcher.data('value', 'CxR')`, expands `.note-dimension-picker-unhighlighted` when c/r >3 and < max; updates `.note-dimension-display` to `"C x R"`.

---

### 7. Options consumed (with defaults from `settings.js`)

- `airMode` (false) — toolbar skipped, air layout.
- `toolbarPosition` ('top') — 'top'|'bottom' chooses layout composition order.
- `toolbar` (the 8-group default array above) — `[group, [names]]` tuples; `[]` hides toolbar.
- `toolbarContainer` (undefined) — relocate toolbar DOM into host.
- `followingToolbar` (false) — enable sticky scroll behavior.
- `otherStaticBar` ('') — selector of a fixed bar to offset sticky math.
- `container` (null → defaults to `layoutInfo.editor`) — tooltip/dropdown/dialog host.
- `tooltip` ('auto' → `!isSupportTouch`) — false drops all `tooltip` props.
- `shortcuts` (true) — gates `representShortcut`.
- `keyMap` (pc/mac maps in settings) — inverted to derive per-command shortcut text.
- `styleTags` (`['p','blockquote','pre','h1'..'h6']`).
- `fontNames` (11-font default list), `fontNamesIgnoreCheck` ([]), `addDefaultFonts` (true).
- `fontSizes` (`['8','9','10','11','12','14','18','24','36']`), `fontSizeUnits` (`['px','pt']`).
- `colors` / `colorsName` (8×8 palettes), `colorButton` (`{foreColor:'#000000', backColor:'#FFFF00'}`).
- `lineHeights` (`['1.0','1.2','1.4','1.5','1.6','1.8','2.0','3.0']`).
- `insertTableMaxSize` (`{col:10, row:10}`).
- `icons` (full `note-icon-*` map, see §9).
- `id` (set at runtime via `func.uniqueId($.now())`) — used in element ids.
- `buttons` ({}) — custom name→factory memos.
- `codeviewKeepButton` (false) — adds `.note-codeview-keep` so a button stays enabled in codeview.

---

### 8. Events bound

DOM/custom events in this subsystem:
- Toolbar binds `$note.on('summernote.keyup summernote.mouseup summernote.change', → buttons.updateCurrentStyle)`.
- Toolbar binds `$window.on('scroll resize', followScroll)` when `followingToolbar`.
- Per-button `click` (via createInvokeHandler) — `preventDefault`, then `invoke(...)`.
- Table dimension picker: `mouseup`→`editor.insertTable`, `mousemove`→tableMoveHandler.
- Dropdown items (lite): delegated `click` on `> .note-dropdown-item` → `item.click($a)` or `options.itemClick`.
- Color `<input type="color">`: `change` → updates chip + triggers click.
- Lite button factory: tooltip `click`→hide; dropdown toggle managed by `DropdownUI`.
- `triggerEvent('init', layoutInfo)` fired after each context creation (→ `onInit` + `summernote.init`).
- `triggerEvent('destroy', context)` during `_destroy`.

`triggerEvent(ns, ...args)`: calls `options.callbacks[namespaceToCamel(ns,'on')]` with `this=$note[0]`, then `$note.trigger('summernote.'+ns, args)`.

---

### 9. Icon class names referenced (`note-icon-*`)

From `options.icons`, used by toolbar/popover buttons: `note-icon-magic` (style), `note-icon-bold`, `note-icon-italic`, `note-icon-underline`, `note-icon-eraser` (clear), `note-icon-strikethrough`, `note-icon-subscript`, `note-icon-superscript`, `note-icon-font` (color current), `note-icon-unorderedlist`, `note-icon-orderedlist`, `note-icon-align-left/center/right/justify`, `note-icon-align-indent` (indent), `note-icon-align-outdent` (outdent), `note-icon-text-height` (height), `note-icon-table`, `note-icon-link`, `note-icon-picture`, `note-icon-video`, `note-icon-minus` (hr), `note-icon-arrows-alt` (fullscreen), `note-icon-code` (codeview), `note-icon-question` (help), `note-icon-undo`, `note-icon-redo`, `note-icon-caret` (dropdown), `note-icon-menu-check` (dropdownCheck mark), `note-icon-chain-broken` (unlink), `note-icon-rollback` (resizeNone/floatNone), `note-icon-trash` (removeMedia/deleteTable), `note-icon-row-above/row-below/col-before/col-after/row-remove/col-remove` (table popover), `note-icon-float-left/float-right`. Also non-icon-map literal classes: `note-icon-bar` (resize grip), `note-icon-close` (dialog close), `note-fontsize-10` (resize % labels), `note-recent-color`, `note-current-color-button`, `note-current-fontname/fontsize/fontsizeunit/line-height`.

`ui.icon(className, tag='i')` → `<i class="className"></i>`; if className starts with `<` it's returned verbatim. `dropdownButtonContents(contents, options)` (lite) appends `' ' + icon(icons.caret, 'span')`; (bs5) returns contents unchanged (Bootstrap caret via CSS).

---

### 10. Keyboard shortcuts / tooltips

`representShortcut(editorMethod)` looks up the inverted keyMap (`func.invertObject(keyMap[isMac?'mac':'pc'])`): maps a command → its key combo string, returns `' (combo)'`, or `''` if `!shortcuts` or none. Mac: replaces `CMD`→`⌘`, `SHIFT`→`⇧`. Always replaces `BACKSLASH`→`\`, `SLASH`→`/`, `LEFTBRACKET`→`[`, `RIGHTBRACKET`→`]`. The combo string is appended to the tooltip for: bold/italic/underline/removeFormat, strikethrough, justify*, outdent/indent, ul(insertUnorderedList)/ol(insertOrderedList), hr(insertHorizontalRule), undo/redo, link(`linkDialog.show`). See `keyMap` in §settings; e.g. bold=`CTRL+B`/`⌘+B`, link=`CTRL+K`/`⌘+K`.

Tooltips: each button passes `tooltip` (a lang string + optional shortcut). `this.button` strips `tooltip` if `options.tooltip` is false. Lite renders tooltips via `TooltipUI` keyed on `container`; bs3/4/5 rely on Bootstrap `$.tooltip` and `data-original-title`.

---

### 11. i18n lang keys referenced (exhaustive for this subsystem)

`style.style`; `style.<tag>` for each styleTag (`style.p`, `style.blockquote`, `style.pre`, `style.h1`…`style.h6`); `font.bold`, `font.italic`, `font.underline`, `font.clear`, `font.strikethrough`, `font.subscript`, `font.superscript`, `font.name`, `font.size`, `font.sizeunit`, `font.height`; `color.recent`, `color.more`, `color.background`, `color.foreground`, `color.transparent`, `color.cpSelect`, `color.resetToDefault`; `lists.unordered`, `lists.ordered`; `paragraph.paragraph`, `paragraph.left`, `paragraph.center`, `paragraph.right`, `paragraph.justify`, `paragraph.outdent`, `paragraph.indent`; `table.table`, `table.addRowAbove`, `table.addRowBelow`, `table.addColLeft`, `table.addColRight`, `table.delRow`, `table.delCol`, `table.delTable`; `link.link`, `link.edit`, `link.unlink`; `image.image`, `image.resizeFull`, `image.resizeHalf`, `image.resizeQuarter`, `image.resizeNone`, `image.floatLeft`, `image.floatRight`, `image.floatNone`, `image.remove`; `video.video`; `hr.insert`; `history.undo`, `history.redo`; `options.fullscreen`, `options.codeview`, `options.help`. (Dialog renderers additionally reference `image.selectFromFiles`, `image.url`, `image.insert`, `link.textToDisplay`, `link.url`, `link.openInNewWindow`, `link.insert`, `video.url`, `video.providers`, `video.insert` — these belong to the dialog renderers in the same UI file.)

---

### 12. Non-obvious behavior / ordering / quirks / security

- **Module instantiation precedes initialization** (Context `_initialize`): all modules constructed first, then initialized in registration order. `buttons` is registered before `toolbar`, guaranteeing all `button.*` memos exist when `Toolbar.initialize → buttons.build` runs. A React port must preserve this two-phase setup (register all button factories before building groups).
- **`createInvokeHandler` reads `data-value` from the clicked element** when no static value is provided — dropdown items carry `data-value` so the same handler serves many values.
- **`createInvokeHandlerAndUpdateState`** exists only so toggle buttons (bold/italic/font/etc.) re-highlight immediately after click, before the next keyup/mouseup.
- **Sticky toolbar disabled in fullscreen** (early return); fullscreen prepends toolbar back into editor frame via `changeContainer`.
- **`.note-codeview-keep`** is the allowlist of buttons that stay enabled in codeview; only fullscreen + codeview buttons carry it by default. `codeviewKeepButton` option can add it to others.
- **Unknown button names silently skipped** in `build` — no error. Empty toolbar array hides the toolbar.
- **Single global `$.summernote.ui`** — last-instantiated context's UI wins; multi-editor-different-theme is unsupported. Port must inject UI per instance.
- **Top-level option merge is shallow** — partial `popover`/`keyMap`/`callbacks` replace the whole default. Deep-merge only `langInfo`/`icons`.
- **`addDefaultFonts`** mutates `options.fontNames` at fontname-button build time by appending installed fonts found in the current selection (idempotent via `isFontInstalled` cache `fontInstalledMap`).
- **Renderer dual callbacks** — factory-level `callback(node,options)` (decorator) and per-instance `options.callback(node)` both run; don't conflate.
- **`.note-children-container`** is the explicit child-insertion slot (popovers); without it, children append to root.
- **Firefox `event.offsetX` undefined** handled in `tableMoveHandler` via pageX/Y fallback.
- **Security (codeview)**: `codeviewFilter` (default true) strips tags matching `codeviewFilterRegex` (applet/base/bgsound/blink/embed/frame(set)/ilayer/layer/link/meta/object/script/style/title/textarea/xml); `codeviewIframeFilter` (true) + `codeviewIframeWhitelistSrc`/`codeviewIframeWhitelistSrcBase` (YouTube/Facebook/Vimeo/etc.) restrict iframe sources. These are enforced by the Codeview module, not Toolbar, but the toolbar's codeview button triggers entry into that filtered path.
- **`afterCommand` order / change event**: toolbar updates ride on `summernote.change`, which Editor fires after each command — so button states reflect post-command state.
- **Theme markup deltas** (for cross-theme parity): bs5 adds Bootstrap classes — editor `card`, toolbar `card-header`, editable `card-block`, buttonGroup `btn-group`, dropdowns `dropdown-menu`, items `dropdown-item` (vs lite `note-dropdown-item`); `dropdownButtonContents` omits the caret span (CSS-driven). `layoutInfo` keys/selectors are identical across themes. A zero-dep port should pick one class vocabulary (lite's `.note-*`-only set is the cleanest, fully self-contained — no Bootstrap dependency).

---

<!-- ===== editor-commands ===== -->
## Editor (src/js/module/Editor.js)

The `Editor` module is the **command gatekeeper** of summernote. Every content mutation flows through it. The chrome (toolbar buttons, dialogs, popovers, keymap) reaches it via `context.invoke('editor.<method>', ...args)` or `context.createInvokeHandler('editor.<method>')`. Because `editor` is the bare-method fallback in `Context.invoke`, many of these are also reachable as `context.invoke('<method>')` / `$('.x').summernote('<method>', ...)` (e.g. `insertText`, `insertImage`, `createLink`, `undo`, `focus`).

### Constructor wiring & instance state

On construction it captures from `context`:
- `$note` = `layoutInfo.note` (original element), `$editor` = `layoutInfo.editor`, `$editable` = `layoutInfo.editable`, `editable` = `$editable[0]` (raw DOM contentEditable div).
- `options` = `context.options`, `lang` = `options.langInfo`.
- Mutable state: `this.lastRange = null`, `this.snapshot = null`, `this.hasKeyShortCut` (set in keydown).
- `this.editable.data('target', node)` (via jQuery `$.data`) used as a transient "current media target" pointer (see saveTarget/restoreTarget/clearTarget).
- `this.$editable.data('bogus', span)` (`KEY_BOGUS = 'bogus'`) holds the last styled bogus span for cursor placement.

It instantiates 5 editing-engine collaborators:
- `this.style = new Style()`
- `this.table = new Table()`
- `this.typing = new Typing(context)`
- `this.bullet = new Bullet()`
- `this.history = new History(context)`

Module-level constants (used by `checkLinkUrl`):
- `MAILTO_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`
- `TEL_PATTERN = /^(\+?\d{1,3}[\s-]?)?(\d{1,4})[\s-]?(\d{1,4})[\s-]?(\d{1,4})$/`
- `URL_SCHEME_PATTERN = /^([A-Za-z][A-Za-z0-9+-.]*\:|#|\/)/`

### help.* memos registered (for HelpDialog shortcut listing)

In the constructor it registers (`context.memo('help.<x>', this.lang.help.<x>)`):
`help.escape`, `help.undo`, `help.redo`, `help.tab`, `help.untab`, `help.insertParagraph`, `help.insertOrderedList`, `help.insertUnorderedList`, `help.indent`, `help.outdent`, `help.formatPara`, `help.insertHorizontalRule`, `help.fontName`.
Plus, for each native command in the loop: `help.<command>` (bold, italic, underline, strikethrough, superscript, subscript, justifyLeft, justifyCenter, justifyRight, justifyFull, formatBlock, removeFormat, backColor).
Plus in the H-loop: `help.formatH1` … `help.formatH6`.

Lang keys referenced (i18n): `lang.help.escape`, `lang.help.undo`, `lang.help.redo`, `lang.help.tab`, `lang.help.untab`, `lang.help.insertParagraph`, `lang.help.insertOrderedList`, `lang.help.insertUnorderedList`, `lang.help.indent`, `lang.help.outdent`, `lang.help.formatPara`, `lang.help.insertHorizontalRule`, `lang.help.fontName`, `lang.help.bold`, `lang.help.italic`, `lang.help.underline`, `lang.help.strikethrough`, `lang.help.superscript`, `lang.help.subscript`, `lang.help.justifyLeft`, `lang.help.justifyCenter`, `lang.help.justifyRight`, `lang.help.justifyFull`, `lang.help.formatBlock`, `lang.help.removeFormat`, `lang.help.backColor`, `lang.help.formatH1`…`lang.help.formatH6`, `lang.image.maximumFileSizeError`, `lang.output.noSelection`.

---

### COMMAND LIFECYCLE (the contract every porting target must replicate)

- **`beforeCommand()`** — (1) `triggerEvent('before.command', editable.html())`; (2) `document.execCommand('styleWithCSS', false, options.styleWithCSS)` to set CSS-vs-tag styling mode; (3) `this.focus()` to ensure editable is focused before mutating.
- **`afterCommand(isPreventTrigger?)`** — (1) `normalizeContent()` → `editable.normalize()` (merges adjacent text nodes); (2) `history.recordUndo()` (pushes snapshot, truncates redo stack); (3) unless `isPreventTrigger` truthy, `triggerEvent('change', editable.html(), $editable)`.
- **`wrapCommand(fn)`** — returns `function(){ beforeCommand(); fn.apply(this, args); afterCommand(); }`. Used to auto-wrap most commands. Note: it passes ALL args through to `fn`.
- **Native execCommand commands bypass `wrapCommand`**: the constructor loop builds them as `beforeCommand(); document.execCommand(sCmd,false,value); afterCommand(true)` — note `afterCommand(true)` **suppresses the change event** (the debounced `input` listener fires `change` instead).

The **port must reimplement these without execCommand**: `styleWithCSS`, `bold/italic/...`, `formatBlock`, `removeFormat`, `backColor`, `foreColor`, `color`, `unlink`.

---

### A. Native-style commands generated in the constructor loop

Built from array `['bold','italic','underline','strikethrough','superscript','subscript','justifyLeft','justifyCenter','justifyRight','justifyFull','formatBlock','removeFormat','backColor']`. Each becomes `this[cmd] = (value) => { beforeCommand(); document.execCommand(cmd, false, value); afterCommand(true); }`.

| Command | Signature | DOM effect |
|---|---|---|
| `bold()` | `()` | toggles `<b>`/bold inline styling on selection |
| `italic()` | `()` | toggles italic |
| `underline()` | `()` | toggles underline |
| `strikethrough()` | `()` | toggles strikethrough |
| `superscript()` | `()` | toggles `<sup>` |
| `subscript()` | `()` | toggles `<sub>` |
| `justifyLeft()` | `()` | left-aligns block |
| `justifyCenter()` | `()` | center-aligns block |
| `justifyRight()` | `()` | right-aligns block |
| `justifyFull()` | `()` | justify-aligns block |
| `formatBlock(value)` | `(tagName)` | NOTE: overwritten below by a `wrapCommand` version — the loop value is shadowed |
| `removeFormat()` | `()` | strips inline formatting from selection |
| `backColor(value)` | `(color)` | applies background color to selection |

⚠️ `formatBlock` from the loop is **immediately overwritten** by an explicit `wrapCommand` version (see section C). The loop's purpose for `formatBlock` is only to register `help.formatBlock`.

### B. Font-style commands (wrapCommand, via `fontStyling`)

| Command | Signature | DOM effect |
|---|---|---|
| `fontName(value)` | `(fontFamily)` | `fontStyling('font-family', env.validFontName(value))` — wraps selection in styled `<span style="font-family:…">` |
| `fontSize(value)` | `(size)` | reads `currentStyle()['font-size-unit']`, applies `fontStyling('font-size', value+unit)` |
| `fontSizeUnit(value)` | `(unit)` | reads `currentStyle()['font-size']`, applies `fontStyling('font-size', size+value)` (changes px↔pt unit) |

`fontStyling(target, value)`: gets `getLastRange()`; if range non-empty → `style.styleNodes(rng)` returns spans, clears `.note-status-output`, applies `css(target,value)` to spans. **Collapsed-range quirk**: if collapsed and first span has zero length, sets `firstSpan.innerHTML = dom.ZERO_WIDTH_NBSP_CHAR`, selects its firstChild, `setLastRange()`, and stashes span in `$editable.data('bogus')` (bogus char needed for cursor position). Non-collapsed → `rng.select()`. If range is the empty string `''` (unfocused), renders a transient warning `<div class="alert alert-info">{lang.output.noSelection}</div>` inside `.note-status-output`, auto-removed after **5000ms** (id `note-status-output-<$.now()>`).

### C. Block / heading / paragraph commands

| Command | Signature | DOM effect |
|---|---|---|
| `formatBlock(tagName, $target?)` | `(tagName:String, $target?:jQuery)` | wrapCommand. If `options.callbacks.onApplyCustomStyle` set, calls it `(  $target, context, this.onFormatBlock )`; else `onFormatBlock(tagName, $target)` |
| `formatPara()` | `()` | `formatBlock('P')` — converts current block to `<p>` |
| `formatH1()`…`formatH6()` | `()` | generated H-loop; each calls `formatBlock('H'+idx)` |
| `onFormatBlock(tagName, $target?)` | internal | `document.execCommand('FormatBlock', false, isMSIE ? '<'+tag+'>' : tag)`. If `$target` provided: finds element matching tagName (or `.find(tagName)`), then on `[sc, ec].closest(tagName)` does `removeClass()` then re-applies `$target[0].className` (custom-class support) |

### D. List & indent commands (wrapCommand → Bullet)

| Command | Signature | DOM effect |
|---|---|---|
| `insertOrderedList()` | `()` | `bullet.insertOrderedList(editable)` — toggles `<ol>` |
| `insertUnorderedList()` | `()` | `bullet.insertUnorderedList(editable)` — toggles `<ul>` |
| `indent()` | `()` | `bullet.indent(editable)` — indent list/para |
| `outdent()` | `()` | `bullet.outdent(editable)` — outdent list/para |

### E. Insertion commands (wrapCommand)

| Command | Signature | DOM effect |
|---|---|---|
| `insertParagraph()` | `()` | `typing.insertParagraph(editable)` — Enter-key paragraph split |
| `insertNode(node)` | `(node:Node)` | guarded by `isLimited($(node).text().length)`; inserts node at lastRange, sets lastRange after node |
| `insertText(text)` | `(text:String)` | guarded by `isLimited(text.length)`; inserts `dom.createText(text)`, cursor to end of new text node |
| `pasteHTML(markup)` | `(markup:String)` | guarded by `isLimited(markup.length)`; **purifies** via `context.invoke('codeview.purify', markup)` (security filter), `rng.pasteHTML`, cursor after last inserted node |
| `insertHorizontalRule()` | `()` | inserts `<hr>` (`dom.create('HR')`); if `nextSibling` exists, cursor moves to it (normalized) |
| `insertTable(dim)` | `(dim:String "RxC")` | splits `dim` on `'x'`, `getLastRange().deleteContents()`, inserts `table.createTable(cols, rows, options)` |
| `lineHeight(value)` | `(value:String)` | `style.stylePara(rng, { lineHeight: value })` |

### F. Link commands

| Command | Signature | DOM effect |
|---|---|---|
| `createLink(linkInfo)` | `({url, text, isNewWindow, range?})` | wrapCommand. See detailed semantics below |
| `unlink()` | `()` | if range is on an anchor: expand range to anchor, select, then `beforeCommand → execCommand('unlink') → afterCommand` |
| `getLinkInfo()` | `() → {range, text, url, isNewWindow?}` | focuses if needed; expands lastRange over anchor; returns first anchor's href/target. `isNewWindow` only set when an anchor exists (`target === '_blank'`) |

**`createLink(linkInfo)` semantics** (consumed `options`: `linkAddNoReferrer`, `linkAddNoOpener`, `onCreateLink`):
- `linkUrl = linkInfo.url` (trimmed if string); `linkText = linkInfo.text`; `isNewWindow = linkInfo.isNewWindow`; `rng = linkInfo.range || getLastRange()`.
- `additionalTextLength = linkText.length - rng.toString().length`; if `>0` and `isLimited(additionalTextLength)` → abort.
- URL transform: if `options.onCreateLink` set → `linkUrl = options.onCreateLink(linkUrl)`; else `linkUrl = checkLinkUrl(linkUrl)`.
- If `isTextChanged` (`rng.toString() !== linkText`): `rng.deleteContents()`, insert `<A>` with the text. Else: `style.styleNodes(rng, { nodeName:'A', expandClosestSibling:true, onlyPartialContains:true })` to wrap existing selection in anchors.
- For each anchor: set `href=linkUrl`; if `isNewWindow` → `target=_blank` and build `rel` from `noreferrer`/`noopener` per options (joined by space); else `removeAttr('target')`.
- Finally selects the range spanning all anchors (`createRangeFromList(anchors)`).

**`checkLinkUrl(linkUrl)`** (URL normalizer): matches `MAILTO_PATTERN` → prefix `mailto:`; `TEL_PATTERN` → prefix `tel:`; if NOT matching `URL_SCHEME_PATTERN` (no scheme/`#`/`/`) → prefix `http://`; else unchanged. **Overridable** (mentioned in recent commit #4721 — LinkDialog can override).

### G. Color commands (wrapCommand)

| Command | Signature | DOM effect |
|---|---|---|
| `color(colorInfo)` | `({foreColor?, backColor?})` | if `foreColor` → `execCommand('foreColor',false,foreColor)`; if `backColor` → `execCommand('backColor',false,backColor)` |
| `foreColor(colorInfo)` | `(colorCode:String)` | `execCommand('foreColor', false, colorInfo)` |
| `backColor(value)` | `(color:String)` | (generated in native loop) `execCommand('backColor', …)` |

### H. Media / image / float / resize commands

| Command | Signature | DOM effect |
|---|---|---|
| `insertImage(src, param)` | `(src:String, param:String\|Function) → Deferred` | **NOT wrapped** — manual lifecycle. `createImage(src,param)` → on success `beforeCommand()`, if `param` is fn call `param($image)`, if string set `data-filename`, clamp width to `min(editable.width, image.width)`; `$image.show()`, insert at lastRange, cursor after image, `afterCommand()`. On fail → `triggerEvent('image.upload.error', e)` |
| `insertImagesAsDataURL(files)` | `(files:File[])` | per file: if `options.maximumImageFileSize` exceeded → `triggerEvent('image.upload.error', lang.image.maximumFileSizeError)`; else `readFileAsDataURL` → `insertImage(dataURL, filename)`; fail → `triggerEvent('image.upload.error')` |
| `insertImagesOrCallback(files)` | `(files:File[])` | if `options.callbacks.onImageUpload` set → `triggerEvent('image.upload', files)`; else `insertImagesAsDataURL(files)` |
| `removeMedia()` | `()` | wrapCommand. Removes media target's parent; if inside `<figure>` removes the figure, else `.detach()`s target; sets lastRange from selection; `triggerEvent('media.delete', $target, $editable)` |
| `floatMe(value)` | `('left'\|'right'\|'none')` | wrapCommand. Toggles `.note-float-left`/`.note-float-right` on target, sets `css('float', value==='none'?'':value)` |
| `resize(value)` | `(value:String fraction)` | wrapCommand. `parseFloat(value)`; `0` → clear width; else `width = value*100 + '%'`, height cleared |
| `resizeTo(pos, $target, bKeepRatio?)` | `({x,y}, $target, bool)` | NOT wrapped. Sets `$target.css({width,height})`; if keepRatio uses `$target.data('ratio')` |

Media-target helpers: `saveTarget(node)` → `$editable.data('target', node)`; `clearTarget()` → `removeData('target')`; `restoreTarget()` → `$editable.data('target')`. (ImagePopover sets the target before invoking float/resize/removeMedia.)

### I. Table commands (manual before/after lifecycle, guarded by collapsed-and-on-cell)

Each does `rng = getLastRange()`; only acts if `rng.isCollapsed() && rng.isOnCell()`, wrapping in `beforeCommand`/`afterCommand`:

| Command | Signature | DOM effect |
|---|---|---|
| `addRow(position)` | `('top'\|'bottom')` | `table.addRow(rng, position)` |
| `addCol(position)` | `('left'\|'right')` | `table.addCol(rng, position)` |
| `deleteRow()` | `()` | `table.deleteRow(rng)` |
| `deleteCol()` | `()` | `table.deleteCol(rng)` |
| `deleteTable()` | `()` | `table.deleteTable(rng)` |

### J. History commands

| Command | Signature | DOM effect |
|---|---|---|
| `undo()` | `()` | `triggerEvent('before.command', html)` → `history.undo()` → `triggerEvent('change', html, $editable)` |
| `redo()` | `()` | same wrapper around `history.redo()` |
| `commit()` | `()` | same wrapper around `history.commit()` |

### K. Range / focus / selection management (the EditorCore range API)

| Method | Signature | Behavior |
|---|---|---|
| `setLastRange(rng?)` | `(WrappedRange?)` | if `rng` given store it; else `range.create(editable)`, and if its start container is NOT inside `.note-editable`, fall back to `range.createFromBodyElement(editable)` |
| `getLastRange()` | `() → WrappedRange` | lazily `setLastRange()` if null, return `lastRange` |
| `createRange()` | `() → WrappedRange` | `focus(); setLastRange(); return getLastRange()` |
| `createRangeFromList(lst)` | `(Node[]) → WrappedRange` | builds a range spanning before head → after last of the node list |
| `saveRange(thenCollapse?)` | `(bool?)` | if `thenCollapse` → `getLastRange().collapse().select()` (note: does NOT itself snapshot — lastRange IS the save) |
| `restoreRange()` | `()` | if `lastRange` → `lastRange.select(); focus()` |
| `currentStyle()` | `() → Object` | `range.create().normalize()` → `style.current(rng)`; if no range → `style.fromNode($editable)` |
| `styleFromNode($node)` | `($node) → Object` | `style.fromNode($node)` |
| `getSelectedText()` | `() → String` | lastRange; if on anchor, expand to whole anchor; return `rng.toString()` |
| `hasFocus()` | `() → bool` | `$editable.is(':focus')` |
| `focus()` | `()` | if not focused, `$editable.trigger('focus')` (IE scroll workaround: only focus when unfocused) |
| `isEmpty()` | `() → bool` | `dom.isEmpty(editable)` OR `editable.html() === dom.emptyPara` |
| `empty()` | `()` | `context.invoke('code', dom.emptyPara)` — resets to empty `<p><br></p>` via Context.code() |
| `normalizeContent()` | `()` | `editable.normalize()` |

### L. Tab / typing commands

| Command | Signature | Behavior |
|---|---|---|
| `tab()` | `()` | if collapsed-on-cell → `table.tab(rng)`; else if `options.tabSize===0` return false; else if not `isLimited(tabSize)` → before/`typing.insertTab(rng, tabSize)`/after |
| `untab()` | `()` | if collapsed-on-cell → `table.tab(rng, true)` (reverse); else if `tabSize===0` return false |
| `insertParagraph()` | `()` | (see Insertion) |

### M. Deletion / keymap internals

- `removed(rng, node, tagName)` — invoked via `context.invoke('removed')` from `handleKeyMap` on remove keys. Recreates range; if collapsed-on-cell and the cell's only child element is a single `<br>`: if tag `P` removes node, if `TH`/`TD` removes `firstChild`. (Cleans up empty cells/paras after delete.)

---

### initialize() — event bindings on `$editable`

`spellcheck`/`autocorrect` attrs ← `options.spellCheck`; `data-gramm=false` if `options.disableGrammar`. Initial content: `$editable.html(dom.html($note) || dom.emptyPara)`.

DOM events bound (each also re-emits a summernote event via `triggerEvent`):

| DOM event | Triggers / side effects |
|---|---|
| `keydown` | if keyCode===ENTER → `triggerEvent('enter', event)`; always `triggerEvent('keydown', event)`; `snapshot = history.makeSnapshot()`; `hasKeyShortCut=false`; if not defaultPrevented: `options.shortcuts` → `handleKeyMap(event)` else `preventDefaultEditableShortCuts(event)`; if `isLimited(1,event)` and selection collapsed → return false (block input); `setLastRange()`; if `options.recordEveryKeystroke` and no shortcut → `history.recordUndo()` |
| `keyup` | `setLastRange(); triggerEvent('keyup', event)` |
| `focus` | `setLastRange(); triggerEvent('focus', event)` |
| `blur` | `triggerEvent('blur', event)` |
| `mousedown` | `triggerEvent('mousedown', event)` |
| `mouseup` | `setLastRange(); history.recordUndo(); triggerEvent('mouseup', event)` |
| `scroll` | `triggerEvent('scroll', event)` |
| `paste` | `setLastRange(); triggerEvent('paste', event)` |
| `copy` | `triggerEvent('copy', event)` |
| `input` | if `isLimited(0)` and snapshot → `history.applySnapshot(snapshot)` (revert over-limit composition, e.g. Korean IME) |
| `env.inputEventName` (debounced 10ms) | `triggerEvent('change', editable.html(), $editable)` |
| `focusin` | `triggerEvent('focusin', event)` |
| `focusout` | `triggerEvent('focusout', event)` |
| `contextmenu` (on `$editor`, airMode+overrideContextMenu only) | `triggerEvent('contextmenu', event); return false` |

Sizing (non-airMode): `options.width` → `$editor.outerWidth`; `options.height` → `$editable.outerHeight`; `options.maxHeight`/`options.minHeight` → CSS. At end: `history.recordUndo(); setLastRange()`.

`destroy()` → `$editable.off()`.

### handleKeyMap(event)

Builds key combo from `event` modifiers: pushes `CMD` (metaKey), `CTRL` (ctrlKey && !altKey), `SHIFT` (shiftKey), then `key.nameFromCode[keyCode]`. Looks up `options.keyMap[isMac?'mac':'pc'][combo]`.
- If key is `TAB` and `!options.tabDisable` → `afterCommand()` (record undo for native tab).
- Else if a mapped `eventName` exists → `context.invoke(eventName)`; if it returns !== false → `preventDefault()`, return true (shortcut handled).
- Else if `key.isEdit(keyCode)` → if `key.isRemove(keyCode)` invoke `'removed'`; then `afterCommand()`.
Returns false otherwise.

`preventDefaultEditableShortCuts(event)` — when `options.shortcuts` is OFF: preventDefault for Ctrl/Cmd + B(66)/I(73)/U(85) so the browser's native bold/italic/underline don't fire.

`isLimited(pad, event?)` — text-length gate. With `event`: returns false (not limited) for move/navigation keys, Ctrl/Meta combos, BACKSPACE/DELETE. If `options.maxTextLength > 0` and `editable.text().length + pad > maxTextLength` → true.

---

### Options consumed (from `options.*`)

`options.langInfo`, `options.callbacks` (`onApplyCustomStyle`, `onImageUpload`), `options.onCreateLink`, `options.styleWithCSS`, `options.shortcuts`, `options.keyMap.{mac,pc}`, `options.recordEveryKeystroke`, `options.maxTextLength`, `options.tabDisable`, `options.tabSize`, `options.spellCheck`, `options.disableGrammar`, `options.airMode`, `options.overrideContextMenu`, `options.width`, `options.height`, `options.maxHeight`, `options.minHeight`, `options.linkAddNoReferrer`, `options.linkAddNoOpener`, `options.maximumImageFileSize`.

(Defaults live in `src/js/settings.js` — not in this file. Notable: `styleWithCSS:false`, `tabSize:4`, `tabDisable:false`, `historyLimit:200`, `recordEveryKeystroke:false`, `maxTextLength:0`, `spellCheck:true`, `linkAddNoReferrer:false`, `linkAddNoOpener:false`.)

### Events triggered (`context.triggerEvent(ns, ...)`)

`before.command`, `change`, `enter`, `keydown`, `keyup`, `focus`, `blur`, `mousedown`, `mouseup`, `scroll`, `paste`, `copy`, `focusin`, `focusout`, `contextmenu`, `image.upload`, `image.upload.error`, `media.delete`.

### Cross-module invokes made BY Editor

- `context.invoke('codeview.purify', markup)` — security HTML purification in `pasteHTML`.
- `context.invoke('code', dom.emptyPara)` — in `empty()`.
- `context.invoke(eventName)` — dynamic keymap dispatch (any `'module.method'` from keyMap).
- `context.invoke('removed')` — self-dispatch on remove keys.

### Notable browser quirks / ordering constraints

- **`afterCommand(true)`** for native execCommand commands suppresses `change`; the debounced `input` handler emits it instead (avoids double-fire).
- **`onFormatBlock`** uses `'<'+tag+'>'` only for MSIE; modern browsers take the bare tag.
- **`focus()`** only focuses when unfocused (IE scroll-jump workaround).
- **Bogus span / `ZERO_WIDTH_NBSP_CHAR`** is inserted for collapsed font-styling so the cursor has a place to sit inside the new styled span; stashed in `$editable.data('bogus')`.
- **IME/composition limit**: the `input` handler reverts to `snapshot` when over `maxTextLength` because keydown can't reliably block composed (e.g. Korean) characters.
- **`setLastRange` editable-containment guard**: falls back to `createFromBodyElement` when the computed range escapes `.note-editable`.
- Module-instantiation order matters: `History` is created last but `recordUndo()` is called at the end of `initialize()` to seed the undo baseline.
- **`pasteHTML` purify** is the security boundary for pasted/programmatic HTML — the port must route programmatic HTML insertion through the same purifier (`codeviewFilter`/`codeviewIframeFilter` logic in Codeview).

### For the port (EditorCore command registry)

The chrome only ever calls `editor.<method>`; reimplement each table row above as a registry entry. Replace every `document.execCommand(...)` (`styleWithCSS`, `bold`/`italic`/`underline`/`strikethrough`/`superscript`/`subscript`, `justifyLeft/Center/Right/Full`, `FormatBlock`, `removeFormat`, `foreColor`, `backColor`, `unlink`) with a native range-based implementation, preserving the `beforeCommand → mutate → afterCommand` (and `afterCommand(true)` suppression) semantics, the `isLimited` guards, the bogus-span cursor handling, and the `lastRange` save/restore contract.