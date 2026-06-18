# 시작하기

`@eaeao/summernote-react`를 설치하고 첫 에디터를 만들어 봅니다. summernote를 React + TypeScript로 포팅한 패키지로, 자체 엔진을 내장하며 **런타임 의존성이 0이고 jQuery도 사용하지 않습니다**.

`@eaeao/summernote-react`는 편집 엔진과 React 바인딩을 단일 npm 패키지로 제공합니다. 일반적인 React 컴포넌트(`<SummernoteEditor value={html} onChange={setHtml} />`)처럼 사용하면 되며, `$('.x').summernote(...)`도 전역 상태도 없습니다. `react`/`react-dom`(>= 18)은 **peer 의존성**이고, 나머지는 모두 번들에 포함되어 있습니다.

이 가이드는 빈 프로젝트에서 시작해 **커스텀 툴바를 갖춘 controlled 에디터**까지 단계별로 안내합니다. 각 단계는 이전 단계 위에 쌓이므로, 진행하면서 스니펫을 그대로 복사해 사용하세요.

---

## 설치

```bash
npm install @eaeao/summernote-react
# or
yarn add @eaeao/summernote-react
```

`react`와 `react-dom`(>= 18)은 peer 의존성입니다. 앱에 아직 없다면 함께 설치하세요:

```bash
npm install react react-dom
```

그 외에 추가로 설치할 것은 없습니다. 에디터 엔진이 번들에 포함되어 있으므로 jQuery, Bootstrap의 JS, Popper, FontAwesome은 **필요하지 않습니다**.

---

## CSS 가져오기

이 패키지는 스타일을 자동으로 주입하지 **않습니다**. CSS를 직접 가져와야 합니다. 두 개의 기본 스타일시트는 항상 필요합니다:

```tsx
import '@eaeao/summernote-react/styles.css'; // base/lite skin (required)
import '@eaeao/summernote-react/icons.css';  // shared icon webfont (required)
```

아이콘 webfont(`icons.css`)는 모든 테마가 공유합니다. 네 가지 테마는 base 위에 얹는 CSS 스킨이며, `theme` prop을 통해 **인스턴스 단위로** 적용됩니다. Bootstrap 테마를 사용한다면 해당 스킨도 함께 가져오세요:

| Import specifier | Theme |
|---|---|
| `@eaeao/summernote-react/styles.css` | base / `lite` skin (required) |
| `@eaeao/summernote-react/icons.css` | shared icon webfont (required) |
| `@eaeao/summernote-react/themes/bs3.css` | `bs3` skin |
| `@eaeao/summernote-react/themes/bs4.css` | `bs4` skin |
| `@eaeao/summernote-react/themes/bs5.css` | `bs5` skin |

이 임포트는 보통 앱의 진입점에서 한 번만 작성합니다.

---

## 첫 에디터

```tsx
import { SummernoteEditor } from '@eaeao/summernote-react';
import '@eaeao/summernote-react/styles.css';
import '@eaeao/summernote-react/icons.css';

export function Example() {
  return <SummernoteEditor defaultValue="<p>Hello Summernote</p>" />;
}
```

이것으로 끝입니다. 기본 툴바, 상태바 크기 조절 핸들, 드롭다운, 다이얼로그(링크/이미지/비디오/도움말), 컨텍스트 팝오버를 모두 갖춘, 완전히 동작하는 에디터가 만들어집니다.

루트 요소는 `<div class="note-editor note-frame note-theme-lite …">`입니다. React는 *크롬(주변 UI)*(툴바, 드롭다운, 다이얼로그, 상태바, 팝오버)과, 엔진이 소유하며 명령형으로 변경하는 단일 `contentEditable` 리프(leaf)만 렌더링합니다. React는 editable 내부를 절대 재조정(reconcile)하지 않으므로, 툴바/상태 리렌더가 커서를 흩트릴 수 없습니다. (왜 중요한지: [동작 원리](./concepts.md).)

---

