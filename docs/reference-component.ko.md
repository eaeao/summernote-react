# 컴포넌트 & 상태

`<SummernoteEditor>` React 컴포넌트에 대한 레퍼런스입니다. props, 명령형 `ref` 핸들, 발행되는 `EditorState`, 그리고 `onChange` / `onImageUpload` 콜백을 다룹니다.

> 주변 표면(surface)에 대해서는 [Getting started](./getting-started.md)(설치 + 첫 에디터), [Commands](./reference-commands.md), [Options & toolbar](./reference-options.md), [Headless & plugin API](./reference-api.md), [How it works](./concepts.md)(controlled 커서 안전 계약)를 참고하세요.

---

## Props reference

`<SummernoteEditor>`는 `forwardRef<SummernoteEditorHandle, SummernoteEditorProps>`입니다. 모든 prop은 다음과 같습니다.

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | **Controlled** HTML 값입니다. 이 값을 제공하면 에디터는 controlled로 동작합니다([커서 안전 계약](./concepts.md) 참고). |
| `defaultValue` | `string` | — | **Uncontrolled** 초기 HTML로, 마운트 시 한 번만 적용됩니다. |
| `onChange` | `(html: string) => void` | — | 콘텐츠 변경이 커밋될 때마다 발생합니다. 새 editable HTML을 전달받습니다. |
| `options` | `Omit<EditorCoreOptions, 'value' \| 'onChange'>` | — | 엔진으로 전달되는 옵션입니다: `historyLimit`, `shortcuts`, `keyMap`, `isMac`, `onShortcut`. [Options reference](./reference-options.md#options-reference-options-prop)를 참고하세요. |
| `toolbar` | `readonly ToolbarGroup[]` where `ToolbarGroup = readonly [string, readonly string[]]` | summernote default toolbar | `[group, [itemName...]]` 형태의 툴바 설정 튜플입니다. [Toolbar configuration](./reference-options.md#toolbar-configuration)을 참고하세요. |
| `placeholder` | `string` | — | 비어 있는 editable 위에 표시되는 플레이스홀더입니다(codeview가 아니고 HTML이 비어 있을 때만 표시됩니다). |
| `disableResize` | `boolean` | `false` | 리사이즈 statusbar를 비활성화합니다. statusbar는 `!airMode && !disableResize && !codeview`일 때만 렌더링됩니다. |
| `airMode` | `boolean` | `false` | Air 모드입니다: 고정 툴바/statusbar가 없고, 선택(selection) 위치에 떠 있는 툴바가 나타납니다. 루트에 `note-airframe` 클래스를 추가합니다. |
| `plugins` | `readonly SummernotePlugin[]` | — | 인스턴스 단위 플러그인입니다. [Plugin API](./reference-api.md#plugins--defineplugin)를 참고하세요. |
| `theme` | `'lite' \| 'bs3' \| 'bs4' \| 'bs5'` | `'lite'` | **인스턴스 단위** 비주얼 테마입니다 — 서로 다른 테마를 쓰는 여러 에디터가 공존할 수 있습니다. 루트의 `note-theme-${theme}` 클래스를 결정합니다. [Themes](./reference-options.md#themes)를 참고하세요. |
| `colorScheme` | `'light' \| 'dark' \| 'auto'` | `'light'` | 다크 모드입니다. 루트에 `note-dark`를 추가하며, lite 스킨이 CSS 변수로 모든 chrome을 테마링합니다. `'auto'`는 OS `prefers-color-scheme`를 따릅니다. [Dark mode](./reference-options.md#dark-mode)를 참고하세요. |
| `lang` | `LangPartial` (= `Record<string, Record<string, string> \| undefined>`) | en-US | 로케일입니다. `resolveLang(lang)`를 통해 en-US 위에 deep-merge됩니다. `lang={locales['ko-KR']}`처럼 사용하세요. [i18n](./reference-options.md#internationalization-i18n)을 참고하세요. |
| `onImageUpload` | `ImageUploadHandler` (= `(file: File) => string \| Promise<string>`) | — | 이미지 업로드 훅입니다. base64로 임베드하는 대신 선택된 파일마다 호출되며, `src`를 반환/resolve하면 됩니다. [Callbacks](#callbacks--onchange-onimageupload)를 참고하세요. |
| `className` | `string` | — | 루트 `note-editor note-frame …` 요소에 덧붙는 추가 클래스입니다. |

---

## Imperative ref — `SummernoteEditorHandle`

엔진에 명령형으로 접근하려면 `ref`를 연결하세요. 핸들은 내부 코어가 바뀔 때 다시 계산됩니다.

```ts
export interface SummernoteEditorHandle {
  focus(): void;
  getCode(): string;
  setCode(html: string): void;
  command(name: string, ...args: unknown[]): boolean;
  undo(): void;
  redo(): void;
  readonly core: EditorCore | null;
}
```

| Member | Signature | Behavior |
|---|---|---|
| `focus` | `() => void` | editable에 포커스를 줍니다. |
| `getCode` | `() => string` | 현재 editable HTML입니다(마운트 전에는 `''`). |
| `setCode` | `(html: string) => void` | 콘텐츠를 교체합니다. |
| `command` | `(name, ...args) => boolean` | 임의의 엔진/플러그인 명령을 디스패치합니다(예: `'bold'`, `'insertText'`). 실행 여부를 반환합니다. [Commands](./reference-commands.md)를 참고하세요. |
| `undo` | `() => void` | 실행 취소입니다(`command('undo')`). |
| `redo` | `() => void` | 다시 실행입니다(`command('redo')`). |
| `core` | `EditorCore \| null` | 원시 엔진 인스턴스입니다(마운트 전에는 null) — [전체 헤드리스 API](./reference-api.md#editorcore-public-methods)로의 탈출구입니다. |

```tsx
import { useRef } from 'react';
import { SummernoteEditor, type SummernoteEditorHandle } from '@eaeao/summernote-react';

function Editor() {
  const ref = useRef<SummernoteEditorHandle>(null);
  return (
    <>
      <SummernoteEditor ref={ref} defaultValue="<p>Start…</p>" onChange={(h) => console.log(h)} />
      <button onClick={() => ref.current?.command('bold')}>Bold</button>
      <button onClick={() => ref.current?.command('insertText', 'Hello, world')}>Insert text</button>
      <button onClick={() => ref.current?.undo()}>Undo</button>
      <button onClick={() => console.log(ref.current?.getCode())}>Log HTML</button>
    </>
  );
}
```

> 레거시 summernote에서는 `$('#x').summernote('insertText', 'hi')`처럼 호출했습니다. 여기서 이에 해당하는 것은 `ref.current?.command('insertText', 'hi')`입니다 — `'module.method'` 형태의 문자열 디스패치 구문은 없으며, 모든 명령은 `command()`에 전달되는 평탄한 이름입니다. [Migrating from jQuery](./migrating.md)를 참고하세요.

---

## `EditorState`

엔진은 `subscribe(listener)` / `getSnapshot()`(`useSyncExternalStore` 소스)를 통해 커서의 구조적 상태 스냅샷을 발행합니다. 이는 커서의 조상 체인을 따라가며 계산되며 — `queryCommandState`는 사용하지 않습니다.

```ts
export interface EditorState {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly strikethrough: boolean;
  readonly superscript: boolean;
  readonly subscript: boolean;
  readonly orderedList: boolean;
  readonly unorderedList: boolean;
  readonly align: 'left' | 'center' | 'right' | 'justify' | null; // closest paragraph; null outside editor
  readonly formatBlock: string | null;        // lowercase tag p/h1..h6/blockquote/pre, or null
  readonly link: boolean;                       // caret inside an anchor
  readonly inTable: boolean;                    // caret inside a table cell
  readonly fontName: string;                    // first font-family at caret, dequoted ('' outside)
  readonly fontSize: string;                    // integer font-size as string, e.g. '14' ('' when none)
  readonly fontSizeUnit: string;                // 'px' | 'pt' | '%' … (defaults 'px')
  readonly lineHeight: string;                  // ratio e.g. '1.5' ('' when normal/none)
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly isComposing: boolean;                // IME composition in progress
}
```

이 값은 [`useSummernote`](./reference-api.md#headless-usesummernote--createeditorcore)에서 `state`로 받거나, 크롬/플러그인 컴포넌트 내부에서 `useChrome().state`를 통해 받습니다. 툴바는 이를 사용해 활성 버튼을 강조하고 실행 취소/다시 실행을 비활성화합니다.

---

## Callbacks — `onChange`, `onImageUpload`

(jQuery 이벤트와 `callbacks`를 모두 발화하던) 레거시 summernote와 달리, 이 포트는 순수 React props를 노출합니다 — 단일 채널이며 이중 이벤트 경로가 없습니다.

### `onChange(html: string)`

콘텐츠 변경이 커밋될 때마다 발생합니다: 명령의 `afterCommand`, `setHTML`, 직접 타이핑/IME 확정, 실행 취소, 다시 실행, 그리고 resolve된 이미지 업로드입니다. 현재의 `getHTML()`을 전달받습니다.

```tsx
<SummernoteEditor value={html} onChange={(next) => setHtml(next)} />
```

### `onImageUpload(file: File) => string | Promise<string>`

기본적으로 선택된 이미지는 **base64 data URL**로 임베드됩니다. `onImageUpload`을 제공하면 파일을 직접 업로드하고 삽입할 `src`(호스팅된 URL 또는 base64 문자열)를 반환할 수 있습니다. 이 핸들러는 **선택된 파일마다 한 번씩** 호출됩니다(단일 파일). 프로미스가 대기 중인 동안 에디터는 해당 위치에 로딩 스피너를 표시하며, 거부(reject)되면 플레이스홀더가 제거됩니다.

```tsx
<SummernoteEditor
  onImageUpload={async (file) => {
    const url = await uploadToS3(file); // your upload
    return url;                          // inserted as <img src={url}>
  }}
/>
```

동작 방식(엔진 `core.insertImageUpload`):

1. range를 해석합니다. 선택되었거나 소유된 것이 없으면 editable 끝의 커서를 기본값으로 사용합니다.
2. 플레이스홀더 `<img class="note-image-uploading" data-filename="…">`를 삽입하고 커서를 그 뒤로 옮긴 뒤 상태를 알립니다 — **이 시점에 스피너는 표시되지만 아직 변경/실행 취소 단계는 아닙니다**.
3. 핸들러를 실행합니다. resolve 시(플레이스홀더가 여전히 연결되어 있다면): `src`를 설정하고 `note-image-uploading` 클래스를 제거하며, 하나의 실행 취소 단계와 `onChange`를 커밋합니다. 업로드 도중 플레이스홀더가 연결 해제되었다면(실행 취소되었거나 다시 시드된 경우) 처리를 중단합니다.
4. reject 시: 플레이스홀더를 제거합니다. 따라서 일시적인 플레이스홀더가 저장된 값이나 실행 취소 스택으로 새어 나가는 일은 없습니다.

이미지 다이얼로그는 **URL**을 통한 삽입도 지원합니다(`onImageUpload`과 무관).

> 엔진이 노출하는 콜백 훅은 두 가지뿐입니다: `onChange`(위 참고)와 `onShortcut`(매칭된 단축키 중 그 메서드가 내장 명령이 아닌 경우, 예: `escape` / `insertParagraph` / `linkDialog.show`. `true`를 반환하면 `preventDefault`됩니다)입니다. `onShortcut`은 컴포넌트 내부에서 자동으로 연결됩니다.

---

## See also

- [Commands](./reference-commands.md) — 전체 `command(name, ...args)` 카탈로그입니다.
- [Options & toolbar](./reference-options.md) — 엔진 옵션, 툴바/팝오버 아이템 이름, 폰트, 색상, 키맵, 테마, 로케일입니다.
- [Headless & plugin API](./reference-api.md) — `useSummernote`, `createEditorCore`, `EditorCore` 메서드, `definePlugin`입니다.
- [How it works](./concepts.md) — 아키텍처와 controlled 커서 안전 계약입니다.
