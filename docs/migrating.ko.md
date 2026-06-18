# jQuery summernote에서 이전하기

`@eaeao/summernote-react`는 래퍼가 아니라 처음부터 새로 작성한 React + TypeScript 포트입니다. `$('.x').summernote(...)`도, `$.summernote.*` 전역도, jQuery도 없습니다. 이 페이지는 레거시 jQuery API를 React API로 매핑합니다.

> 아키텍처 배경은 [동작 원리](./concepts.md)를 참고하세요. 전체 API는 [API 레퍼런스](./reference-component.md)를 참고하세요.

---

## 한눈에 보기

| jQuery summernote (v0.9) | `@eaeao/summernote-react` |
|---|---|
| `$('.x').summernote(options)` (초기화) | `<SummernoteEditor …props />` 렌더 |
| `$('.x').summernote('insertText', 'hi')` (메서드 호출) | `ref.current?.command('insertText', 'hi')` |
| `$('.x').summernote('code')` / `'code', html` | `ref.current?.getCode()` / `setCode(html)`, 또는 controlled `value` / `onChange` |
| `$('.x').summernote('destroy')` | 컴포넌트 언마운트 (React 라이프사이클) |
| `options` 객체 | 컴포넌트 **props** (`toolbar`, `theme`, `lang`, `placeholder`, …) |
| `callbacks: { onChange }` + `summernote.change` jQuery 이벤트 | `onChange` prop (단일 채널) |
| `$.extend(true, $.summernote.lang, …)` (전역) | `lang={locales['ko-KR']}` prop, `resolveLang`로 deep-merge |
| `$.extend($.summernote.plugins, { name })` (전역) | `definePlugin({ name, commands, buttons })` → `plugins={[…]}` (인스턴스별) |
| `$.summernote.ui.button/dialog` (jQuery DOM) | JSX 렌더; `Modal`, `useChrome`, `options.icons` 재사용 |
| `$.summernote.interface` → `'BS3' \| 'Lite'` (전역, 마지막이 승리) | `theme="lite\|bs3\|bs4\|bs5"` prop (인스턴스별, 공존) |
| summernote 뒤에 UMD `<script>`, **로드 순서가 중요** | ES 모듈 `import`; 스크립트 순서 없음, 전역 없음 |

---

## `$('.x').summernote(...)`가 아니라 컴포넌트

