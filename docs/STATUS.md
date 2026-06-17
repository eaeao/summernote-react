# 포팅 현황 (STATUS) — react-ts-port 브랜치

> jQuery summernote → React + TypeScript 자체엔진 포팅의 **현재 상태 + 실행법 + 다음 단계**.
> 설계 SSOT는 [PORTING-PLAN.md](PORTING-PLAN.md), 코드 지도는 루트 [CLAUDE.md](../CLAUDE.md).

## 한눈에

- 브랜치 `react-ts-port` (main에서 분기, **미푸시**) — 구현 커밋 16개. 변경 규모 `+9083 / −2005`, 51 files.
- **전체 422 테스트 green (chromium + webkit), typecheck strict 클린.**
- **외부 editor/runtime 의존 0, jQuery 0, `document.execCommand` 0.**

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
| **Phase 2b** 자체명령 | **execCommand 완전 제거.** insertText · 인라인토글6(`Style.styleNodes`) · removeFormat · justify(`stylePara`) · lists(`Bullet`) · formatBlock(`dom.replace`) · createLink · unlink · hr · undo/redo(faithful `History`) |

**골든 parity 게이트**(`golden-parity.spec`): 레거시가 execCommand로 만든 출력을 자체 명령 엔진이 **38 케이스 재현**(왕복+블록+인라인). 인라인은 결정적 마크업(strike→`<s>`) 재기준선. ⇒ "execCommand 없이 레거시 동등" 증명.

## 알려진 갭 / 기술부채

- `EditorState`가 최소(bold/canUndo/canRedo/isComposing) — 툴바 전체 active-state(italic/underline/fontName/align/list…) 위해 **확장 필요**(Phase 3).
- **인라인 토글은 full-run 선택 검증됨**(골든 케이스). 부분/중첩/혼합 선택 하드닝은 미완 — execCommand 제거의 #1 리스크 long-tail.
- `insertHorizontalRule` 골든 미게이트(레거시 출력이 quirky `<p><br></p><hr><p>hello</p>` — 자체 출력으로 재기준선 필요).
- **table 명령(insertTable + row/col)이 EditorCore에 미연결** — Table 엔진은 이식·테스트 완료, wiring만 남음.
- collapsed-cursor 포맷(storedMarks) 미구현.
- `Style.current`는 1:1 유지(queryCommandState) 하되 EditorState에는 미연결(EditorCore는 구조적 검출 사용).
- 전체 패키지 build 그래프 미검증(core/react stub은 ESM+CJS+dts 확인). IE TextRange는 `env.isW3CRangeSupport` 뒤 격리.
- `__screenshots__/`(vitest 실패 아티팩트)는 gitignore됨. CRLF 경고는 무해(LF 커밋) — 원하면 `.gitattributes` 정규화.

## 다음 단계

**Phase 2b 마무리 (소소)**
1. **table 명령 wiring**: `insertTable(dim)` = `table.createTable(row,col,{tableClassName})` + `wrappedRange.create().insertNode(table)`; `addRow/addCol(pos)` = `table.addRow(wrappedRange.create(), pos)`; `deleteRow/deleteCol/deleteTable`. (createTable 시그니처 순서 확인.)
2. `insertHorizontalRule`를 golden-parity에 추가하되 자체 출력으로 재기준선(allowlist).

**Phase 3 — React chrome → v0.5**
1. `EditorState` 확장(전체 active-state) — `Style.current` 구조적 버전을 EditorCore에서 계산해 발행.
2. 테마별 React chrome: `<Toolbar>` (config `[group,[buttons]]`) · button/dropdown/colorpalette/table-picker · 다이얼로그(link/image/video/help, Promise) · 팝오버(link/image/table/air, `coordsAtPos`) · statusbar/handle/fullscreen/placeholder. 명령은 `core.command(name,...)`로 연결.
3. `.note-*` 클래스 계약 유지 + lite/bs3/bs4/bs5 ThemeSpec.
4. 크로스브라우저(§13): Pointer Events 터치, visualViewport 키보드 dock, 모바일 air-popover 아래 배치.

**v0.5 게이트**: lite 테마 풀 기능 + 4테마 byte-equiv `.note-*` + controlled no-clobber + per-instance theme + 실기기/수동-IME(Phase 4 게이트).
