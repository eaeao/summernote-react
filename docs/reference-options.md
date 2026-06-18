# Options & toolbar

Reference for everything configurable: the `options` prop (`EditorCoreOptions`), the `toolbar` / `popover` tuple format and built-in item names, the style/font/color/line-height/table data the chrome reads, keyboard shortcuts, themes, and the bundled locales.

> Most of this is configured through dedicated props (`toolbar`, `theme`, `lang`) or by composing toolbar item names. For the props themselves see [Component & state](./reference-component.md); for what each command does see [Commands](./reference-commands.md).

---

## Options reference (`options` prop)

The component owns `value` and `onChange`, so the `options` prop is `Omit<EditorCoreOptions, 'value' | 'onChange'>`:

```ts
export interface EditorCoreOptions {
  value?: string;                              // managed by the component
  onChange?: (html: string) => void;           // managed by the component
  historyLimit?: number;                        // undo-stack depth (default 200)
  shortcuts?: boolean;                          // enable keyboard shortcuts (default true)
  keyMap?: KeyMap;                             // default the ported pc/mac keyMap
  isMac?: boolean;                            // use mac keyMap (default env.isMac)
  onShortcut?: (method: string) => boolean;     // shortcut whose method is NOT an editing command
}
```

```tsx
<SummernoteEditor
  options={{
    historyLimit: 500,
    shortcuts: true,
    isMac: false,
  }}
/>
```

> `onShortcut` is set internally by `<SummernoteEditor>` to route e.g. `'linkDialog.show'` to the chrome dialog; returning `true` makes the engine `preventDefault`. If you also pass your own `options`, note the component overrides `value` / `onChange` / `onShortcut`.

The remaining chrome-relevant configuration (toolbar, fonts, colors, styles, line heights, etc.) lives in the engine's `defaultOptions`. The values below document the defaults and the data your custom toolbar/plugins read via `ChromeContext`.

---

## Toolbar configuration

The `toolbar` prop is an array of `[groupName, [itemName...]]` tuples. The group name is an arbitrary CSS-grouping label; the second element is the ordered list of item names.

**Default toolbar:**

```tsx
const defaultToolbar = [
  ['style',    ['style', 'fontsize', 'height']],
  ['font',     ['bold', 'underline', 'clear']],
  ['fontname', ['fontname']],
  ['color',    ['color']],
  ['para',     ['ul', 'ol', 'paragraph']],
  ['table',    ['table']],
  ['insert',   ['link', 'picture', 'video']],
  ['view',     ['fullscreen', 'codeview', 'help']],
];
```

**A custom toolbar:**

```tsx
<SummernoteEditor
  toolbar={[
    ['style', ['bold', 'italic', 'underline', 'clear']],
    ['font', ['fontname', 'fontsize']],
    ['color', ['color']],
    ['para', ['ul', 'ol', 'paragraph']],
    ['insert', ['link', 'picture', 'video', 'hr']],
    ['view', ['undo', 'redo', 'fullscreen', 'codeview', 'help']],
  ]}
/>
```

## Toolbar / popover item names

Item names are resolved by the toolbar registry to dropdowns, format buttons, or action buttons. Any name not in these tables is treated as a custom (plugin) slot.

**Dropdowns**

| Name | Renders |
|---|---|
| `style` | Block-style (format) dropdown |
| `fontname` | Font-family dropdown |
| `fontsize` | Font-size dropdown |
| `fontsizeunit` | Font-size-unit dropdown |
| `height` | Line-height dropdown |
| `color` | Fore/back color dropdown |
| `paragraph` | Paragraph-align dropdown |
| `table` | Insert-table picker |

**Format buttons** (name → bound command, with derived active/disabled state)

| Name | Command | Active / disabled |
|---|---|---|
| `bold` | `bold` | active = `state.bold` |
| `italic` | `italic` | active = `state.italic` |
| `underline` | `underline` | active = `state.underline` |
| `strikethrough` | `strikethrough` | active = `state.strikethrough` |
| `superscript` | `superscript` | active = `state.superscript` |
| `subscript` | `subscript` | active = `state.subscript` |
| `clear` | `removeFormat` | — |
| `ul` | `insertUnorderedList` | active = `state.unorderedList` |
| `ol` | `insertOrderedList` | active = `state.orderedList` |
| `hr` | `insertHorizontalRule` | — |
| `undo` | `undo` | disabled = `!state.canUndo` |
| `redo` | `redo` | disabled = `!state.canRedo` |

**Action buttons** (name → chrome handler)

| Name | Opens / toggles |
|---|---|
| `link` | Link dialog |
| `picture` | Image dialog |
| `video` | Video dialog |
| `fullscreen` | Fullscreen |
| `codeview` | Codeview (WYSIWYG ↔ HTML) |
| `help` | Help dialog |

> `isKnownItem(name)` returns `true` iff the name is a known dropdown / format / action name (exported from the package). Unknown names render the plugin button registered under that name, or nothing.

