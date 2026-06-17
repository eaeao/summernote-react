# Summernote — 프로젝트 지침 (CLAUDE.md)

에이전트·개발자가 이 리포에서 공통으로 따르는 규약과 아키텍처 지도. 세션·사용자 단위 선호는 `~/.claude/` 메모리에 별도 보관한다.

## 프로젝트 개요

**Summernote** — "Super simple WYSIWYG editor". **순수 jQuery 기반** WYSIWYG 에디터 라이브러리다. (디렉토리명이 `summernote-react`지만 React 래퍼가 아니다 — 업스트림 vanilla summernote의 fork/clone이며, npm 패키지명은 `summernote`다. 디렉토리명에 속지 말 것.)

- npm 패키지: `summernote` v0.9.1, MIT 라이선스, `type: module` (ESM)
- 런타임 의존성: **jQuery 3.6.0 (peer, 번들에 포함 안 됨 — external)**
- 단일 JS 아키텍처에서 **4개 테마 번들**(`lite`, `bs3`, `bs4`, `bs5`)을 생성
- 소스의 버전 토큰은 `@@VERSION@@` ([src/js/summernote.js](src/js/summernote.js)) — 빌드 시 Vite 배너가 치환. 실제 semver는 [package.json](package.json)에만 있다.

## 기술 스택 & 빌드

- **빌드**: Vite 5 + Rollup → 테마별 IIFE 번들 + 소스맵. jQuery는 external 처리.
- **아이콘**: SVG(`src/font/icons/`) → `webfont`로 TTF/EOT/WOFF/WOFF2 + SCSS 맵 생성 (`prebuild` 훅)
- **스타일**: SCSS (공통 `src/styles/summernote/*` + 테마별 오버라이드), PostCSS/autoprefixer/cssnano
- **테스트**: Vitest 1.6 **브라우저 모드(Chrome headless, webdriverio + chromedriver)** — JSDOM 아님. range/selection/computed style을 실제 브라우저 semantic으로 검증.
- **품질 게이트**: ESLint(`@babel/eslint-parser`, `eslint:recommended` + `chai-friendly` 플러그인, 2-space indent·semi 강제·`comma-dangle: always-multiline`), Prettier(single quote, 120 width, `trailingComma: all`), CI는 Node 18.x/20.x 매트릭스 + CodeQL.
- **트랜스파일**: `@babel/preset-env`로 ES5 호환. `babel-plugin-module-resolver`로 `@` → `src/`.

### 명령어

> 패키지 매니저는 **Yarn** (node-modules linker, [.yarnrc.yml](.yarnrc.yml)).

> ⚠️ **v1.0(2026-06-18)에 레거시 jQuery 소스(`src/`·`public/`·`examples/`·레거시 빌드)를 전부 제거**했다. 프로젝트는 이제 `packages/`(core+react)의 순수 React+TS 모노레포다. 아래 일부 섹션은 **포팅의 출처가 된 레거시 아키텍처를 historical reference로** 기술한다(원본은 git 히스토리에 있음). 생성 산출물(46 로케일·icons.css·골든 코퍼스)은 커밋돼 있어 레거시 없이 자립한다.

| 명령 | 설명 |
|---|---|
| `yarn install` | 의존성 설치 |
| `yarn verify` | jQuery-ban + zero-dep 게이트 + 양 패키지 typecheck |
| `yarn build:packages` | core·react dual 빌드(ESM+CJS+.d.ts, tsup) |
| `yarn test` | Vitest 전체 (chromium+webkit) — ⚠️ 무겁다, [[test-resource-policy]] |
| `yarn test:watch` | Vitest watch |
| `node_modules/.bin/vitest run <spec> --project=chromium` | **개발 중 권장**: 단일 spec, chromium 단일 엔진, 실행 후 프로세스 정리 |
| `yarn lint:no-jquery` / `yarn check:deps` | CI 게이트 단독 실행 |
| `yarn changeset` / `version-packages` / `release` | changesets 릴리스 플로우 |

## 디렉토리 구조 (v1.0 — 단일 패키지 `@eaeao/summernote-react`)

