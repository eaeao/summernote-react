# Contributing

Thanks for your interest in `@eaeao/summernote-react` — a React + TypeScript port of [summernote](https://summernote.org) on its own engine, with **zero runtime dependencies** and **no jQuery**. The editor engine and the React bindings ship in one package.

## Project invariants

These are enforced in CI; please keep them green:

- **No jQuery** anywhere under `src/` (`check-no-jquery`).
- **Zero third-party runtime dependencies** — `react` / `react-dom` are peers, the engine is bundled (`check-no-runtime-deps`).
- **No `document.execCommand`** — editing is done with the engine's own Range commands.
- **Strict TypeScript** (`tsc --noEmit`, incl. `exactOptionalPropertyTypes`).

`yarn verify` runs the jQuery-ban, zero-dep, version-sync, and typecheck gates together.

## Getting set up

The package manager is **Yarn** (node-modules linker).

```bash
yarn install
yarn verify   # jQuery-ban + zero-dep + version gates + typecheck
yarn build    # tsup → dist (ESM + CJS + .d.ts)
```

Run the docs + playground site against the editor source (hot reload):

```bash
cd demo && yarn install && yarn dev   # http://localhost:5173
```

## Contribution flow

1. Fork the repo and create a topic branch off `main`.
2. Make focused commits (Conventional Commits — see below).
3. Keep `yarn verify` green and add tests for behavior changes.
4. Add a changeset if your change is user-facing (see Releases).
5. Open a pull request. CI runs the gates, a typecheck, the package checks, and the test suite on **Chromium + WebKit**.

## Tests

Tests run in **Vitest browser mode** on real Chromium + WebKit (via Playwright) — not JSDOM — so range/selection/computed-style behave like a real browser. Specs live in `test/*.spec.{ts,tsx}`.

```bash
yarn test                                                            # full suite, both engines (heavy)
node_modules/.bin/vitest run test/<name>.spec.ts --project=chromium  # one spec, one engine (recommended while developing)
yarn test:watch
```

## Code style

- **Prettier** (single quotes, 120 print width, trailing commas). Run `npx prettier --write .` or use your editor's Prettier integration.
- **English** for code, comments, identifiers, and commit messages.
- Keep comments minimal — add one only when the *why* isn't obvious from the code.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org): `<type>(<scope>): <subject>` — English, present tense, no trailing period.

- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`.
- **scope** (optional): e.g. `editor`, `table`, `toolbar`, `range`, `build`, `lang`.
- Do **not** add `Co-Authored-By` / AI co-author trailers.
- Don't push directly to `main`, and don't bypass git hooks (`--no-verify`).

## Releases (changesets)

User-facing changes need a changeset:

```bash
yarn changeset
```

Maintainers cut a release with `yarn version-packages` (bumps `package.json` + syncs the exported `VERSION` / `CORE_VERSION`) then `yarn release` (verify → build → `check:package` → publish).

## Architecture

The headless engine is `src/engine` (the chrome imports it via the `@engine` alias); the React component, hooks, toolbar, and chrome are under `src/`. For the architecture map, the controlled caret-safe contract, and the security model, see **[How it works](https://eaeao.github.io/summernote-react/docs/concepts)** and the repo's `CLAUDE.md`.

## Docs

Documentation is Markdown under `docs/` (Diátaxis-structured), rendered by the demo site and mirrored to `/llms.txt`. `markdownlint` + a link check run in CI on every docs change.
