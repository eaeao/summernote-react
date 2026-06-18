# 옵션과 툴바

설정 가능한 모든 항목에 대한 레퍼런스입니다. `options` prop(`EditorCoreOptions`), `toolbar` / `popover` 튜플 포맷과 기본 제공 아이템 이름, 크롬(chrome)이 읽어 들이는 스타일/폰트/색상/줄 높이/테이블 데이터, 단축키, 테마, 그리고 번들에 포함된 로케일을 다룹니다.

> 이 항목 대부분은 전용 prop(`toolbar`, `theme`, `lang`)을 통해 설정하거나 툴바 아이템 이름을 조합해 구성합니다. prop 자체에 대해서는 [Component & state](./reference-component.md)를 참고하세요. 각 명령이 무엇을 하는지는 [Commands](./reference-commands.md)를 참고하세요.

---

## Options reference (`options` prop)

컴포넌트가 `value`와 `onChange`를 직접 소유하므로, `options` prop의 타입은 `Omit<EditorCoreOptions, 'value' | 'onChange'>`입니다.

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

> `onShortcut`은 `<SummernoteEditor>`가 내부적으로 설정해 예컨대 `'linkDialog.show'`를 크롬 다이얼로그로 라우팅합니다. `true`를 반환하면 엔진이 `preventDefault`를 호출합니다. 직접 `options`를 함께 전달하더라도 컴포넌트가 `value` / `onChange` / `onShortcut`을 덮어쓴다는 점에 유의하세요.

나머지 크롬 관련 설정(툴바, 폰트, 색상, 스타일, 줄 높이 등)은 엔진의 `defaultOptions`에 들어 있습니다. 아래 값들은 기본값과, 커스텀 툴바/플러그인이 `ChromeContext`를 통해 읽어 들이는 데이터를 문서화한 것입니다.

---

## Toolbar configuration

`toolbar` prop은 `[groupName, [itemName...]]` 튜플의 배열입니다. 그룹 이름은 CSS 그룹화를 위한 임의의 레이블이며, 두 번째 요소는 순서가 있는 아이템 이름 목록입니다.

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

아이템 이름은 툴바 레지스트리에 의해 드롭다운, 포맷 버튼, 또는 액션 버튼으로 해석됩니다. 이 표들에 없는 이름은 커스텀(플러그인) 슬롯으로 취급됩니다.

**Dropdowns**

| Name | Renders |
|---|---|
| `style` | 블록 스타일(포맷) 드롭다운 |
| `fontname` | 폰트 패밀리 드롭다운 |
| `fontsize` | 폰트 크기 드롭다운 |
| `fontsizeunit` | 폰트 크기 단위 드롭다운 |
| `height` | 줄 높이 드롭다운 |
| `color` | 글자색/배경색 드롭다운 |
| `paragraph` | 문단 정렬 드롭다운 |
| `table` | 테이블 삽입 선택기 |

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
| `link` | 링크 다이얼로그 |
| `picture` | 이미지 다이얼로그 |
| `video` | 비디오 다이얼로그 |
| `fullscreen` | 전체 화면 |
| `codeview` | 코드뷰 (WYSIWYG ↔ HTML) |
| `help` | 도움말 다이얼로그 |

> `isKnownItem(name)`은 해당 이름이 알려진 드롭다운 / 포맷 / 액션 이름(패키지에서 export됨)일 때에만 `true`를 반환합니다. 알려지지 않은 이름은 그 이름으로 등록된 플러그인 버튼을 렌더링하거나, 아무것도 렌더링하지 않습니다.

## Popover configuration

컨텍스트 팝오버는 표면(surface)별로 설정하며(`image`, `link`, `table`, `air`), 각각 `ToolbarGroup[]` 형태입니다. 팝오버 전용 아이템 이름은 다음과 같습니다: `resizeFull`/`resizeHalf`/`resizeQuarter`/`resizeNone`, `floatLeft`/`floatRight`/`floatNone`, `removeMedia`, `linkDialogShow`, `unlink`, `addRowDown`/`addRowUp`/`addColLeft`/`addColRight`, `deleteRow`/`deleteCol`/`deleteTable`.

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

`air` 팝오버는 에어 모드(`airMode` prop)에서 선택 영역에 렌더링되는 팝오버입니다.

## Style tags

블록 스타일 드롭다운(`style` 아이템)은 기본적으로 다음 태그들을 제공합니다.

```ts
['p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
```

이 값들은 `formatBlock` 명령을 구동합니다(스타일 드롭다운이 `formatBlock(tag)`을 호출합니다).

## Font names

폰트 패밀리 드롭다운(`fontname` 아이템)은 기본적으로 한국어 오피스 + 라틴 폰트 세트를 사용합니다.

```text
굴림, 굴림체, 궁서, 궁서체, 돋움, 돋움체, 맑은 고딕, 바탕, 바탕체,
Arial, Inter, Tahoma, Times New Roman, Verdana, Noto Sans KR
```