```
src/
  index.ts             # 단일 패키지 배럴: React API + `export * from './engine'`(엔진 API)
  SummernoteEditor.tsx # controlled/uncontrolled + forwardRef imperative handle
  useSummernote.ts     # 헤드리스 훅 (uncontrolled editable + useSyncExternalStore)
  plugin.ts plugins/   # definePlugin + hello/specialchars/databasic
  toolbar/  chrome/     # 툴바 레지스트리 + 드롭다운·다이얼로그·팝오버·statusbar·codeview·air …
  styles/              # summernote-lite.css · icons.css(+fonts/) · themes/{bs3,bs4,bs5}.css
  engine/              # ★헤드리스 엔진(구 @summernote/core). chrome은 `@engine` alias로 import
    EditorCore.ts  options.ts  index.ts(엔진 배럴)
    core/      # 프레임워크 비종속 유틸 (dom·range·func·lists·env·key)
    editing/   # History·Style·Table·Typing·Bullet
    lang/      # en-US + locales/<46개>.ts + resolveLang
    media/video.ts  security/purify.ts
test/                  # 평탄화된 *.spec.{ts,tsx} + setup.ts·util.ts·golden/ (vitest browser)
scripts/               # check-no-jquery · check-no-runtime-deps (CI 게이트)
docs/                  # PORTING-PLAN · STATUS · CHROME-SPECS
```
- 빌드: `tsup`이 `@engine`(esbuild alias)을 **번들에 포함** → 단일 dist(ESM+CJS+dts). external은 react/react-dom뿐.
- `@engine` = `src/engine/index.ts` (tsconfig paths + vitest alias + tsup esbuild alias). chrome 코드는 엔진을 `@engine`으로 참조.

> 아래 아키텍처 섹션은 **포팅의 출처가 된 레거시 jQuery 설계를 historical reference로** 기술한다(현재 코드는 위 구조; 레거시 원본은 git 히스토리).

## 아키텍처: 부트스트랩 흐름

`$('.x').summernote(options)` 호출부터 렌더된 에디터까지:

1. **[summernote.js](src/js/summernote.js)** — `$.fn.summernote()`가 인자를 검사: 객체면 **초기화**, 문자열이면 **메서드 호출**. 초기화 시 사용자 옵션 + `$.summernote.options` 병합, langInfo/icons 해석 후 DOM 요소마다 `Context` 생성.
2. **[Context.js](src/js/Context.js)** — 중앙 허브. `$note`(원본)·`modules`·`memos`·`layoutInfo`·`options` 보유. `initialize()`가:
   - `ui.createLayout($note)`로 DOM 골격(toolbar/editingArea/editable/codable/statusbar) 생성
   - `_initialize()`로 커스텀 버튼을 memo 등록 → **모든 모듈을 먼저 인스턴스화한 뒤 일괄 initialize** → 원본 `$note` 숨기고 `$.data('summernote', context)` 저장
3. 사용자 인터랙션 → 툴바 버튼 클릭 등은 `context.invoke('module.method', ...)`로 라우팅.

### invoke 라우팅 ([Context.js](src/js/Context.js))

- `'module.method'` → `modules[module][method](...)`. 단, `shouldInitialize()` 통과한 모듈만.
- **접두사 없는 bare 메서드**: 먼저 **Context 자체 메서드**(`code`·`enable`·`disable`·`reset`·`destroy`·`isDisabled`·`triggerEvent`)를 확인하고, 없으면 **`editor` 모듈로 폴백**. → `$('.x').summernote('insertText','hi')`가 `editor.insertText`로 동작하는 이유. 이름 충돌 시 항상 Context가 우선.

### 이벤트 / 콜백 시스템

`context.triggerEvent(ns, ...args)`는 **두 경로로 동시 발화**한다:
1. `options.callbacks['on'+CamelCase(ns)]` 호출 — 예: `'change'` → `onChange`. **`this`는 `$note[0]`(raw DOM)** 에 바인딩 (jQuery 객체도 Context도 아님 — 주의).
2. `$note`에 jQuery 커스텀 이벤트 `summernote.<ns>` 발화.

→ 컨트리뷰터/사용자는 어느 쪽으로든 청취 가능. 모듈은 자신의 `events` 객체로 청취한다.

## 핵심 데이터 흐름: 콘텐츠 읽기/쓰기

에디터는 원본 `$note`를 **숨기고**, 별도 contentEditable `div`(`layoutInfo.editable`)에서 동작한다. `layoutInfo.codable`은 codeview용 `<textarea>`.

