# 작동 원리

`@eaeao/summernote-react`의 기반 아이디어를 다룹니다. 엔진이 소유하는 영역과 React가 렌더링하는 영역, 리렌더링에도 커서가 유지되는 이유, 그리고 두 개의 보안 계층에 대해 설명합니다. 이 문서는 "왜"에 해당합니다. "무엇"에 해당하는 내용은 [API reference](./reference-component.md)를 참고하세요.

---

## 아키텍처

`@eaeao/summernote-react`는 summernote를 React + TypeScript로 처음부터 다시 포팅한 결과물입니다. 레거시 jQuery 에디터와 그 런타임은 사라졌습니다. 그 자리에는 다음이 있습니다.

- **헤드리스 엔진** (`EditorCore`, `@engine` 모듈 집합으로 export됨)이 `contentEditable` 서브트리를 명령형으로 소유합니다. 모든 편집은 구조적 Range 명령을 통해 수행하며, 커서의 조상 체인을 따라 올라가며 툴바 상태를 계산합니다.
- **React 바인딩**은 *크롬만* (툴바, 드롭다운, 다이얼로그, statusbar, 팝오버) 렌더링하고, 여기에 더해 단일 uncontrolled `contentEditable` 리프를 렌더링합니다. React는 콘텐츠를 editable로 재조정(reconcile)하지 않으므로, 크롬 리렌더링이 커서를 흐트러뜨릴 수 없습니다.

핵심 속성:

| 속성 | 값 |
|---|---|
| 패키지 | `@eaeao/summernote-react` |
| React | 18+ (peer dependency, `react-dom` 포함) |
| 런타임 의존성 | **0** |
| jQuery | **없음** |
| 모듈 포맷 | ESM + CJS + `.d.ts` (단일 dual 빌드) |
| 라이선스 | MIT |
| 검증 환경 | Chromium + WebKit |

> `$('.x').summernote(...)`는 더 이상 존재하지 않습니다. 에디터는 React 컴포넌트이고, 옵션은 props이며, 명령형 API는 타입이 지정된 `ref`입니다. [Migrating from jQuery](./migrating.md)를 참고하세요.

### React가 렌더링하는 영역 vs. 엔진이 소유하는 영역

