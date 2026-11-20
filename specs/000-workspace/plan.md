# Plan 000 — `workspace`

Spec: [spec.md](./spec.md) · Status: **approved by the owner 2026-11-20** (incl. ESLint)

## Approach

The smallest root setup that makes `pnpm lint`, `pnpm typecheck` and `pnpm test` work for the whole repo, plus one CI workflow running them. No package or app is created (ROADMAP "Feature size").

| Need | Choice | Why |
|---|---|---|
| Package manager | pnpm workspaces (`packages/*`, `apps/*`), version pinned in `packageManager` | HLD §11 |
| Node.js version | `engines.node: ">=24.22.1"` (owner decision 2026-11-20; was `>=22.12.0`, the Vitest 5 minimum) + `engine-strict=true` in `.npmrc`; `.nvmrc` = `24.22.1` | pnpm refuses to install on another Node version and prints the required range (FR-002) |
| Type check | One root `tsconfig.json` (strict) that includes every `*.ts`/`*.tsx` in the repo; `typecheck` = `tsc --noEmit` | New packages are covered with no change (FR-004). `ponytail:` one program for the whole repo; move to per-package configs / project references when a package needs different settings (likely `apps/web` in 004) |
| Lint | ESLint flat config at the root with `@eslint/js` + `typescript-eslint` recommended rules; `lint` = `eslint .` | Covers the whole repo (FR-004). **Not listed in HLD §11 — needs approval, see below** |
| Tests | Vitest at the root, no config file; `test` = `vitest run --passWithNoTests` | HLD §11. Vitest finds `*.test.ts` anywhere (FR-004); `--passWithNoTests` because no test exists yet (FR-007) |
| CI | `.github/workflows/ci.yml`: on `push` to any branch; checkout → pnpm (from `packageManager`) → Node from `.nvmrc` with pnpm cache → `pnpm install --frozen-lockfile` → lint → typecheck → test, each a separate step; `permissions: contents: read`; no secrets | FR-003, FR-008, FR-009. A pull request shows the checks of its head commit, so a separate `pull_request` trigger would only run everything twice |

## Dependencies to add (dev only)

`typescript`, `eslint`, `@eslint/js`, `typescript-eslint`, `vitest`, latest stable at install time, locked by `pnpm-lock.yaml`.

**Approved 2026-11-20:** ESLint and `typescript-eslint` are not in HLD §11. Justification: CLAUDE.md §4 requires `pnpm lint`, and ESLint is the standard linter for TypeScript; `typescript-eslint` is what lets it read TypeScript. On approval, add a "Lint" row to HLD §11 in this PR. Feature 001 may also use ESLint for boundary rules.

**Version risk:** TypeScript 7 is the current release. If `typescript-eslint` does not support it yet, pin `typescript` to the newest version it supports and note it in `notes.md`.

## Verifying the failure cases (US1 scenario 3, US2, US3 scenario 2)

- FR-002: temporarily set `engines.node` to `">=99"`, run `pnpm install`, record the error, revert.
- US2: temporary files with a lint error, a type error and a failing test; run each command locally, record the output, delete the files.
- US3 scenario 2: push one commit with all three mistakes to a throwaway branch `000-workspace-ci-check`, link the failed run in the PR, then delete the branch. Nothing from it reaches the feature branch.

## Docs touched

- `README.md` (new): setup and the three commands.
- `docs/HLD.md` §11: "Lint" row, only if ESLint is approved.
- `docs/ROADMAP.md`: "Current status".

## Expected size

6 tasks, ~10 hand-written files (+ lockfile), well under 400 lines.