**`$('.x').summernote('code')` 가 콘텐츠를 다루는 유일한 공개 계약** ([Context.js](src/js/Context.js) `code()`):
- **인자 없이 호출(getter)**: 먼저 `codeview.sync()`로 flush → codeview 활성이면 `codable.val()`(raw textarea), 아니면 `editable.html()` 반환. ⚠️ codeview가 열려 있으면 editable HTML이 아니라 textarea 값을 반환하며, 둘은 다를 수 있다.
- **인자 있이 호출(setter)**: editable(또는 codeview)에 쓰고 **추가로 `$note.val(html)`로 원본 동기화** + `triggerEvent('change')` 발화.
- 원본이 `<textarea>`면 `AutoSync` 모듈이 `summernote.change`마다 editable→textarea를 독립적으로 미러링한다. → **textarea를 직접 `.val()`로 건드리면 clobber됨.** 폼 제출용 source of truth는 숨겨진 원본 요소.

## src/js/core — 코어 유틸 (에디터의 심장)

- **[dom.js](src/js/core/dom.js)** — 60+ predicate/유틸. ① 노드 분류(`isPara`/`isInline`/`isVoid`/`isList`/`isCell`…) ② **BoundaryPoint `{node, offset}` 기반 탐색**(`prevPoint`/`nextPoint`/`walkPoint`) ③ ancestor 순회(`ancestor`/`listAncestor`/`commonAncestor`) ④ **트리 분할**(`splitNode`/`splitTree`/`splitPoint` — 편집의 핵심) ⑤ edge/visibility 검사. `blankHTML`·`emptyPara`(`<p><br></p>`) 같은 빈-콘텐츠 표준값 보유.
- **[range.js](src/js/core/range.js)** — `WrappedRange` 클래스. W3C Range와 레거시 IE TextRange를 단일 인터페이스로 통합. `normalize()`(편집 전 커서를 편집 가능 지점으로 보정), `select`/`deleteContents`/`insertNode`/`pasteHTML`, **`bookmark`/`createFromBookmark`(offset path로 커서 직렬화 — History 스냅샷이 사용)**, `getWordRange` 등.
- **[func.js](src/js/core/func.js)** / **[lists.js](src/js/core/lists.js)** — 함수형 이디엄. predicate 팩토리(`eq`/`and`/`not`)·`uniqueId`·`debounce`·`rect2bnd` / 불변 배열 유틸(`head`/`tail`/`find`/`contains`/`clusterBy`/`unique`). 코드 곳곳이 `dom.ancestor(node, func.and(dom.isPara, dom.isInline))`처럼 predicate를 합성해 사용.
- **[env.js](src/js/core/env.js)** — 브라우저 감지 플래그(`isMac`/`isMSIE`/`isSupportTouch`/`inputEventName`/`isFontInstalled`). **[key.js](src/js/core/key.js)** — keyCode 맵 + `isEdit`/`isMove`/`isNavigation`. **[async.js](src/js/core/async.js)** — `readFileAsDataURL`/`createImage`(jQuery Deferred).

> 작업 원칙: 노드 탐색은 sibling/child가 아니라 **point 기반(`nextPoint`/`prevPoint`)** 을 우선. DOM 변경 전엔 **`range.normalize()`** 로 커서 안전성 확보(단 비용이 크므로 루프 안 반복 금지).

## 편집 엔진 (src/js/editing + Editor)

[Editor.js](src/js/module/Editor.js)가 `History`·`Style`·`Typing`·`Table`·`Bullet`을 인스턴스화하고 명령을 디스패치한다.

**명령 라이프사이클**: 모든 상태 변경은 `beforeCommand()` → 동작 → `afterCommand()`로 감싼다.
- `beforeCommand()`: `'before.command'` 발화 + `execCommand('styleWithCSS')`.
- `afterCommand()`: `history.recordUndo()` + DOM normalize + `'change'` 발화.
- `wrapCommand(fn)`이 자동 래핑. 단 native execCommand 명령(bold/italic/justify… — Editor 생성자에서 루프로 생성)은 before/after를 직접 호출(wrapCommand 안 거침).

