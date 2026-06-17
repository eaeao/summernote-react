# 포팅 현황 (STATUS) — react-ts-port 브랜치

> jQuery summernote → React + TypeScript 자체엔진 포팅의 **현재 상태 + 실행법 + 다음 단계**.
> 설계 SSOT는 [PORTING-PLAN.md](PORTING-PLAN.md), 코드 지도는 루트 [CLAUDE.md](../CLAUDE.md).

## 한눈에

- **구조: 단일 패키지 `@eaeao/summernote-react`** (엔진+React 한 패키지, `src/engine`은 `@engine` alias로 번들 포함). 모노레포 해체. main 미푸시.
- 설치: `npm i @eaeao/summernote-react` (단일). `npm publish` 한 번.
- **🎉 Phase 3 + Phase 4 + Phase 5 완료 (v1.0 범위, 디바이스랩 게이트 제외).** 33 spec 파일, typecheck strict 클린, **core·react 둘 다 tsup 빌드 성공(ESM+CJS+.d.ts)**, `npm pack` 검증.
- **Phase 5**: ①인라인토글 부분/중첩/혼합 선택 하드닝(양엔진) ②**아이콘 webfont**(note-icon-* 글리프 렌더, 전 테마) ③교차테마 computed-style 시각게이트 ④패키징(exports/sideEffects/pack dry-run).
- ⚠️ **테스트 실행 정책(2026-06-18 변경)**: chromium+webkit 동시 실행이 PC를 멈춰서, **개발 중엔 chromium 단일 + 단일 spec + 실행후 프로세스 정리**. webkit/풀스위트는 마일스톤에만 1회. (vitest 게이트 설정 자체는 양엔진 유지.)
- **외부 editor/runtime 의존 0, jQuery 0, `document.execCommand` 0.**
- **Phase 3 (v0.5, lite 풀패리티)**: 툴바 + 드롭다운(style/font/size/unit/lineheight/para/color/table) · 다이얼로그(link/image/video/help) · 팝오버(link/image/table) + 이미지 리사이즈 handle · fullscreen/codeview/statusbar/placeholder · 키보드 단축키 · 플러그인 API + imperative handle.
- **어드버서리얼 리뷰(24 에이전트) → 확인된 15 결함 전부 수정**: **codeview XSS 게이트(codeviewFilter 이식 — §9 하드요구)**, link scheme allowlist, createLink 텍스트편집/blockquote 역변환, ownsRange 가드, ZWNBSP 누수, env FxiOS, 팝오버 위치 추적 등.
- **Phase 4 (v1)**: bs3/bs4/bs5 테마(per-instance, 공존) · **46 로케일**(생성 스크립트로 레거시 이식) + lang prop · specialchars/databasic 플러그인 · **air mode**(선택영역 플로팅 툴바, visualViewport 좌표, 모바일 below) · Pointer Events 터치(statusbar/handle).
- 테마 CSS: lite `@summernote/react/styles.css` + `themes/{bs3,bs4,bs5}.css`.

## 실행법

```bash
yarn install
yarn verify                                       # jQuery-ban + zero-dep 게이트 + typecheck
yarn build                                        # 단일 dist (ESM+CJS+dts, 엔진 번들 포함)
node_modules/.bin/vitest run <spec> --project=chromium   # 개발 중 권장(단일 엔진) + 실행 후 프로세스 정리
yarn test                                         # 전체 (chromium+webkit) — ⚠️ 무겁다, CI에 위임
```

> ⚠️ chromium+webkit 동시 실행이 PC를 멈춤(브라우저 프로세스 누적). 개발 중엔 chromium 단일 spec + 실행 후 정리. 풀 스위트는 CI(port-ci.yml)가 push마다 양엔진으로.

## 구조 (단일 패키지)

```
src/index.ts        @eaeao/summernote-react 배럴 — React API + export * from './engine'
src/SummernoteEditor.tsx useSummernote.ts plugin.ts plugins/ toolbar/ chrome/ styles/
src/engine/         헤드리스 엔진(구 core) — chrome은 @engine alias로 import, tsup이 dist에 번들
  EditorCore.ts options.ts  core/(dom·range·func·lists·env·key)  editing/(Style·Typing·Bullet·Table·History)  lang/(en-US+46locales)  media/  security/purify
test/               평탄화 *.spec.{ts,tsx} + setup·util·golden (vitest browser, @engine alias)
scripts/            check-no-jquery · check-no-runtime-deps (src/ + 루트 manifest 스캔)
.github/workflows/port-ci.yml  install → gates → typecheck → playwright chromium+webkit → vitest
```