## 콘텐츠 읽기와 제어

이 에디터는 두 가지 React 패턴을 모두 지원합니다. 초기 콘텐츠는 `value ?? defaultValue`입니다. `value`(controlled)가 `defaultValue`(uncontrolled, 마운트 시 한 번만 적용)보다 우선합니다.

### Uncontrolled

`defaultValue`로 초기 HTML을 전달하고, 그 이후의 콘텐츠는 엔진이 소유하도록 둡니다. 편집 결과는 `onChange`나 명령형 ref를 통해 읽습니다.

```tsx
import { SummernoteEditor } from '@eaeao/summernote-react';

export function Uncontrolled() {
  return (
    <SummernoteEditor
      defaultValue="<p>Start typing…</p>"
      onChange={(html) => console.log('changed:', html)}
    />
  );
}
```

### Controlled

`value`를 `onChange`와 함께 전달해 HTML을 React 상태에 유지합니다. 컴포넌트는 외부 `value`가 마지막으로 방출한 값과 현재 editable HTML 모두와 **실제로 다를 때에만** 엔진에 밀어 넣습니다. 이러한 echo 가드 덕분에 입력 중에도 커서가 안정적으로 유지됩니다.

```tsx
import { useState } from 'react';
import { SummernoteEditor } from '@eaeao/summernote-react';

export function Controlled() {
  const [html, setHtml] = useState('<p>Edit me</p>');
  return <SummernoteEditor value={html} onChange={setHtml} />;
}
```

`onChange`의 타입은 `(html: string) => void`입니다. 커밋된 모든 변경, 즉 툴바/키보드 명령, `setCode`, 직접 입력/IME 확정, undo, redo, 그리고 완료된 이미지 업로드 이후에 호출됩니다. 인자는 현재 editable HTML입니다.

> 코드 뷰가 열려 있을 때는 textarea가 콘텐츠를 소유합니다. 외부 `value`는 코드 뷰로 라우팅되며, 코드 뷰를 벗어날 때 (공격자가 영향을 줄 수 있는) HTML은 엔진에 다시 적용되기 전에 소독(sanitize)됩니다.

---

## ref로 명령형 제어하기

`ref`를 전달하면 메서드를 직접 호출할 수 있습니다. 폼 형태의 "저장" 버튼이나 에디터 바깥의 툴바 액션에 유용합니다. 핸들 타입은 `SummernoteEditorHandle`입니다:

```tsx
import { useRef } from 'react';
import { SummernoteEditor } from '@eaeao/summernote-react';
import type { SummernoteEditorHandle } from '@eaeao/summernote-react';

export function WithRef() {
  const ref = useRef<SummernoteEditorHandle>(null);
  return (
    <>
      <SummernoteEditor ref={ref} defaultValue="<p>Start…</p>" />
      <button onClick={() => ref.current?.command('bold')}>Bold</button>
      <button onClick={() => ref.current?.command('insertText', 'Hello, world')}>Insert text</button>
      <button onClick={() => console.log(ref.current?.getCode())}>Log HTML</button>
    </>
  );
}
```