React는 크롬과 리프 하나를 렌더링합니다. 그 리프는 엔진이 소유하는 uncontrolled `<div class="note-editable notranslate" contentEditable>`입니다. 이 div는 `translate="no"`, `data-gramm="false"`, `data-gramm_editor="false"`, `data-enable-grammarly="false"`를 지정하여 Google Translate / Grammarly가 선택(selection)을 가로채는 것을 차단합니다([확장 프로그램 안전 선택](#확장-프로그램-안전-선택) 참고). codeview가 열려 있을 때는 editable이 `display:none`이 되고 그 자리에 `<Codeview>` textarea가 렌더링됩니다.

루트 요소의 클래스는 다음으로 구성됩니다: `note-editor`, `note-frame`, `note-theme-${theme ?? 'lite'}`, `note-airframe` (에어 모드), `fullscreen` (전체 화면이 토글된 경우), 그리고 여러분이 지정한 `className`.

---

## controlled vs. uncontrolled 및 커서 안전 계약

**초기 값.** `value ?? defaultValue`가 엔진을 한 번 시드합니다. `value`(controlled)가 `defaultValue`(uncontrolled, 한 번만 적용됨)보다 우선합니다.

**uncontrolled.** `defaultValue`를 전달하거나 ref를 사용합니다. 마운트 이후에는 엔진이 콘텐츠를 소유하며, `onChange`가 편집 내용을 보고합니다.

```tsx
<SummernoteEditor defaultValue="<p>Edit me…</p>" onChange={save} />
```

**controlled.** `value` + `onChange`를 전달합니다. 외부 `value`는 **실제로 다르고, 우리 자신의 `onChange`가 되돌아온 echo가 아닐 때만** 엔진으로 푸시됩니다:

- `value === undefined`이거나 core가 마운트되지 않은 경우 건너뜁니다.
- **codeview가 열려 있는 동안**에는 textarea가 콘텐츠를 소유합니다. 외부 `value`는 (다를 때만) 엔진이 아니라 codeview HTML로 라우팅됩니다.
- 그 외의 경우, `value`가 마지막으로 방출된 변경 값과 같거나 **또는** `core.getHTML()`과 같으면(이미 적용됨) 일찍 반환합니다 — 이 가드들이 커서를 파괴하는 재시드를 방지합니다.
- 진정으로 새로운 외부 값만 `core.setHTML(value)`를 호출합니다.

```tsx
const [html, setHtml] = React.useState('<p>Hello</p>');
<SummernoteEditor value={html} onChange={setHtml} />;
```

**커서가 유지되는 이유.** React는 크롬과 단일 uncontrolled `contentEditable` 리프만 렌더링하며, editable 안으로 자식을 렌더링하지 않습니다. 따라서 크롬 리렌더링(툴바 / 상태 변경)은 커서를 흐트러뜨릴 수 없습니다. editable 서브트리의 source of truth는 React의 재조정기(reconciler)가 아니라 엔진이며, controlled `value`는 마지막으로 방출된 값과 현재 DOM HTML 양쪽 모두와 다를 때만 강제로 적용됩니다.

---

## 보안

두 개의 보호 계층이 있으며, 둘 다 엔진 쪽에 있습니다:

- **링크 URL 필터링.** `createLink`는 `<a>`를 생성하거나 갱신하기 전에 비어 있거나 안전하지 않은 URL(`javascript:`, `vbscript:`, `data:` 스킴)을 거부합니다. `newWindow: true`는 `target="_blank"`와 함께 `rel="noopener noreferrer"`를 추가합니다.
- **codeview 정화(sanitize).** codeview를 빠져나갈 때, (공격자가 영향을 줄 수 있는) textarea HTML은 `core.setHTML(...)` 이전에 `purifyCodeview(...)`를 거칩니다 — 이는 레거시 `codeviewFilter: true` 기본값과 일치합니다. 직접 HTML을 새니타이즈하고 싶다면 `purifyCodeview`는 패키지 루트에서 export됩니다.

> 모든 리치 텍스트 에디터가 그렇듯이, **프런트엔드 필터링만으로는 충분하지 않습니다** — 제출된 HTML을 저장하거나 렌더링하기 전에 항상 서버에서 다시 검증하고 정화하세요.

---

## 확장 프로그램 안전 선택

브라우저 확장 프로그램(사전, 번역기, Grammarly)과 페이지 번역 기능은 editable의 선택(selection)을 무너뜨리거나 가로챌 수 있습니다. 이 포트는 이에 대비해 견고하게 처리합니다:

- editable은 Grammarly(`data-gramm="false"`, `data-gramm_editor="false"`, `data-enable-grammarly="false"`)와 페이지 번역(`translate="no"`, `notranslate` 클래스)을 비활성화합니다.
- 툴바 mousedown 시 선택을 무너뜨리는 확장 프로그램이 있어도 선택이 유지됩니다. 직접 만든 툴바/플러그인 버튼에서는 항상 `onMouseDown={(e) => e.preventDefault()}`를 지정해 editable이 포커스를 유지하도록 하고, raw 클릭 핸들러에서 `core.command`를 호출하기보다 `useCommand()`(선택을 보존하면서 디스패치함)를 우선 사용하세요.

---

## 함께 보기

- [Component & state](./reference-component.md) — props와 명령형 ref.
- [Headless & plugin API](./reference-api.md) — `useSummernote`, `createEditorCore`, `definePlugin`.
- [Migrating from jQuery](./migrating.md) — 아키텍처가 레거시 jQuery 빌드에 어떻게 매핑되는지.
