# Tasks 000 — `workspace`

Plan: [plan.md](./plan.md). One commit per task (`T00X: ...`); the owner approves each task (phase A). For tooling, the "test first" step is the failure check: show the command failing on a deliberate mistake, then passing once the mistake is removed.

T002 and T003 were swapped on 2026-11-20 (owner approved): type checking fails on a repo with no source files, and the lint config file from T002 gives it one.

The first commit on branch `000-workspace` holds `spec.md`, `plan.md` and this file.

## US1 — Set up and run the checks

- [x] **T001** Workspace root. Check: `pnpm install` works; with `engines.node` set to `">=99"` it fails naming the range (FR-001, FR-002, FR-003).
  Files: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc`, `pnpm-lock.yaml`

## US2 — Mistakes fail the checks

- [x] **T002** Lint. A temporary lint error makes `pnpm lint` fail with file, line and rule; then it passes (FR-004, FR-006).
  Files: `eslint.config.js`, `package.json`, `docs/HLD.md` (§11 "Lint" row)
- [x] **T003** Type check. First a temporary file with a type error makes `pnpm typecheck` fail with file and line; then it passes without it; with no source files it passes because `eslint.config.js` (T002) is type-checked too (FR-004, FR-005, FR-006).
  Files: `tsconfig.json`, `package.json`
- [x] **T004** Tests. A temporary failing test makes `pnpm test` fail and name the test; with no tests it passes (FR-006, FR-007). A temporary folder `packages/tmp/` with a source and a test file is picked up by all three commands without changes, then deleted (FR-004).
  Files: `package.json`

## US3 — CI runs the checks on every change

- [ ] **T005** CI workflow. Push the branch, open a draft PR, CI green (FR-003, FR-008, FR-009, SC-003). Push the three mistakes to `000-workspace-ci-check`, link the failed run in the PR, delete the branch (SC-002).
  Files: `.github/workflows/ci.yml`

## Docs

- [ ] **T006** README with setup and the three commands; update ROADMAP "Current status" (FR-010, SC-001).
  Files: `README.md`, `docs/ROADMAP.md`