이 핸들은 `focus`, `getCode`, `setCode`, `command`, `undo`, `redo`와, 로우레벨 탈출구인 `core`를 노출합니다. 자세한 내용은 [`SummernoteEditorHandle` 레퍼런스](./reference-component.md#imperative-ref--summernoteeditorhandle)에 문서화되어 있습니다. `command(name, ...args)`는 summernote의 문자열 디스패치 API(`summernote('insertText', 'hi')`)에 대응하는 React 방식입니다. 전체 목록은 [명령 카탈로그](./reference-commands.md)를 참고하세요.

---

## 툴바 커스터마이징

`toolbar` prop은 `[groupName, [itemName, …]]` 튜플의 배열입니다. 그룹 이름은 CSS 그룹화 레이블이고, 두 번째 요소는 순서가 있는 아이템 이름 목록입니다.

```tsx
<SummernoteEditor
  defaultValue="<p>Hi</p>"
  toolbar={[
    ['style', ['style', 'bold', 'italic', 'underline', 'clear']],
    ['para', ['ul', 'ol', 'paragraph']],
    ['insert', ['link', 'picture', 'video']],
    ['view', ['fullscreen', 'codeview', 'help']],
  ]}
/>
```

인식되는 아이템 이름:

- **드롭다운**: `style`, `fontname`, `fontsize`, `fontsizeunit`, `height`(줄 높이), `color`, `paragraph`, `table`.
- **포맷 버튼**: `bold`, `italic`, `underline`, `strikethrough`, `superscript`, `subscript`, `clear`, `ul`, `ol`, `hr`, `undo`, `redo`.
- **액션 버튼**: `link`, `picture`, `video`, `fullscreen`, `codeview`, `help`.

그 외의 이름은 커스텀 플러그인 버튼으로 해석됩니다. 기본 툴바 레이아웃, 전체 아이템 이름 표, 컨텍스트 팝오버 레이아웃은 [툴바 레퍼런스](./reference-options.md#toolbar--popover-item-names)에 있습니다. 툴바를 완전히 숨기려면 `toolbar={[]}`를 전달하세요.

---

## 더 나아가기

이제 자신만의 툴바를 갖춘, 동작하고 제어 가능한 에디터가 준비되었습니다. 여기서부터는 필요한 것을 골라 보세요. 각 항목은 복사해 붙여 넣을 수 있는 레시피와 전체 레퍼런스로 연결됩니다:

- **테마** — `theme="lite | bs3 | bs4 | bs5"`, 인스턴스 단위(맞는 CSS 스킨을 가져오세요); 서로 다른 테마의 에디터가 한 페이지에 공존할 수 있습니다. → [레시피](./examples.md#themes) · [레퍼런스](./reference-options.md#themes)
- **현지화(i18n)** — `lang={locales['ko-KR']}`; 46개 로케일이 번들에 포함되며, 누락된 키는 영어로 폴백됩니다. → [레시피](./examples.md#localization-i18n) · [레퍼런스](./reference-options.md#internationalization-i18n)
- **이미지 업로드** — `onImageUpload={(file) => string | Promise<string>}`로 기본 base64 임베드를 직접 호스팅한 `src`로 대체합니다. → [레시피](./examples.md#image-upload-async-onimageupload) · [레퍼런스](./reference-component.md#callbacks--onchange-onimageupload)
- **플러그인** — `definePlugin`으로 인스턴스 단위의 명령과 툴바 버튼을 추가합니다. → [레시피](./examples.md#custom-plugin) · [플러그인 API](./reference-api.md#plugins--defineplugin)
- **헤드리스 / 자체 크롬** — `useSummernote()`나 `createEditorCore()`는 내장 UI 없이 엔진만 제공합니다. → [헤드리스 레퍼런스](./reference-api.md#headless-usesummernote--createeditorcore)
- **TypeScript** — 패키지가 자체 선언(`SummernoteEditorProps`, `SummernoteEditorHandle`, `ThemeName`, `SummernotePlugin`, `UseSummernoteResult`, `ImageUploadHandler`)을 함께 제공하므로 `@types/...`가 필요 없습니다.

---

## 다음 단계

- [Examples](./examples.md) — 복사해 붙여 넣을 수 있는 레시피(에어 모드, 테마, i18n, 이미지 업로드, 커스텀 툴바, 플러그인 등).
- [Reference](./reference-component.md) — 모든 `<SummernoteEditor>` prop, `SummernoteEditorHandle` ref, 전체 `command(...)` 카탈로그, 엔진 옵션, `EditorState`, 그리고 헤드리스 훅.
- [동작 원리](./concepts.md) — 아키텍처, 커서 안전 계약, 보안 모델.
- [jQuery에서 이전하기](./migrating.md) — 레거시 jQuery summernote에서 넘어오는 경우.