관련 설정: `fontNamesIgnoreCheck`("폰트 설치 여부" 필터에서 제외할 이름들, 기본값 `[]`)와 `addDefaultFonts`(기본 목록을 앞에 추가할지 여부, 기본값 `true`)가 있습니다. 아직 로드되지 않은 웹 폰트는 `fontNamesIgnoreCheck`에 나열되어 있지 않으면 필터링되어 제외될 수 있습니다.

## Font sizes & units

```ts
fontSizes:     ['8', '9', '10', '11', '12', '14', '18', '24', '36']   // fontsize dropdown
fontSizeUnits: ['px', 'pt']                                            // fontsizeunit dropdown
```

`fontSize(size)`는 `size + currentUnit`을 적용하며, `fontSizeUnit(unit)`은 현재 크기를 새 단위로 다시 적용합니다.

## Line heights

줄 높이 드롭다운(`height` 아이템)의 기본값은 다음과 같습니다.

```ts
['1.0', '1.2', '1.4', '1.5', '1.6', '1.8', '2.0', '3.0']
```

이 값들은 `lineHeight(ratio)` 명령을 구동합니다.

## Colors

색상 드롭다운(`color` 아이템)은 8×8 hex 팔레트(`colors`)를 위치상 대응되는 8×8 이름 그리드(`colorsName`)와 함께 렌더링합니다. 기본 분할 버튼(split-button)의 최근 색상은 `{ foreColor: '#000000', backColor: '#FFFF00' }`입니다(`colorButton`).

```text
Row 0: #000000 #424242 #636363 #9C9C94 #CEC6CE #EFEFEF #F7F7F7 #FFFFFF
Row 1: #FF0000 #FF9C00 #FFFF00 #00FF00 #00FFFF #0000FF #9C00FF #FF00FF
Row 2: #F7C6CE #FFE7CE #FFEFC6 #D6EFD6 #CEDEE7 #CEE7F7 #D6D6E7 #E7D6DE
Row 3: #E79C9C #FFC69C #FFE79C #B5D6A5 #A5C6CE #9CC6EF #B5A5D6 #D6A5BD
Row 4: #E76363 #F7AD6B #FFD663 #94BD7B #73A5AD #6BADDE #8C7BC6 #C67BA5
Row 5: #CE0000 #E79439 #EFC631 #6BA54A #4A7B8C #3984C6 #634AA5 #A54A7B
Row 6: #9C0000 #B56308 #BD9400 #397B21 #104A5A #085294 #311873 #731842
Row 7: #630000 #7B3900 #846300 #295218 #083139 #003163 #21104A #4A1031
```

색상 명령: `foreColor(color)`, `backColor(color)`, 또는 `color({ foreColor, backColor })`로 둘을 한 번에 적용할 수 있습니다.

## Tables

```ts
tableClassName:     'table table-bordered'   // class on inserted <table>
insertTableMaxSize: { col: 10, row: 10 }     // max dimensions in the size picker
```

테이블 명령: `insertTable('COLxROW')`, `addRow('top'|'bottom')`, `addCol('left'|'right')`, `deleteRow`, `deleteCol`, `deleteTable`. Tab / Shift+Tab으로 셀 간을 이동합니다.

## Keyboard shortcuts (`keyMap`)

단축키는 기본적으로 활성화되어 있으며(`shortcuts: true`), `options={{ shortcuts: false }}`로 비활성화할 수 있습니다. PC용과 Mac용 맵은 `options.isMac`(기본값은 감지된 플랫폼)에 따라 선택됩니다. 각 항목은 키 조합을 명령 메서드에 매핑하며, 그 메서드가 등록된 명령이면 직접 실행되고, 그렇지 않으면 `onShortcut`으로 디스패치됩니다(또는 네이티브 동작으로 남습니다).

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

`escape`, `insertParagraph`, `linkDialog.show`는 명령이 아니므로 `onShortcut`으로 떨어지거나 네이티브 동작으로 남습니다. `options`를 통해 커스텀 `keyMap`을 제공할 수 있습니다.

## History

`historyLimit`(기본값 `200`)은 실행 취소(undo) 스택의 깊이를 설정합니다. 엔진은 커밋된 명령마다, `setHTML`마다, 안정화된 타이핑/IME 실행마다, 그리고 완료된 이미지 업로드마다 하나의 undo 단계를 기록합니다.

---

## Themes

`theme` prop은 네 가지 스킨 중 하나를 **인스턴스 단위로** 선택합니다. 즉, 테마가 서로 다른 여러 에디터가 한 페이지에 공존할 수 있습니다. 이 prop은 루트 클래스(`note-theme-${theme}`)만 설정하며, 모든 테마는 동일한 `.note-*` 마크업과 아이콘 웹폰트를 공유합니다.

```ts
theme?: 'lite' | 'bs3' | 'bs4' | 'bs5'   // default 'lite'
// also exported: type ThemeName = 'lite' | 'bs3' | 'bs4' | 'bs5'
```

CSS는 자동으로 주입되지 **않으므로**, 직접 import해야 합니다. 서브패스 export는 다음과 같습니다.

