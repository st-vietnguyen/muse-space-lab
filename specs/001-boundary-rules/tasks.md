# Tasks 001 — `boundary-rules`

Plan: [plan.md](./plan.md). One commit per task (`T00X: ...`). From this feature the owner approves the plan and reviews the PR, not each task. Test first: each rule task starts with its fixture and test failing, then adds the rule.

The first commit on branch `001-boundary-rules` holds `spec.md`, `plan.md` and this file.

## US1 + US3 — Forbidden dependencies fail, proven by tests

- [x] **T001** Add dependency-cruiser; fixtures + test for rules 3–5 (`supabase-only-api-and-sign-in`, `db-only-api`, `visitor-no-backend` incl. a transitive chain); test fails, then `.dependency-cruiser.cjs` makes it pass. Exclude `tests/fixtures/` from typecheck and lint (FR-001, FR-002, FR-003, FR-009, FR-010). AC-11 (setup).
  Files: `package.json`, `pnpm-lock.yaml`, `.dependency-cruiser.cjs`, `tsconfig.json`, `eslint.config.js`, `tests/boundaries/dependency-cruiser.test.ts`, `tests/fixtures/boundaries/**`
- [x] **T002** Fixtures + tests for rules 6–7 (`pure-no-node-builtins`, `pure-allowlist` incl. a relative path out of the package, `engine-no-business-rules`, `runtime-no-engine`, `runtime-no-backend`); fail, then add the rules (FR-004, FR-005, FR-006, FR-009).
  Files: `.dependency-cruiser.cjs`, `tests/boundaries/dependency-cruiser.test.ts`, `tests/fixtures/boundaries/**`
- [ ] **T003** [P] Network globals: fixture + test with ESLint's API; fail, then add the `no-restricted-globals` block (FR-004, FR-006, FR-009).
  Files: `eslint.config.js`, `tests/boundaries/eslint.test.ts`, `tests/fixtures/boundaries/**`

## US2 — Clear failure, part of the normal checks

- [ ] **T004** `pnpm lint` runs depcruise on the repo. Check: passes on today's repo with no warnings; a temporary violation under `packages/` fails with rule, file and dependency (output recorded for the PR), then deleted (FR-007, FR-008).
  Files: `package.json`

## US3 — CI proof

- [ ] **T005** Push the branch, open a draft PR, CI green (SC-003). Push one violation to `001-boundary-rules-ci-check`, link the failed run in the PR, delete the branch (SC-002).
  Files: none

## Docs

- [ ] **T006** HLD §10 (web areas incl. `auth/`, tool chosen) and §11 "Boundaries" row; README; `notes.md` (TypeScript 7 risk); ROADMAP "Current status".
  Files: `docs/HLD.md`, `README.md`, `specs/001-boundary-rules/notes.md`, `docs/ROADMAP.md`