## Popover configuration

Contextual popovers are configured per surface (`image`, `link`, `table`, `air`), each as a `ToolbarGroup[]`. Popover-only item names: `resizeFull`/`resizeHalf`/`resizeQuarter`/`resizeNone`, `floatLeft`/`floatRight`/`floatNone`, `removeMedia`, `linkDialogShow`, `unlink`, `addRowDown`/`addRowUp`/`addColLeft`/`addColRight`, `deleteRow`/`deleteCol`/`deleteTable`.

**Default popover config:**

```tsx
const defaultPopover = {
  image: [
    ['resize', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
    ['float',  ['floatLeft', 'floatRight', 'floatNone']],
    ['remove', ['removeMedia']],
  ],
  link: [['link', ['linkDialogShow', 'unlink']]],
  table: [
    ['add',    ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
    ['delete', ['deleteRow', 'deleteCol', 'deleteTable']],
  ],
  air: [
    ['color',  ['color']],
    ['font',   ['bold', 'underline', 'clear']],
    ['para',   ['ul', 'paragraph']],
    ['table',  ['table']],
    ['insert', ['link', 'picture']],
    ['view',   ['fullscreen', 'codeview']],
  ],
};
```

The `air` popover is what renders in air mode (the `airMode` prop) at the selection.

## Style tags

The block-style dropdown (`style` item) offers these tags by default:

```ts
['p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
```

These drive the `formatBlock` command (the style dropdown calls `formatBlock(tag)`).

## Font names

The font-family dropdown (`fontname` item) defaults to a Korean-office + Latin set:

```
굴림, 굴림체, 궁서, 궁서체, 돋움, 돋움체, 맑은 고딕, 바탕, 바탕체,
Arial, Inter, Tahoma, Times New Roman, Verdana, Noto Sans KR
```

Companion settings: `fontNamesIgnoreCheck` (names exempt from the "is font installed" filter, default `[]`) and `addDefaultFonts` (whether to prepend the default list, default `true`). Web fonts that aren't loaded yet may be filtered out unless listed in `fontNamesIgnoreCheck`.

## Font sizes & units

```ts
fontSizes:     ['8', '9', '10', '11', '12', '14', '18', '24', '36']   // fontsize dropdown
fontSizeUnits: ['px', 'pt']                                            // fontsizeunit dropdown
```

`fontSize(size)` applies `size + currentUnit`; `fontSizeUnit(unit)` re-applies the current size in a new unit.

## Line heights

The line-height dropdown (`height` item) defaults to:

```ts
['1.0', '1.2', '1.4', '1.5', '1.6', '1.8', '2.0', '3.0']
```

These drive the `lineHeight(ratio)` command.

## Colors

The color dropdown (`color` item) renders an 8×8 hex palette (`colors`) with a positionally matched 8×8 name grid (`colorsName`). The default split-button recents are `{ foreColor: '#000000', backColor: '#FFFF00' }` (`colorButton`).

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

Color commands: `foreColor(color)`, `backColor(color)`, or both at once via `color({ foreColor, backColor })`.

## Tables

```ts
tableClassName:     'table table-bordered'   // class on inserted <table>
insertTableMaxSize: { col: 10, row: 10 }     // max dimensions in the size picker
```

Table commands: `insertTable('COLxROW')`, `addRow('top'|'bottom')`, `addCol('left'|'right')`, `deleteRow`, `deleteCol`, `deleteTable`. Tab / Shift+Tab navigate cells.

## Keyboard shortcuts (`keyMap`)

Shortcuts are enabled by default (`shortcuts: true`); disable with `options={{ shortcuts: false }}`. The PC vs. Mac map is chosen by `options.isMac` (defaults to the detected platform). Each entry maps a key combo to a command method; if the method is a registered command it runs directly, otherwise it is dispatched to `onShortcut` (or left native).