초기화는 렌더링이고, 정리는 언마운트입니다. 메서드 호출은 타입이 지정된 `ref`를 통해 이뤄집니다 ([컴포넌트 & 상태](./reference-component.md#imperative-ref--summernoteeditorhandle) 참고).

```tsx
const ref = useRef<SummernoteEditorHandle>(null);
<SummernoteEditor ref={ref} defaultValue="<p>Hi</p>" />;
// ref.current?.getCode()  ← 'code' getter
// ref.current?.setCode(html)  ← 'code' setter
// ref.current?.command('bold')  ← method call
```

[클릭하여 편집](./examples.md#click-to-edit) 예제는 초기화/정리에 대응하는 동작을 보여줍니다. 마운트는 엔진을 생성하고, 언마운트는 `core.destroy()`를 실행합니다.

## 문자열 디스패치 대신 명령

`'module.method'` 형태의 문자열 디스패치는 없습니다. 모든 편집 동작은 `command()`에 전달되는 평탄한 명령 이름입니다(버튼에서는 `useCommand()`). [명령 카탈로그](./reference-commands.md)를 참고하세요.

```tsx
// legacy: $('#x').summernote('insertImage', src);
ref.current?.command('insertImage', src);
```

## 옵션은 props입니다

레거시 `options` 객체는 props가 됩니다. 얕은 병합(shallow-merge)으로 인한 함정도 없고, 덮어쓸 전역 기본값도 없습니다. 원하는 값을 그대로 전달하면 됩니다.

```tsx
<SummernoteEditor
  toolbar={[['font', ['bold', 'italic']], ['para', ['ul', 'ol']]]}
  theme="bs5"
  placeholder="Write…"
  options={{ historyLimit: 500 }}
/>
```

전체 목록은 [옵션 & 툴바](./reference-options.md)를 참고하세요.

## i18n: `$.summernote.lang`이 아니라 `lang` prop

`$.summernote.lang` 전역도 없고, 초기화 전에 언어 팩을 로드해야 하는 요구사항도 없습니다. 로케일 객체를 prop으로 전달하면 되며, 누락된 키는 영어로 폴백됩니다. 로케일 모듈은 트리 셰이킹이 가능합니다.

```tsx
import { SummernoteEditor, locales } from '@eaeao/summernote-react';
<SummernoteEditor lang={locales['ko-KR']} />;
```

## 테마: 전역이 아니라 인스턴스별

레거시 summernote는 마지막 import가 승리하는 전역에서 UI를 결정했기 때문에 페이지마다 테마를 혼합하는 것은 지원되지 않았습니다. 여기서는 `theme` prop이 인스턴스별이므로, 서로 다른 테마를 가진 여러 에디터가 공존합니다. [테마](./reference-options.md#themes)를 참고하세요.

---

## 플러그인: `$.summernote.plugins`가 아니라 `definePlugin`

| 주제 | jQuery summernote | 이 포트 |
|---|---|---|
| **등록** | 전역 `$.extend($.summernote.plugins, { name: fn })`; 이름 충돌 시 코어 모듈을 전역적으로 덮어씁니다. | 인스턴스별 `plugins={[…]}` prop. 명령은 `core.registerCommand`를 통해 해당 에디터 안에서만 빌트인을 가립니다. |
| **로딩** | summernote 스크립트 뒤에 UMD `<script>`; 언어/리소스 파일은 플러그인 뒤에 로드해야 합니다. 순서가 중요합니다. | ES 모듈 `import`. 스크립트 순서, `<script>` 태그, 전역이 모두 없습니다. |
| **버튼 팩토리** | `context.memo('button.name', () => ui.button({ contents, tooltip, click }).render())` (jQuery DOM). | 이름으로 키가 지정된 `buttons`의 React `FC`; JSX를 렌더하고 `useChrome()`/`useCommand()`를 사용합니다. |
| **편집 디스패치** | `context.invoke('editor.bold')` / `context.invoke('code')`. | `useCommand()('bold')` 또는 `core.command('bold')`; 콘텐츠는 `core.getHTML()/setHTML()`, 또는 controlled `value`/`onChange` props로 다룹니다. |
| **다이얼로그** | `ui.dialog({ title, body, footer })` + `$.Deferred` + `onDialogShown/Hidden` + `note-`/Bootstrap 이중 클래스 HTML 문자열. | React 상태 + `Promise`로 export된 `Modal`(또는 직접 작성한 JSX)을 렌더합니다. `core.saveRange()/restoreRange()`로 선택을 저장/복원합니다. |
| **라이프사이클** | 플러그인 **로드** 시점(사용 시점이 아님)의 `this.initialize()`, 정리를 위한 `this.destroy()`. | React 라이프사이클 — 버튼은 React가 마운트/언마운트하고, 명령은 에디터가 마운트될 때 등록됩니다. 작성해야 할 `initialize`/`destroy` 훅이 없습니다. |
| **i18n** | `$.extend(true, $.summernote.lang, …)` 전역 deep-merge; `options.langInfo`로 읽습니다. | `lang` prop을 `resolveLang`가 en-US 위에 deep-merge; `useChrome().lang`으로 읽습니다. |
| **테마 감지** | `$.summernote.interface` → `'BS3' \| 'BS4' \| 'Lite'`. | 인스턴스별 `theme="lite\|bs3\|bs4\|bs5"` + 그에 맞는 CSS import; 여러 테마의 에디터가 공존합니다. |
| **편집 엔진** | jQuery 기반. | 구조적 Range 명령 — jQuery 없음, 런타임 의존성 0. |
| **컨테이너/`dialogsInBody`** | `options.dialogsInBody`가 다이얼로그의 부모를 선택; `this.options.id`로 고유 ID 부여. | React 포털/상태; 수동 컨테이너나 ID 관리가 없습니다. |

전체 `definePlugin` 계약은 [헤드리스 & 플러그인 API](./reference-api.md#plugins--defineplugin)를 참고하세요.

### jQuery 문서의 결함 중 여기에는 해당하지 않는 것들

jQuery 플러그인 페이지에는 여러 복사-붙여넣기 위험 요소가 있습니다(다이얼로그 할당 앞에서 `initialize`를 닫아버리는 불필요한 `}`, 정의되지 않은 `$editBtn`, `form-contro`나 `note-tabe-content` 같은 오타, 모든 탭이 `active`로 표시됨). 이 포트에는 이런 문제가 존재하지 않습니다 — HTML 문자열이 아니라 React 컴포넌트를 작성하므로, 마크업이 컴파일러에 의해 검사됩니다.

---

## 함께 보기

- [동작 원리](./concepts.md) — 이 매핑이 대응되는 아키텍처.
- [시작하기](./getting-started.md) — 설치와 첫 에디터, React 방식으로.
- [헤드리스 & 플러그인 API](./reference-api.md) — `definePlugin`, `useChrome`, `useCommand`.
