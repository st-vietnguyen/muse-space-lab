# Plan 001 — `boundary-rules`

Spec: [spec.md](./spec.md) · Status: **approved by the owner 2026-11-20** (incl. dependency-cruiser)

## Approach

dependency-cruiser checks import rules by path; one ESLint block catches network globals that imports cannot show. Both run inside `pnpm lint`, so CI runs them with no workflow change. Violation examples live in a fixture tree that mirrors the repo layout, and Vitest tests run both tools on it.

| Need | Choice | Why |
|---|---|---|
| Import rules (FR-001 to FR-006) | **dependency-cruiser** `forbidden` rules in `.dependency-cruiser.cjs`, matched by path regex from the repo root | Resolves real files, so relative paths that leave a package are caught; `reachable` rules catch transitive chains (FR-003); `dependencyTypes: core` catches Node.js built-ins; unresolved names (not installed yet) still match. **Not in HLD §11, needs approval, see below** |
| Network globals (FR-004, FR-006) | ESLint `no-restricted-globals` for `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` in a `files` block for `packages/{story-schema,gallery-layout,domain,story-runtime}/**` | Already installed; imports cannot show a global call |
| Run everywhere (FR-008) | `lint` = `eslint . && depcruise --config .dependency-cruiser.cjs --output-type err .` | CI already runs `pnpm lint`; running on `.` passes when `apps/`/`packages/` don't exist (tried locally); `err` output prints rule, file and dependency (FR-007) |
| Proof (FR-009) | `tests/fixtures/boundaries/` mirrors the layout (`packages/story-schema/src/…`, `apps/web/src/visitor-experience/…`), one example file per rule. `tests/boundaries/*.test.ts` runs dependency-cruiser's `cruise()` API and ESLint's `ESLint` API with the fixture tree as the root, and asserts each example is reported under exactly its rule | Test-first; runs in `pnpm test`, so in CI. The fixture tree is excluded from the normal `lint`, `typecheck` and depcruise runs |

### Rules (paths are relative to the repo root)

| Rule name | From | Forbidden | Spec |
|---|---|---|---|
| `supabase-only-api-and-sign-in` | anything except `^apps/api/`, `^apps/web/src/auth/` | `@supabase/` | FR-001 |
| `db-only-api` | anything except `^apps/api/` | `drizzle-orm`, `drizzle-kit`, `postgres`, `pg` | FR-002 |
| `visitor-no-backend` | `^apps/web/src/visitor-experience/` | reachable: `creator-studio/`, `auth/`, `apps/api/`, `@supabase/`, DB drivers | FR-003 |
| `pure-no-node-builtins` | `^packages/(story-schema\|gallery-layout\|domain)/` | Node.js core modules | FR-004 |
| `pure-allowlist` | same | anything except `zod` and `packages/(story-schema\|gallery-layout\|domain\|contracts)/` | FR-004 |
| `engine-no-business-rules` | `^packages/gallery-engine/` | `packages/domain/` | FR-005 |
| `runtime-no-engine` | `^packages/story-runtime/` | `packages/gallery-engine/` | FR-006 |
| `runtime-no-backend` | `^packages/story-runtime/` | `apps/`, `@supabase/`, DB drivers | FR-006 |
| ESLint `no-restricted-globals` | pure packages + `story-runtime` | `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` | FR-004, FR-006 |

Options: `tsPreCompilationDeps: true` (type-only imports count), `doNotFollow: node_modules`, `exclude: node_modules|tests/fixtures/`.

## Dependency to add (dev only)

`dependency-cruiser` `^18.7.0` (newest allowed by the 21-day `minimumReleaseAge`; 18.8.0 is too new). Checked 2026-11-20: Node `^22||^24||>=26` (we use 24.22.1); supports TypeScript `>=2 <7` (we pin `~6.0.3`); no peer dependencies; `pnpm audit` clean. Local trial: 5 example violations (built-in, library, relative cross-package, transitive, uninstalled name) all reported with the right rule; exit code non-zero; empty repo passes.

**Needs approval:** dependency-cruiser is not in HLD §11. HLD §10 and ROADMAP 001 name it as one of two candidates. Why it, not `eslint-plugin-boundaries`: it checks transitive chains (FR-003: Visitor → shared UI → Creator API client), which the ESLint plugin does not, and its rules are plain path regexes, simpler than the plugin's element config plus the TypeScript import resolver it would need. Why not plain ESLint `no-restricted-imports` (no new dependency): it only sees import strings, so `../../domain/src/x` and transitive chains slip through. On approval, add a "Boundaries" row to HLD §11.

**Version risk:** dependency-cruiser does not support TypeScript 7 yet. A future TypeScript 7 upgrade must wait for it; noted in `notes.md`.

## Fixtures and the normal checks

- `tsconfig.json` and `eslint.config.js` exclude `tests/fixtures/` (fixtures import libraries that are not installed). The tests run ESLint with `ignore: false` on the fixtures.
- The fixture tree is a copy of the paths, not a real package (no `package.json`), so no empty scaffolding is created.

## Verifying the failure cases

- US1, US3 scenario 1: the tests (written first, failing until the rules exist).
- US2: run `pnpm lint` with one temporary violation under `packages/` and record the output in the PR, then delete it.
- US3 scenario 2: push one violation to a throwaway branch `001-boundary-rules-ci-check`, link the failed run in the PR, delete the branch.

## Docs touched

- `docs/HLD.md` §10: web areas under `apps/web/src/` incl. `auth/`; boundaries enforced by dependency-cruiser. §11: "Boundaries" row (on approval).
- `README.md`: `pnpm lint` also checks boundaries; where the rules live.
- `docs/ROADMAP.md`: "Current status".

## Expected size

6 tasks, about 15 files (most are one-line fixtures), well under 400 hand-written lines.