- **[History.js](src/js/editing/History.js)** — 스택 기반 undo/redo. 스냅샷 = `editable.html()` + `range.bookmark()`(offset path). `recordUndo()`는 `stackOffset`을 올리고 forward 히스토리를 truncate → **undo 후 새 편집은 redo 스택을 지운다.** `historyLimit`(기본 200) 적용.
- **[Style.js](src/js/editing/Style.js)** — range에 CSS 적용 / 현재 포맷 조회. `current()`는 `queryCommandState()` 사용(Firefox에서 throw → try/catch).
- **[Table.js](src/js/editing/Table.js)** — virtual cell 매핑(`TableResultAction`)으로 colspan/rowspan 안전하게 add/delete row·col, tab 네비게이션.
- **[Typing.js](src/js/editing/Typing.js)** — Enter 처리(`insertParagraph`): 선택 삭제 → inline을 para로 wrap → `dom.splitTree()`로 분할. blockquote 탈출은 `blockquoteBreakingLevel`(0/1/2).
- **[Bullet.js](src/js/editing/Bullet.js)** — 리스트 토글·indent/outdent (`dom.splitTree`·`lists.clusterBy`).

## 모듈 시스템 (src/js/module)

[settings.js](src/js/settings.js)의 `options.modules`에 **기본 22종** 등록: `editor, clipboard, dropzone, codeview, statusbar, fullscreen, handle, hintPopover, autoLink, autoSync, autoReplace, placeholder, buttons, toolbar, linkDialog, linkPopover, imageDialog, imagePopover, tablePopover, videoDialog, helpDialog, airPopover`. (⚠️ `hintPopover`는 `autoLink`보다 **먼저** 등록 — Enter 시 hint popover의 range 에러를 피하기 위한 의도적 순서.)

**모듈 계약** (모든 모듈은 default-export ES6 class):
```
constructor(context)   // layoutInfo·options·invoke·memo·triggerEvent·isDisabled 접근
shouldInitialize()     // (선택) false면 initialize/destroy 스킵. 예: airMode면 Toolbar는 false
initialize()           // 전 모듈 생성 후 일괄 호출. DOM 셋업·이벤트 바인딩
destroy()              // 역순으로 호출. 리스너·DOM 정리
events = { 'summernote.change summernote.keyup': (we, e) => {...} }  // (선택) 자동 구독
```

**그룹**: ① Editor(명령 게이트키퍼) ② Toolbar·Buttons(UI 빌드) ③ 다이얼로그(Image/Link/Video/Help — `editor.saveRange()`/`restoreRange()`로 선택 보존, jQuery Deferred) ④ 팝오버(Link/Image/Table/Air/Hint — 에디터 이벤트에 반응해 표시/위치) ⑤ 동작(Clipboard/Dropzone/Fullscreen/Codeview/AutoLink/AutoReplace/AutoSync/Placeholder/Handle/Statusbar).

**핵심 규칙**: 모듈끼리 직접 호출 금지 — 항상 `context.invoke()`를 통해 통신하며, 편집 명령은 전부 Editor를 게이트로 흐른다. 다이얼로그는 열기 전 반드시 `saveRange()`(포커스가 입력으로 이동하며 선택이 사라지므로). editable 수정 전 `codeview.isActivated()` 확인.

## UI 추상화 레이어 (테마)

각 테마 진입점(`src/styles/{theme}/summernote-{theme}.js`)은 동일한 **`ui_template` 팩토리**를 export하고, 모듈 로드 시 `$.summernote.ui_template` + `$.summernote.interface`를 등록한다. `Context` 생성 시 `$.summernote.ui = $.summernote.ui_template(options)`로 인스턴스화 → `createLayout()`이 [renderer.js](src/js/renderer.js)로 DOM 조립.

- `ui_template`은 25+ 메서드(editor·toolbar·button·dropdown·dialog·popover·icon·createLayout…)를 동일 인터페이스로 제공.
- **bs3/4/5**는 Bootstrap JS 플러그인(`$.modal`·`$.tooltip`)·마크업에 의존, **lite**는 [DropdownUI](src/styles/lite/js/DropdownUI.js)·[ModalUI](src/styles/lite/js/ModalUI.js)·[TooltipUI](src/styles/lite/js/TooltipUI.js)로 standalone 구현.
- 모든 클래스는 `.note-*` 접두사. 아이콘은 공통 `summernote/font.scss`의 `.note-icon-*::before`.
- **새 테마 추가**: `src/styles/<theme>/summernote-<theme>.js`에 25+ 메서드 ui 팩토리 + `<theme>.scss` 작성, `renderer.create()`로 컴포넌트 정의, 끝에 `$.summernote.ui_template`/`interface` 등록.

## 옵션 API surface

