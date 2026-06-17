# Summernote → React + TypeScript 포팅 계획서

> jQuery 기반 vanilla summernote(현 코드베이스, 루트 `CLAUDE.md` 참조)를 **외부 의존 0의 자체 엔진으로 React + TypeScript 화("react화")**하는 체계적 계획. summernote가 이미 원하는 동작을 잘 하므로 **엔진을 재발명하지 않고 보존·이식**한다. 13개 설계 에이전트(엔진-이식 3제안 + 심사 + 서브시스템 8 + 로드맵)의 종합.

## 0. 확정 제약 (사용자 결정, 2026-06-17)

| 축 | 결정 |
|---|---|
| 편집 코어 | **summernote 자체 엔진을 strict TS로 충실 이식**(contentEditable + 자체 `dom`/`range`/`editing` 로직). **외부 라이브러리 0** — ProseMirror/Lexical/Tiptap/Slate 일절 안 씀 |
| 이식 방식 | **Lens C — 전면 TS 재구조화**(유지보수성). stringly `invoke()` → 타입드 command map + EventBus; `updateCurrentStyle` DOM-spray → 파생 `EditorState`를 `useSyncExternalStore`로 발행 |
| execCommand | **v1에서 완전 제거** — 전부 자체 Range 기반 명령(자체 엔진 취지 최대) |
| jQuery | **완전 제거** (네이티브 DOM/이벤트/Promise/spread) — 현재 유일한 런타임 의존 |
| 언어 | **TypeScript strict** |
| 공개 API | 프레임워크 비종속 헤드리스 코어 + `useSummernote()` 훅 + controlled `<SummernoteEditor value onChange options theme>` |
| React 경계 | React는 chrome만. editable contentEditable은 엔진이 imperative 소유(**uncontrolled ref, React children 0**) — React-vs-contentEditable 충돌 구조적 종결 |
| v1 범위 | **완전 패리티** — 4테마(lite/bs3/bs4/bs5) + 22모듈 전 기능 + 플러그인 + i18n 50+ 로케일 |

> 이전 ProseMirror 기반 초판은 **폐기**(외부 의존 사용 — 본 방향과 배치).

## 1. 핵심 아키텍처 — Lens C 타입드 코어 + 자체 명령 엔진

**구조**: `EditorCore`(헤드리스 TS) ↔ EventBus ↔ React chrome. 엔진은 검증된 알고리즘을 **1:1로 이식**(I/O만 타입드 재구조화)하고, `Editor.js`의 stringly `this[cmd]` + `Context.invoke('module.method')` 라우터를 **타입드 Command 레지스트리 + EventBus**로 교체. 툴바 상태는 `Buttons.updateCurrentStyle`의 DOM-spray 폴링 대신, 엔진이 계산한 불변 `EditorState`를 `useSyncExternalStore`로 발행해 chrome만 reactive 재렌더.

### 패러다임 전환 요약
| 현재 | 포팅 후 |
|---|---|
| `Editor.js` `this[cmd]` 동적 부착 + `Context.invoke('module.method')` (오타 시 조용히 no-op) | **타입드 `Command<A> = (core, arg)=>void` 레지스트리** |
| `Buttons.updateCurrentStyle` 셀렉터 DOM-spray 폴링 | **불변 `EditorState` 파생 → `useSyncExternalStore`** (active props) |
| `document.execCommand` + `queryCommandState`(Firefox try/catch) | **자체 Range 명령** + **구조적 상태 검출**(try/catch 제거) |
| 전역 `$.summernote.ui`(last-theme-wins) | **per-instance theme context** |
| jQuery 전반 | 네이티브 DOM/이벤트/Promise (0 의존) |
| React가 editable 내부 렌더 (커서 전쟁) | **uncontrolled editable ref, React children 0** (엔진만 씀) |

