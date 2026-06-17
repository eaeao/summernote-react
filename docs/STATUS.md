# 포팅 현황 (STATUS) — react-ts-port 브랜치

> jQuery summernote → React + TypeScript 자체엔진 포팅의 **현재 상태 + 실행법 + 다음 단계**.
> 설계 SSOT는 [PORTING-PLAN.md](PORTING-PLAN.md), 코드 지도는 루트 [CLAUDE.md](../CLAUDE.md).

## 한눈에

- 브랜치 `react-ts-port` (main에서 분기, **미푸시**) — 구현 커밋 35개.
- **🎉 v0.5 달성 — 완전한 lite React 에디터 (레거시 lite 기능 패리티).** 26 spec 파일 전부 green (chromium + webkit), ~288 테스트(×2엔진=576 실행), typecheck strict 클린.
- **외부 editor/runtime 의존 0, jQuery 0, `document.execCommand` 0.**
- Phase 3b chrome 전체: 툴바 + 드롭다운(style/font/size/lineheight/para/color/table) · 다이얼로그(link/image/video/help) · 팝오버(link/image/table) + 이미지 리사이즈 handle · fullscreen/codeview/statusbar/placeholder · 키보드 단축키 · 플러그인 API + imperative handle. lite CSS(`@summernote/react/styles.css`).

## 실행법

```bash
yarn install                              # Yarn v1 workspaces
yarn workspace @summernote/core typecheck # + @summernote/react typecheck
yarn lint:no-jquery && yarn check:deps    # jQuery-ban + zero-dep 게이트
node_modules/.bin/vitest run              # 전체 테스트 (chromium + webkit)
node scripts/extract-golden.mjs           # 골든 코퍼스 재기록 (레거시 빌드 필요)
```

> ⚠️ 전체 `vitest run`이 하네스에서 자동 백그라운드 전환되며 출력이 비는 글리치가 있음 — 그 경우 `TaskStop` 후 포그라운드 재실행(warm 캐시라 빠름).

## 구조

```
packages/core   @summernote/core — 헤드리스 엔진, 런타임 의존 0 (tsup ESM+CJS+dts)
  src/core/     func lists env key dom range            (1:1 이식, jQuery-free)
  src/editing/  Style Typing Bullet Table History       (1:1 이식)
  src/EditorCore.ts  자체 명령 레지스트리 + IME 상태머신 + EditorState
packages/react  @summernote/react — useSummernote() + <SummernoteEditor> (react peer)
test/           jQuery-free 하네스(util/setup/매처) + 골든 oracle(commands.json) + freeze-guard
scripts/        check-no-jquery · check-no-runtime-deps · extract-golden
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

## 알려진 갭 / 기술부채

- ✅ `EditorState` 확장 완료(bold/italic/underline/strike/sup/sub/ordered·unordered list/align/formatBlock/link/canUndo/canRedo/isComposing) — **구조적 검출**(queryCommandState 미사용, 자체 마크업 결정적 감지). `INLINE_TOGGLES` 맵으로 토글↔하이라이트 단일 출처. 남은 건 fontName/fontSize/색상 등 값-기반 상태(폰트 드롭다운 붙일 때 추가).
- **인라인 토글은 full-run 선택 검증됨**(골든 케이스). 부분/중첩/혼합 선택 하드닝은 미완 — execCommand 제거의 #1 리스크 long-tail.
- `insertHorizontalRule` 골든 미게이트(레거시 출력이 quirky `<p><br></p><hr><p>hello</p>` — 자체 출력으로 재기준선 필요).
- collapsed-cursor 포맷(storedMarks) 미구현.
- `Style.current`는 1:1 유지(queryCommandState) 하되 EditorState에는 미연결(EditorCore는 구조적 검출 사용).
- 전체 패키지 build 그래프 미검증(core/react stub은 ESM+CJS+dts 확인). IE TextRange는 `env.isW3CRangeSupport` 뒤 격리.
- `__screenshots__/`(vitest 실패 아티팩트)는 gitignore됨. CRLF 경고는 무해(LF 커밋) — 원하면 `.gitattributes` 정규화.

## 다음 단계

**Phase 2b 마무리 (거의 끝)**
1. ✅ table 명령 wiring 완료 (insertTable/addRow/addCol/deleteRow/deleteCol/deleteTable, `commands-table.spec`).
2. (옵션) `insertHorizontalRule`를 golden-parity에 자체 출력으로 재기준선 — 현재 `commands-link-hr.spec`으로 기능 검증됨(`<hr>` 삽입).

**Phase 3 — React chrome → v0.5**
1. ✅ `EditorState` 확장 완료(전체 active-state, 구조적 검출, `editor-state.spec`).
2. 테마별 React chrome: ✅ `<Toolbar>`(config `[group,[buttons]]`)+button 완료. **다음:** dropdown(style/fontname/fontsize) · colorpalette · table-picker · 다이얼로그(link/image/video/help, Promise) · 팝오버(link/image/table/air, `coordsAtPos`) · statusbar/handle/fullscreen/placeholder. 명령은 `core.command(name,...)`로 연결. *dropdown/color/font 붙일 때 EditorState에 값-기반 상태(fontName/fontSize/foreColor/backColor) 추가 필요(현재 boolean active-state만).*
3. `.note-*` 클래스 계약 유지 + lite/bs3/bs4/bs5 ThemeSpec.
4. 크로스브라우저(§13): Pointer Events 터치, visualViewport 키보드 dock, 모바일 air-popover 아래 배치.

**v0.5 게이트**: lite 테마 풀 기능 + 4테마 byte-equiv `.note-*` + controlled no-clobber + per-instance theme + 실기기/수동-IME(Phase 4 게이트).