| PC combo | Mac combo | Method |
|---|---|---|
| `ESC` | `ESC` | `escape` |
| `ENTER` | `ENTER` | `insertParagraph` |
| `CTRL+Z` | `CMD+Z` | `undo` |
| `CTRL+Y` | `CMD+SHIFT+Z` | `redo` |
| `TAB` | `TAB` | `tab` |
| `SHIFT+TAB` | `SHIFT+TAB` | `untab` |
| `CTRL+B` | `CMD+B` | `bold` |
| `CTRL+I` | `CMD+I` | `italic` |
| `CTRL+U` | `CMD+U` | `underline` |
| `CTRL+SHIFT+S` | `CMD+SHIFT+S` | `strikethrough` |
| `CTRL+BACKSLASH` | `CMD+BACKSLASH` | `removeFormat` |
| `CTRL+SHIFT+L` | `CMD+SHIFT+L` | `justifyLeft` |
| `CTRL+SHIFT+E` | `CMD+SHIFT+E` | `justifyCenter` |
| `CTRL+SHIFT+R` | `CMD+SHIFT+R` | `justifyRight` |
| `CTRL+SHIFT+J` | `CMD+SHIFT+J` | `justifyFull` |
| `CTRL+SHIFT+NUM7` | `CMD+SHIFT+NUM7` | `insertUnorderedList` |
| `CTRL+SHIFT+NUM8` | `CMD+SHIFT+NUM8` | `insertOrderedList` |
| `CTRL+LEFTBRACKET` | `CMD+LEFTBRACKET` | `outdent` |
| `CTRL+RIGHTBRACKET` | `CMD+RIGHTBRACKET` | `indent` |
| `CTRL+NUM0` | `CMD+NUM0` | `formatPara` |
| `CTRL+NUM1`..`NUM6` | `CMD+NUM1`..`NUM6` | `formatH1`..`formatH6` |
| `CTRL+ENTER` | `CMD+ENTER` | `insertHorizontalRule` |
| `CTRL+K` | `CMD+K` | `linkDialog.show` |

`escape`, `insertParagraph`, and `linkDialog.show` are not commands — they fall through to `onShortcut` or stay native. You can supply a custom `keyMap` via `options`.

## History

`historyLimit` (default `200`) sets the undo-stack depth. The engine records one undo step per committed command, per `setHTML`, per settled typing/IME run, and per resolved image upload.

---

## Themes

The `theme` prop selects one of four skins, **per-instance** — multiple editors with different themes coexist on one page. The prop only sets a root class (`note-theme-${theme}`); all themes share the same `.note-*` markup and icon webfont.

```ts
theme?: 'lite' | 'bs3' | 'bs4' | 'bs5'   // default 'lite'
// also exported: type ThemeName = 'lite' | 'bs3' | 'bs4' | 'bs5'
```

CSS is **not** auto-injected — import it yourself. Subpath exports:

| Import specifier | Skin |
|---|---|
| `@eaeao/summernote-react/styles.css` | base / lite skin (**required**) |
| `@eaeao/summernote-react/icons.css` | shared icon webfont (**required**) |
| `@eaeao/summernote-react/themes/bs3.css` | Bootstrap 3 skin |
| `@eaeao/summernote-react/themes/bs4.css` | Bootstrap 4 skin |
| `@eaeao/summernote-react/themes/bs5.css` | Bootstrap 5 skin |

```tsx
import '@eaeao/summernote-react/styles.css';     // base skin (required)
import '@eaeao/summernote-react/icons.css';      // icon webfont (required)
import '@eaeao/summernote-react/themes/bs5.css'; // optional: Bootstrap-5 skin

<SummernoteEditor theme="bs5" />;
```

`styles.css` + `icons.css` are the baseline; the `themes/bs{3,4,5}.css` files layer on top, matched to the `theme` prop via the `note-theme-*` root class.

---

## Internationalization (i18n)

The `lang` prop accepts a `LangPartial` deep-merged over en-US. Missing keys fall back to English via `resolveLang`. The default (no `lang`) is `langEnUS`.

```ts
type LangPartial = Record<string, Record<string, string> | undefined>;
function resolveLang(partial: LangPartial): Lang; // deep-merges over langEnUS per group
```

**46 bundled locales** are available as `locales` (a `Record<string, LangPartial>`); their codes are `localeCodes`:

```
ar-AR, az-AZ, bg-BG, bn-BD, ca-ES, cs-CZ, da-DK, de-CH, de-DE, el-GR,
es-ES, es-EU, fa-IR, fi-FI, fr-FR, gl-ES, he-IL, hr-HR, hu-HU, id-ID,
it-IT, ja-JP, ko-KR, lt-LT, lt-LV, mn-MN, nb-NO, nl-NL, pl-PL, pt-BR,
pt-PT, ro-RO, ru-RU, sk-SK, sl-SI, sr-RS, sr-RS-Latin, sv-SE, ta-IN,
th-TH, tr-TR, uk-UA, uz-UZ, vi-VN, zh-CN, zh-TW
```

(en-US is the always-present base, not in `locales`.)

```tsx
// Option A: pull from the bundled set
import { SummernoteEditor, locales } from '@eaeao/summernote-react';
<SummernoteEditor lang={locales['ko-KR']} />;

// Option B: ad-hoc partial override (missing keys fall back to English)
<SummernoteEditor lang={{ link: { insert: '링크 삽입' } }} />;
```

> Unlike legacy summernote, there is no `$.summernote.lang` global and no requirement to load a language pack before init — pass the locale object as a prop. Locale modules are tree-shakeable.

---

## See also

- [Component & state](./reference-component.md) — the `toolbar`, `theme`, and `lang` props that consume this config.
- [Commands](./reference-commands.md) — what each toolbar item / shortcut dispatches.
- [Examples](./examples.md) — custom-toolbar, themes, and i18n recipes.