### 보존(1:1 이식)되는 검증 자산
`core/dom.ts`·`core/range.ts`(`WrappedRange` 클래스, `sc/so/ec/eo` 필드명·`normalize()`·`splitText`·`bookmark`/`createFromBookmark` 그대로; **battle-patch 보존**: `rect2bnd` null guard(ac5460e0), `setEnd` fix(9a9e01d3)), `editing/Style`(styleNodes/stylePara), `editing/Table`(TableResultAction virtual-cell 매핑), `editing/Typing`(insertParagraph→splitTree, blockquoteBreakingLevel 0/1/2), `editing/Bullet`(marginLeft ±25), `editing/History`(innerHTML+bookmark 스냅샷, stackOffset truncation, historyLimit). IE TextRange 분기는 **삭제 대신 `env.isW3CRangeSupport` 뒤로 격리**(가역적; 테스트로 dead 증명 후 정리).

## 2. execCommand 제거 — 자체 명령 엔진 (v1 핵심 리스크, 정면 관리)

> ⚠️ 심사가 소스 검증으로 경고: 부분/중첩/혼합 선택에 대한 `toggleInline`/`removeFormat`을 손으로 재구현하는 것은 **포팅 전체에서 단일 최대 회귀 리스크**다. (Lens B의 "color/foreColor/unlink는 이미 자체 구현, execCommand 삭제만 하면 됨"은 **거짓** — `Editor.js:269-270,279`의 color/foreColor, `:909`의 unlink는 실제 execCommand라 순수 신규 작업.)

**자체 명령 매핑** (Lens B 레시피를 v1에 채택):
| execCommand 호출부 | 자체 Range 구현 |
|---|---|
| bold/italic/underline/strike/sub/sup (인라인 토글) | `Style.styleNodes` + `splitTree` 기반 `toggleInline` |
| justifyLeft/Center/Right/Full | `Style.stylePara`(이미 자체) |
| backColor/foreColor(color) | `fontStyling` 패턴(span style) 확장 |
| formatBlock(h1-6/p/pre/blockquote) | `Style.stylePara`/블록 교체(이미 대부분 자체) |
| removeFormat | 선택 범위 마크 unwrap 핸드롤 |
| unlink | `dom.unwrap` |
| `queryCommandState`/`queryCommandValue`(툴바 상태) | **구조적 검출**(ancestor 타입 + `getComputedStyle`) → Firefox try/catch 제거(결정성↑) |

**리스크 관리 전략 (계획의 중심축)**:
1. **골든 코퍼스 우선**(Phase 0): 레거시 빌드를 기존 spec + 인라인-토글/부분-중첩-혼합 선택 엣지케이스로 돌려 출력을 `test/golden/*.json`(불변 oracle)로 동결 — **자체 명령 작성 전에**.
2. **결정적 마크업 재기준선**: execCommand 출력은 본래 **브라우저마다 비결정적**(`<b>` vs `<strong>` vs `<span>`)이라 바이트 일치가 불가능·무의미. 자체 명령은 **결정적 마크업**을 내므로, 인라인-포맷 골든은 **동작/구조 동등성 + 결정적 마크업**으로 재기준선(의도적 품질 개선으로 release-note 명시). 구조적 비교(`equalsIgnoreCase`/structural normalize)로 게이트.
3. **명령별 점진 + 게이트**: 각 자체 명령은 실 Chrome Vitest로 골든 대조 통과 후 머지. 단일 Command 레이어를 거치므로 contained change.

## 3. React 경계 + 상태 브리지

- `<SummernoteEditor>`는 chrome React 트리 + **단 하나의 leaf** `<div className="note-editable" contentEditable suppressContentEditableWarning ref={editableRef}>`(React children 0). 마운트(`useLayoutEffect`, StrictMode 멱등)에서 `createEditorCore(ref, options)`가 `Editor.initialize` 등가 실행(editable seed, 네이티브 keydown/keyup/input/paste/composition 바인딩 — `inputEventName` 디바운스 + `isLimited(0)`+snapshot 조합 가드를 네이티브 composition 이벤트로 이식, first undo). 이후 엔진이 editable을 imperative하게 변경 — **React reconciler는 구조적으로 배제**(커서 전쟁 종결).
- **상태 브리지**: 엔진이 keyup/mouseup/input/change + codeview/fullscreen/disable 전환마다 타입드 불변 `EditorState`(`{marks, fontName, fontSize, lineHeight, listStyle, paraAlign, isOnAnchor, anchorHref, isOnCell, isDisabled, isCodeview, isFullscreen, canUndo, canRedo}`) 계산 → EventBus 발행. chrome은 `useSyncExternalStore(bus.subscribe, core.getState)`로 소비(`active={state.marks.bold}`). 재렌더는 **chrome 트리만** 건드림(editable host엔 React children 0이라 contentEditable selection 불변). 구조적 동등성 bail로 thrash 방지.
- 다이얼로그는 이식된 `saveRange()`/`restoreRange()`(React `<input>` 포커스 시 editable selection 소실 — 현 계약 동일).