**[src/js/settings.js](src/js/settings.js)가 모든 기본 옵션의 SSOT.** 새 옵션은 여기 추가한다. 주요 카테고리:
- 레이아웃: `width`·`height`·`minHeight`·`maxHeight`·`focus`·`container`·`dialogsInBody`·`dialogsFade`·`airMode`
- 툴바/팝오버: `toolbar`·`popover.{image,link,table,air}` — **`[그룹명, [버튼명...]]` 튜플 배열** 포맷. 버튼명은 `'button.{name}'` memo 팩토리를 참조. 커스텀 버튼은 `options.buttons`(name→factory)로 추가.
- 포맷: `styleTags`(p/blockquote/pre/h1-h6)·`fontNames`·`fontNamesIgnoreCheck`·`fontSizes`·`fontSizeUnits`(px/pt)·`colors`(8×8)·`lineHeights`
- 동작: `blockquoteBreakingLevel`·`tabDisable`·`tabSize`·`shortcuts`·`textareaAutoSync`·`tooltip`('auto')·`spellCheck`·`placeholder`·`historyLimit`(200)·`recordEveryKeystroke`·`maxTextLength`
- 이미지: `maximumImageFileSize`·`acceptImageFileTypes`·`allowClipboardImagePasting`
- 링크: `linkTargetBlank`·`linkAddNoReferrer`·`addLinkNoOpener`
- 툴바 고정: `followingToolbar`·`toolbarPosition`·`otherStaticBar`
- **codeview 보안(보안 민감 — 신뢰불가 HTML 처리 시 준수)**: `codeviewFilter`(+`codeviewFilterRegex` — script/style/iframe 등 제거)·`codeviewIframeFilter`(+`codeviewIframeWhitelistSrc`)

> ⚠️ **옵션 병합은 top-level이 shallow** ([summernote.js](src/js/summernote.js) `$.extend({}, defaults, userOptions)` — `true` 없음). **`langInfo`와 `icons`만 deep merge.** 따라서 `callbacks`·`codemirror`·`keyMap`·`popover`를 **부분만** 넘기면 기본 객체 전체가 통째로 교체된다.

## 공개 API (문자열 인자 호출)

`$('.x').summernote('method', ...args)` — 초기화 이후에만 동작(`$note.data('summernote')` 존재 시). Context 레벨: `code([html])`·`isDisabled()`·`enable()`·`disable()`·`reset()`·`destroy()`·`triggerEvent()`. 그 외 bare 메서드는 `editor.*`로 폴백(`insertText`·`insertImage`·`createLink`·`undo`·`focus` 등). `reset()`은 disabled 상태 유지 + 내용을 `emptyPara`로 + 전체 모듈 재구성(destroy ≠ reset).

### 콜백 카탈로그 ([settings.js](src/js/settings.js))

`onBeforeCommand, onBlur, onBlurCodeview, onChange, onChangeCodeview, onDialogShown, onEnter, onFocus, onImageLinkInsert, onImageUpload, onImageUploadError, onInit, onKeydown, onKeyup, onMousedown, onMouseup, onPaste, onScroll`. (각각 jQuery `summernote.<event>`로도 발화.)

### 키맵 / 단축키

[settings.js](src/js/settings.js)에 pc/mac 분리 맵. 예: `ENTER→insertParagraph`, `CTRL/⌘+Z→undo`, `CTRL/⌘+K→linkDialog.show`, `CTRL+1..6→formatH1..6`, `CTRL+ENTER→insertHorizontalRule`, `TAB→tab`, `SHIFT+TAB→untab`. `options.shortcuts:false`로 전체 비활성.

## 플러그인 & i18n

- **플러그인**: UMD 래퍼 + `$.extend($.summernote.plugins, { name: function(context){...} })`. 생성자에서 `context.memo('button.name', () => ui.button({...}).render())`로 버튼 등록, `context.createInvokeHandler('editor.method')`로 클릭 핸들러 연결, `initialize`/`destroy`/`events`(`summernote.*`) 구현. 예: [public/plugin/hello](public/plugin/hello/summernote-ext-hello.js)(기본), [specialchars](public/plugin/specialchars/summernote-ext-specialchars.js)(다이얼로그), [databasic](public/plugin/databasic/summernote-ext-databasic.js)(plugins+options+lang 일괄). ⚠️ 코어 모듈명과 충돌하면 코어를 덮어쓴다.
- **i18n**: `$.extend(true, $.summernote.lang, { 'xx-XX': {...} })`로 deep merge. 언어팩은 [public/lang/summernote-<locale>.js](public/lang/), 기능별(font/image/link/table/style/help…) 계층. `lang` 옵션은 로드된 키와 정확히 일치해야 하며(부분 매칭 없음, fallback은 en-US), **에디터 초기화 전에 로드**해야 한다.