## 완료 (검증됨, 양 엔진)

| 영역 | 내용 |
|---|---|
| **Phase 0** 인프라 | 모노레포 · vitest3+Playwright(chromium+webkit) 멀티엔진 게이트 · jQuery-free 매처 · jQuery-ban/zero-dep CI · **골든 oracle**(레거시 execCommand 출력 동결) + freeze-guard |
| **Phase 1** 코어 | func/lists/env/key/**dom(1225줄)**/**range(WrappedRange)** 1:1 이식 + 레거시 spec 그대로 이식 |
| **Phase 1** 슬라이스 | EditorCore + **IME composition 상태머신**(observe-only+settle+reconcile) + React 경계(uncontrolled editable, reconciler-exclusion) → **v0.1** |
| **Phase 2a** 편집엔진 | Style/Typing/Bullet/Table/History 1:1 이식 (style/Table/Typing spec) |
| **Phase 2b** 자체명령 | **execCommand 완전 제거.** insertText · 인라인토글6(`Style.styleNodes`) · removeFormat · justify(`stylePara`) · lists(`Bullet`) · formatBlock(`dom.replace`) · createLink · unlink · hr · **table(insertTable/addRow/addCol/deleteRow/deleteCol/deleteTable)** · undo/redo(faithful `History`) |
| **Phase 3a** 상태발행 | `EditorState` 전체 active-state(인라인6·list·align·formatBlock·link·undo/redo·IME) **구조적 검출**(queryCommandState 미사용). `INLINE_TOGGLES` 단일출처 → 토글↔하이라이트 무드리프트 |
| **Phase 3b**(진행) 툴바 | config 기반 `<Toolbar>` — `BUTTONS` 레지스트리(command+isActive/isDisabled가 EditorState 바인딩) + `DEFAULT_TOOLBAR`([group,keys], summernote shape) + `.note-toolbar/.note-btn-group/.note-btn/note-icon-*` 클래스 계약. 현재 명령 전부(인라인6+clear·ul/ol·justify4·undo/redo) 아이콘버튼 연결. `<SummernoteEditor toolbar=...>` prop |

**골든 parity 게이트**(`golden-parity.spec`): 레거시가 execCommand로 만든 출력을 자체 명령 엔진이 **38 케이스 재현**(왕복+블록+인라인). 인라인은 결정적 마크업(strike→`<s>`) 재기준선. ⇒ "execCommand 없이 레거시 동등" 증명.

## 알려진 갭 / 기술부채 (Phase 5 + 하드닝)

- ✅ **아이콘 webfont 이식 완료**: 레거시 pre-built `summernote.woff/woff2` + font.scss 글리프맵 → `@summernote/react/icons.css`(56 글리프, 47개 참조 아이콘 전부 매핑). `import '@summernote/react/icons.css'`.
- ✅ **인라인 토글 부분/중첩/혼합 선택 하드닝 완료**(양엔진, `inline-toggle-hardening.spec`). collapsed-cursor storedMarks는 여전히 미구현(bogus-span만 — minor).
- ⚠️ **Tier-4/Tier-5 실기기·수동-IME 게이트 미실행**(BrowserStack 시크릿 + sign-off 소유자 미배정 — 자율수행 불가). 릴리스 전 필수(§13.7). 현재 chromium+webkit 자동 + env 9-UA 유닛.
- ✅ 교차테마 computed-style 시각게이트(`VisualGate.spec` — 글리프·테마 cascade·border-radius 차등). byte-equiv까지는 아님.
- `insertHorizontalRule` 골든 미게이트(기능 검증됨). `Style.current`(queryCommandState) 1:1 보존하되 미사용.
- **로케일 per-module tree-shake**: `locales` 레지스트리는 전체 번들 — 진짜 per-locale tree-shake는 tsup multi-entry 필요(현재 단일 index). v1.0 refinement.
- changesets 셋업 미완(버전 0.0.0). CRLF 경고는 무해(LF 커밋).

## 다음 단계 (릴리스 전)

기능·하드닝·패키징은 v1.0 범위 완료. 남은 건 **자율수행 불가 / 환경 의존** 항목:
1. **Tier-4 실기기(BrowserStack) + Tier-5 수동-IME sign-off**(§13.7) — 시크릿·소유자 배정 필요.
2. changesets 셋업 + 버전 범프 + 실제 `npm publish`(또는 dry-run 승인) → **v1.0 태깅**.
3. (refinement) 로케일 multi-entry tree-shake, collapsed-cursor storedMarks, `.gitattributes` 정규화.