## 4. jQuery 제거 (bottom-up, 레이어별 test-green)

| 레이어 | 교체 |
|---|---|
| L0 func/lists | 이미 순수 — `$` import만 제거 |
| L1 dom/range | `$(n).css` 읽기→`getComputedStyle`(단일 `readStyle()` seam), `dom.html`→`innerHTML`, `$.each`→`forEach`, `$note.trigger`→`dispatchEvent`, `WrappedRange`가 네이티브 Range 래핑 |
| L2 editing/* | `$(para).css(obj)`→`Object.assign(el.style)`, `$(node).data('target')`→per-core `WeakMap` |
| L3 Editor | shallow merge는 object spread; **deepMerge는 langInfo+icons에만**(검증된 shallow-top-level 계약); `$.now`→`Date.now`; `readFileAsDataURL`/`createImage` Deferred→Promise(`.fail`→`.catch`) |
| L4 Context→EditorCore | `triggerEvent` dual-fire 유지(콜백을 editable 요소에 바인딩 + CustomEvent — `Context.js:138-147`); `$.data('summernote')`→instance map |
| L5 modules/UI | dialog Deferred→Promise; lang deep-merge→object registry |

**행동 민감 watch-item**: `getComputedStyle` vs jQuery `.css()` 정규화 차이(color `rgb()`, 단위, shorthand)가 `Style.fromNode/current` 툴바 상태에 영향 → 변환 전후 `equalsStyle` 매처로 코퍼스 선택셋 대조. **강제**: 신규 패키지 `jquery` import 0 — ESLint `no-restricted-imports`/`no-restricted-syntax($)` + CI grep 게이트(1일차부터).

## 5. 모듈 분리 (22개)

타입드 `EditorCore` 오케스트레이터(command map + EventBus) 유지. `CORE_MODULE_ORDER`로 **hintPopover-before-autoLink 순서 보존**(Enter-in-hint range 에러 회귀 방지).

- **ENGINE-LOGIC (헤드리스 코어 잔류, TS 서비스)**: editor, clipboard, dropzone, **codeview**(purify/codeviewFilter/codeviewIframeFilter — **보안 크리티컬, 코어에만 verbatim 이식, chrome로 가면 XSS 홀**), autoLink, autoReplace, autoSync, placeholder(상태), handle 지오메트리, statusbar resize 수학, history, followingToolbar.
- **REACT-CHROME (테마별 React 컴포넌트, command 디스패치 + EditorState 구독)**: toolbar, buttons, 전 다이얼로그(link/image/video/help), 전 팝오버(link/image/table/air), statusbar UI, fullscreen UI, placeholder 표시. `ui_template`/`renderer`의 25-메서드 팩토리 → 테마별 React 컴포넌트셋(`.note-*` 클래스/SCSS 재사용). per-instance theme로 전역 `$.summernote.ui` 깨짐 해결.

## 6. 모노레포 / 패키지 구조

> Yarn workspaces(node-modules linker, Node≥17), TS project references. 빌드/테스트 툴(Vite/Vitest)만 dev 의존 — **출하 패키지의 제3자 editor/runtime 의존 0**(react/react-dom는 peer).

```
packages/
  core/      @summernote/core — 헤드리스, React-free, 런타임 의존 0.
             src/core/{types,env,func,lists,dom,range,async,EventBus,commandRegistry}.ts
             src/editing/{Style,Typing,Bullet,Table,History}.ts
             src/EditorCore.ts + src/commands/(자체 Range 명령: inline/style/block/list/table/link/media/structure)
             src/services/{clipboard,dropzone,codeview,autoLink,autoReplace,autoSync,hint,handle,statusbar,followingToolbar}.ts
             src/state/{EditorState,instanceRegistry}.ts, src/plugin/{types,registry}.ts, src/options.ts
  react/     @summernote/react — peerDeps react/react-dom≥18 ONLY; dep @summernote/core.
             useSummernote.ts, SummernoteEditor.tsx, ThemeContext.tsx, state/useEditorState.ts, ssr.ts
  themes-{lite,bs3,bs4,bs5}/  React chrome 컴포넌트셋 + per-theme SCSS. ThemeSpec(class 문자열=데이터);
             Bootstrap JS 없음(lite의 Dropdown/Modal/Tooltip 동작을 보편 구현으로 이식). .note-* 계약 그대로.
  styles-common/  공유 scss(common/elements)
  icons/     @summernote/icons — build-fonts.js 재사용 → TTF/EOT/WOFF/WOFF2 + font.css
  i18n/      @summernote/i18n — en-US.ts as const(LangCatalog SSOT) + locales/<code>.ts(50+, DeepPartial) +
             resolveLang(deepMerge base+override, exact-key fallback) + per-locale subpath exports
  plugin-{hello,specialchars,databasic}/  typed definePlugin (no jQuery/UMD)
  standalone/  UMD/IIFE drop-in(core+react+lite+icons+en-US, react/react-dom globals) + min/non-min + zip
root: tsconfig.base.json, vitest.config.ts(browser mode, src 별칭), .changeset/, scripts/(build-all.ts,
      check-no-jquery.sh, vitePostCSSSourceMap.mjs), eslint.config.editor.mjs(jquery ban)
모든 editor 패키지: ESM+CJS+.d.ts, exports map(types/import/require + ./style.css), sideEffects 정확.
```

## 7. 단계별 로드맵 (execCommand 제거 반영)

| Phase | 제목 | 목표 | 종료 기준(요약) | 의존 |
|:--:|---|---|---|:--:|
| **0** | 모노레포 골격 + 테스트 하네스 + **골든 코퍼스 동결** | 워크스페이스·패리티 인프라 먼저. 레거시 동작(인라인-토글/부분-중첩-혼합 선택 포함)을 **엔진 손대기 전** 불변 oracle로 동결 | `yarn build`가 core/react ESM+CJS+dts 산출; `yarn test` 실 Chrome green; `test/golden/*.json` 동결 + freeze-guard; CI no-jquery/zero-dep 게이트; jQuery-free 매처 | none |
| **1** | **thin 수직 슬라이스** — jQuery-free 엔진 spine + uncontrolled React 경계 + IME (3대 리스크 front-load) | 최소 기능으로 아키텍처 end-to-end 증명: dom/range 1:1 이식, EditorCore가 insertText(wrapped) + 저위험 자체 명령 1개 실행, uncontrolled-ref React 컴포넌트 마운트, IME 처리 | 한글 IME가 undo/caret 미손상; 강제 chrome 재렌더에도 editable 서브트리 node-identical; controlled value no-clobber; `dom.spec`/`range.spec` 그대로 이식 green | 0 |
| **2** | **전체 엔진 포팅 + 자체 명령 레이어(execCommand 제거)** | editing/* 1:1 + 전체 타입드 Command 레지스트리를 **자체 Range 구현으로**(인라인 토글/justify/color/unlink/removeFormat). `queryCommandState`→구조적 검출. 헤드리스 서비스 이식. **프로젝트의 심장이자 최대 리스크** | PORT-DIRECTLY spec(core/* + editing/style·Typing·Table) green; 코퍼스-diff: **구조적 명령은 zero-diff, 인라인-포맷은 재기준선 결정적 마크업으로 통과**; codeview XSS 게이트 필수 green; core 런타임 의존 0, tsc strict | 1 |
| **3** | React 경계 + lite 테마 chrome (첫 풀기능 단일 테마) | 완전한 lite React 에디터: 전 chrome을 헤드리스 코어에 연결. controlled/uncontrolled 계약, imperative handle, per-instance theme, en-US i18n, 플러그인 API + hello 레퍼런스 | lite가 레거시 lite와 기능 패리티; 툴바 active-state가 EditorState로 일치; 다이얼로그 caret 보존; lite `.note-*` DOM 스냅샷 일치; controlled 루프 no-clobber | 2 |
| **4** | 나머지 3테마(bs3/bs4/bs5) + 전체 i18n + 플러그인 + 교차테마 시각 게이트 | 완전 v1 패리티 범위. 테마=데이터(ThemeSpec class 문자열)라 컴포넌트 재작성 없음 | 다른 테마 2 에디터 공존(last-theme-wins 해결); 50+ 로케일 byte-identical + tree-shake; specialchars/databasic 이식; Tier-4 시각 게이트(class 존재 + computed-style 동등) 4테마 green | 3 |
| **5** | 패키징·배포·릴리스 엔지니어링 + 마이그레이션 문서 | 그래뉼러 패키지 그래프(icons/themes-css/standalone UMD), Changesets, exports maps, breaking-change 노트 | 전 패키지 publish-dry-run clean(exports/types/sideEffects); 제3자 editor/runtime 의존 0(CI 검증); v1.0 수락 게이트 green; release notes + 마이그레이션 가이드 | 4 |

### 마일스톤 게이트
- **v0.1 (Phase 1)**: jQuery-free dom/range 이식(`dom.spec`/`range.spec` green); uncontrolled-ref `<SummernoteEditor>`가 마운트해 자체 명령 + before/afterCommand + History 실행; IME 정확; reconciler-exclusion/StrictMode/no-clobber 회귀 green. **3대 리스크 소진, 실제 동작.**
- **v0.5 (Phase 3)**: `@summernote/core` 풀 헤드리스 패리티(PORT-DIRECTLY spec green; 코퍼스-diff 게이트 통과; codeview XSS green; 의존 0). 완전 lite React 에디터(전 툴바/드롭다운/다이얼로그/팝오버/statusbar/handle/fullscreen/placeholder + 계약 + per-instance theme + en-US + 플러그인 + hello). **레거시 lite 대체 가능.**
- **v1.0 (Phase 5)**: 4테마 + air mode, 22모듈 전 기능, 플러그인(hello/specialchars/databasic), 50+ 로케일 tree-shakeable. 수락 게이트(Tier 1-4 + 교차테마 시각) green. 그래뉼러 패키지 배포. **제3자 editor/runtime 의존 0, execCommand 0, jQuery 0.**

## 8. 의존성 / 순서 제약
- **임계경로**: 0(하네스+동결 코퍼스) → 1(thin slice/리스크 소진) → 2(전체 엔진+자체 명령) → 3(lite chrome) → 4(3테마+i18n+플러그인+시각) → 5(패키징). 각 단계는 이전 종료 기준으로 게이트, big-bang 없음.
- **골든 코퍼스는 Phase 0에 레거시에서 먼저 기록** — 포팅에서 재생성하면 회귀 세탁(freeze-guard 강제). **엔진 보존의 이점**: 순수-엔진 레거시 spec 6종(core/{dom,range,func,lists,key} + editing/{style,Typing,Table})은 **그대로 이식**(it() 제목·기대 HTML 리터럴 유지, 하네스 I/O만 교체) → Phase 1-2의 verbatim 이식을 거의 무비용으로 게이트. 8종 Context/module spec은 1:1 이식 불가 → 골든 코퍼스 추출원 + Tier-2/3 재작성.
- **EventBus + EditorState + EditorCore 스캐폴딩(Phase 1/2)이 chrome(Phase 3+) 전에 착지** — React는 구독만, editable에 절대 안 씀. `CORE_MODULE_ORDER`(hintPopover < autoLink)를 Phase 2에 ordered dispatch로 인코딩.
- **테마=데이터**: Phase 3이 lite ThemeSpec로 보편 컴포넌트 구축, Phase 4는 ThemeSpec 3개만 추가(컴포넌트 재작성 없음) → Phase 4 bounded.

## 9. 리스크 레지스터 (자체 명령 제거 반영)

| 리스크 | 영향/확률 | 완화 |
|---|---|---|
| **자체 인라인-포맷 명령(toggleInline/removeFormat over 부분/중첩/혼합 선택)이 execCommand 동작을 재현 못 함 → 마크업 드리프트** | **高/高** | 골든 코퍼스 우선 동결 → 결정적 마크업으로 재기준선(구조적 동등 게이트); 명령별 점진 + 실 Chrome 대조; 부분/중첩/혼합 선택 엣지케이스 코퍼스 망라 |
| `range.normalize()`(6 visible-point + reverse) 재배열 → caret 오배치(단일 최대 함수 회귀면) | 高/中 | byte-1:1 이식, cleanup 금지; 전용 test anchor; `range.spec` green; 선택 민감 시나리오 코퍼스-diff |
| `getComputedStyle`가 jQuery `.css()`와 정규화 다름(color rgb()/단위/shorthand) → 툴바 active-state | 中/高 | 단일 `readStyle()` seam; 각 변환 전후 `equalsStyle`로 코퍼스 선택셋 대조; `node.style.fontSize` override 경로 유지 |
| controlled-value caret clobber: lastEmitted self-origin 가드/정규화 오류로 매 키 innerHTML 재seed | 高/中 | Phase 1 slice에서 소진 + Tier-3 caret 테스트; `value!==core.getHTML()` AND non-self-origin일 때만 setHTML; uncontrolled는 sync 생략 |
| React reconciler가 `.note-editable` 안에 children 렌더 → 커서 전쟁 부활 | 高/低 | editable leaf는 계약상 React children 0; node-identity 안정성 회귀 테스트(Phase 1~) |
| codeview purify가 chrome으로 오배선 → 신뢰불가 HTML XSS 홀 | 高/低 | **하드 요구**: `@summernote/core/services/codeview.ts`에만, chrome import 금지; non-skippable verbatim XSS 게이트 |
| IME/composition을 합성 이벤트로 완벽 모사 불가 | 中/中 | Phase 1에 composition 가드 로직을 이벤트 경계에서 단언; 실-IME 수동 QA 체크리스트 |
| Bootstrap JS 제거로 bs3/4/5 modal/tooltip/dropdown 시맨틱 변화 | 中/中 | 검증된 lite Dropdown/Modal/Tooltip을 보편 구현으로; 시각 클래스 보존; 의도적 divergence 문서화; Tier-4 시각 게이트 |
| Dual ESM+CJS dual-package hazard | 中/低 | 인스턴스 상태는 `EditorCore` 객체(모듈 전역 아님); exports-map 순서; CI가 두 빌드 import |

## 10. 첫 2주 (즉시 착수)
- **Day 1-2**: Yarn workspaces(Node≥17, jquery/bootstrap/less/mocha 런타임 의존 제거), `@summernote/core`·`react` stub(Vite lib es+cjs + vite-plugin-dts로 ESM+CJS+.d.ts 증명), tsconfig.base + project references.
- **Day 2-3**: `vitest.config.js`→`.ts`(browser mode 보존, `@summernote/*`를 **TS 소스**에 별칭 — dist 아님), `test/util.ts`(h/mount/dispatchKey/Input/Paste/Composition), `test/setup.ts`(`equalsIgnoreCase` IE 분기 제거, `equalsStyle` jQuery-free 재구현).
- **Day 3-5**: 골든 코퍼스 recorder를 **태그된 레거시 빌드**에 대해 구축. `test/matrix.ts`(initialHTML × command/keystroke × options) — Editor/Buttons/Codeview/LinkDialog/VideoDialog/HintPopover/Context spec + **인라인 토글/justify/color/backColor/unlink/formatBlock의 부분·중첩·혼합 선택 엣지케이스**. 출력(editable.innerHTML, Style.current, codeview.sync, history snapshot, code()) → `test/golden/*.json` 동결 + freeze-guard.
- **Day 5-6**: CI — ESLint `no-restricted-imports(jquery)`/`no-restricted-syntax($)`(editor 패키지 한정), `check-no-jquery.sh`, zero-third-party-editor-dep 가드. 필수 PR 체크(Tier-1/2/3 실 Chrome).
- **Day 6-9**: `core/func·lists·env·key.ts` 이식(`$` 제거; `rect2bnd` 네이티브 scroll 수학 + ac5460e0 guard; `$.inArray`→`includes`; IE `inputEventName`은 `isMSIE` 뒤 격리). `core/dom.ts` 1:1(멤버명 전부, classList/createElement/forEach + parseHTML/closest). `test/base/core/{dom,func,lists,key}.spec.js`→`.spec.ts` 그대로 이식 green.
- **Day 9-12**: `core/range.ts` 1:1(`WrappedRange` 클래스 `sc/so/ec/eo`+`normalize()` verbatim; IE TextRange는 `isW3CRangeSupport` 뒤 격리; `pasteHTML` reversed-insert + setEnd guard 9a9e01d3 verbatim). `async.ts`(Deferred→Promise) + 최소 EventBus. `range.spec`→`.ts` 이식 + WrappedRange 필드/bookmark round-trip anchor.
- **Day 12-14**: Phase-1 thin slice — 최소 `EditorCore`(editable seed, History, `Style.current` bold-state, **자체 명령**으로 inline-toggle + insertText through before/afterCommand, 네이티브 이벤트 바인딩 + composition 가드). `useSummernote()` + 최소 `<SummernoteEditor>`(uncontrolled `.note-editable`, React children 0, `useSyncExternalStore`, bold 버튼 1). Tier-3(reconciler-exclusion, StrictMode 멱등, IME undo, no-clobber). **v0.1 게이트.**

## 11. 비준된 결정 + 의도적 divergence (release-note 대상)
- ✅ **Lens C 전면 TS 재구조화**(타입드 command + EventBus). ✅ **execCommand v1 완전 제거**(자체 Range 명령) — 인라인-포맷 마크업은 **결정적**(레거시 비결정적 execCommand 출력과 다름, 의도적 개선). ✅ **per-instance theme**(전역 `$.summernote.ui` 폐기). ✅ **콜백이 editable 요소를 명시적으로 받음**(`this`=raw-DOM 폐기). ✅ **Bootstrap JS 제거**(lite 동작으로 통일). ✅ **레거시 IE 미지원**(Chrome-only 패리티 게이트, TextRange 격리). ✅ **controlled 계약**: `value`/`onChange`만 controlled, 외부·non-self-origin value 변경시에만 setHTML(caret 보호).
- 마이그레이션: 기존 UMD 플러그인은 `definePlugin` 타입드 API로 이전(전역 `$.summernote.dom/ui`→per-instance import). 가이드 제공.

## 12. 미해결 질문 (착수 직후 spike로 해소)
- 기존 `test/base/` Vitest가 execCommand **산출 마크업**(`<b>` vs `<span style>`)에 단언하는가? → 인라인-포맷 골든을 결정적 재기준선으로 잡고, 회귀 게이트로 먼저 이식해야 함(범위 확인/예산).
- `getComputedStyle` vs jQuery `.css()` 정규화 차이(font-size px, font-family 인용)가 툴바 'checked' 상태에 미치는 영향 → dom/range 변환 커밋 전 `equalsStyle` spike.
- `History` innerHTML-per-undo 메모리 프로파일이 v1 허용인가(대용량 문서)? 권고: v1 verbatim, post-v1 재검토.
- Deferred→Promise 다이얼로그 상태머신(reject-on-hidden-while-pending) — 명시적 settled 플래그 + exactly-once resolve/reject 테스트.

---
*본 계획서는 13개 설계 에이전트(엔진-이식 3제안 + 심사 + 서브시스템 8 + 로드맵)의 종합이며, 사용자 결정(자체 엔진·외부 의존 0·전면 TS화·execCommand v1 제거)을 반영해 조정했다. 현 코드베이스 지도는 루트 [CLAUDE.md](../CLAUDE.md).*