## 테스트 작성 규약

- spec은 `*.spec.js`, `test/base/`가 `src/` 구조를 미러링.
- `beforeEach`에서 **`$('body').empty()` 후** Context 생성(순서 중요).
- `import { describe, it, expect, beforeEach, vi } from 'vitest'`. 커스텀 매처 `.to.equalsIgnoreCase(html)`(IE quirk 보정)·`.to.equalsStyle($node, expected, 'prop')`(computed CSS) — [test/vitest.setup.js](test/vitest.setup.js) 로드 후에만 사용 가능.
- contentEditable 변경 대기는 `test/util.js`의 `nextTick()` + async/await.
- 실제 Chrome에서 실행 → Node 전역 동작 가정 금지. range 생성 불가 시나리오는 `this.skip()`.

## 주요 함정 (gotchas)

- **jQuery는 external** — 번들에 없음. 소비자가 CDN/번들러로 별도 주입. 중복 주입 시 초기화 충돌.
- **`$.summernote.ui`는 전역** — Context 생성마다 덮어쓴다. 한 페이지에 **테마가 다른 다중 에디터는 사실상 미지원**(각 Context는 `this.ui`를 캐시하지만 전역은 마지막 테마가 승리).
- **top-level 옵션 shallow merge** — 위 옵션 섹션 경고 참조.
- **`triggerEvent` 콜백의 `this`는 raw DOM(`$note[0]`)** — jQuery/Context 아님.
- **테마 선택은 import 시점 고정** — 런타임 전환 옵션 없음. 마지막 import 테마가 승리.
- bs3/4/5는 Bootstrap JS 없으면 modal/tooltip이 조용히 실패. lite는 standalone.
- `code()` getter는 `codeview.sync()` 부수효과가 있고, codeview 열림 상태에선 editable HTML이 아닌 textarea 값을 반환.

---

## 작업 규약 (ONYOAI CLAUDE.md에서 이식)

### 언어 정책

- **커밋 메시지·코드 주석·식별자는 영어** — 업스트림 summernote OSS와 일치(기여 가능하게 유지). 2026-06-17 결정.
- **이 CLAUDE.md 본문과 사용자와의 대화는 한국어.**

### 코드 스타일

- **주석 최소화**: 식별자로 의도가 드러나면 생략. `Why`가 비자명할 때만 한 줄.
- **불필요한 추상화·미리-일반화 금지**: 유사 코드 3회 반복이 조기 공통화보다 낫다.
- **에러 핸들링**: 불가능 경로 방어 코드 지양. 시스템 경계(사용자 입력·외부 API·브라우저 quirk)에서만 검증 — 단 이 코드베이스는 브라우저 호환(IE TextRange, Firefox `queryCommandState`)을 위한 방어가 정당한 경계임에 유의.
- **기능 플래그·backward shim 지양**: 코드 흐름을 바로 바꿀 수 있으면 바꾼다.

### Git·커밋 컨벤션

- 형식: `<type>(<scope>): <subject>` (conventional commits, 영어, 마침표 없이 현재 시제). type: `feat`·`fix`·`docs`·`style`·`refactor`·`perf`·`test`·`chore`·`ci`·`build`·`revert`. scope 예: `editor`·`table`·`toolbar`·`range`·`build`·`lang`.
- **`Co-Authored-By: Claude` 등 AI co-author 트레일러 금지.**
- **스스로 `git push` 금지** (사용자가 직접 push).
- `--amend` 기본 금지(사용자 명시 지시만), `--no-verify` 등 hook 우회 금지, `git add -A`/`git add .` 지양(파일 경로 명시).
- 커밋 제외: 비밀 자원, `node_modules`·`dist` 등 빌드 산출물.
- **트랙(작업 단위) 하나가 끝날 때마다 커밋한다** (사용자 지시 2026-06-17).

### 에이전트(Claude Code 등)에게

- 긴 작업은 `TodoWrite`로 진행 추적. 독립 작업은 단일 메시지 병렬 tool call.
- 코드 읽기·검색은 Read/Grep/Glob 직접 사용 — Bash로 `cat`/`find`/`grep` 금지.
- 대규모 탐색은 `Agent`(Explore)에 위임해 메인 컨텍스트 보호.
- 세션 정책은 이 문서, 사용자 선호는 `~/.claude/` 메모리에 분리.