| Import specifier | Skin |
|---|---|
| `@eaeao/summernote-react/styles.css` | base / lite 스킨 (**필수**) |
| `@eaeao/summernote-react/icons.css` | 공유 아이콘 웹폰트 (**필수**) |
| `@eaeao/summernote-react/themes/bs3.css` | Bootstrap 3 스킨 |
| `@eaeao/summernote-react/themes/bs4.css` | Bootstrap 4 스킨 |
| `@eaeao/summernote-react/themes/bs5.css` | Bootstrap 5 스킨 |

```tsx
import '@eaeao/summernote-react/styles.css';     // base skin (required)
import '@eaeao/summernote-react/icons.css';      // icon webfont (required)
import '@eaeao/summernote-react/themes/bs5.css'; // optional: Bootstrap-5 skin

<SummernoteEditor theme="bs5" />;
```

`styles.css` + `icons.css`가 기준선이며, `themes/bs{3,4,5}.css` 파일은 그 위에 얹혀 `note-theme-*` 루트 클래스를 통해 `theme` prop과 매칭됩니다.

---

## Dark mode

`colorScheme` prop으로 에디터를 다크 모드로 전환합니다 — `'light'`(기본), `'dark'`, 또는 `'auto'`(OS `prefers-color-scheme`를 따름). 루트에 `note-dark` 클래스를 추가하며, 모든 chrome 표면(툴바·드롭다운·다이얼로그·팝오버·코드뷰)이 그 루트 안에 렌더되므로 다크 테마가 전부에 캐스케이드됩니다.

```tsx
<SummernoteEditor colorScheme="dark" />
<SummernoteEditor colorScheme="auto" />   // OS prefers-color-scheme를 따름
```

lite 스킨은 색상을 `.note-editor`의 CSS 변수로 정의하므로, 변수를 덮어써서 직접 리테마링할 수도 있습니다 — 원하는 클래스나 `.note-dark`에 스코프해서:

```css
.note-editor.note-dark {
  --note-bg: #11131a;          /* editable + 드롭다운/다이얼로그/팝오버 표면 */
  --note-bg-toolbar: #181b22;  /* 툴바 + 상태바 */
  --note-text: #e8eaf0;        /* editable 텍스트 */
  --note-primary: #6d5efc;     /* primary(예: 다이얼로그 확인) 버튼 */
  /* 그 외: --note-bg-btn(-hover/-active), --note-border(-btn/-muted), --note-muted,
     --note-input-bg, --note-codable-bg / --note-codable-text, --note-shadow, … */
}
```

> bs3/bs4/bs5는 자체 다크 팔레트를 제공하지 않습니다 — 앱의 Bootstrap 테마(예: Bootstrap 5의 `data-bs-theme="dark"`)를 따릅니다. 다크 모드 자체 스타일링은 기본 **lite** 스킨에 구현되어 있습니다.

---

## Internationalization (i18n)

`lang` prop은 en-US 위에 깊은 병합(deep-merge)되는 `LangPartial`을 받습니다. 누락된 키는 `resolveLang`을 통해 영어로 폴백됩니다. 기본값(`lang` 미지정 시)은 `langEnUS`입니다.

```ts
type LangPartial = Record<string, Record<string, string> | undefined>;
function resolveLang(partial: LangPartial): Lang; // deep-merges over langEnUS per group
```

**번들에 포함된 46개 로케일**은 `locales`(`Record<string, LangPartial>`)로 제공되며, 그 코드는 `localeCodes`입니다.

```text
ar-AR, az-AZ, bg-BG, bn-BD, ca-ES, cs-CZ, da-DK, de-CH, de-DE, el-GR,
es-ES, es-EU, fa-IR, fi-FI, fr-FR, gl-ES, he-IL, hr-HR, hu-HU, id-ID,
it-IT, ja-JP, ko-KR, lt-LT, lt-LV, mn-MN, nb-NO, nl-NL, pl-PL, pt-BR,
pt-PT, ro-RO, ru-RU, sk-SK, sl-SI, sr-RS, sr-RS-Latin, sv-SE, ta-IN,
th-TH, tr-TR, uk-UA, uz-UZ, vi-VN, zh-CN, zh-TW
```

(en-US는 항상 존재하는 기준이며 `locales`에는 포함되지 않습니다.)

```tsx
// Option A: pull from the bundled set
import { SummernoteEditor, locales } from '@eaeao/summernote-react';
<SummernoteEditor lang={locales['ko-KR']} />;

// Option B: ad-hoc partial override (missing keys fall back to English)
<SummernoteEditor lang={{ link: { insert: '링크 삽입' } }} />;
```

> 레거시 summernote와 달리 `$.summernote.lang` 전역이 없으며, 초기화 전에 언어팩을 로드할 필요도 없습니다. 로케일 객체를 prop으로 전달하기만 하면 됩니다. 로케일 모듈은 트리 셰이킹이 가능합니다.

---

## See also

- [Component & state](./reference-component.md) — 이 설정을 소비하는 `toolbar`, `theme`, `lang` prop.
- [Commands](./reference-commands.md) — 각 툴바 아이템 / 단축키가 디스패치하는 명령.
- [Examples](./examples.md#custom-toolbar) — 커스텀 툴바, 테마, i18n 레시피.
