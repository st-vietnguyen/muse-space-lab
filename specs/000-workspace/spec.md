# Spec 000 — `workspace`

**Issue:** #1 · **Phase:** A · **Status:** Approved (2026-11-20)

## Context

The repository holds only docs. Every later feature needs one shared way to install, lint, type-check and test code, locally and in CI, before any package exists. This feature provides that and nothing else; packages and apps are created by the first feature that needs them (story-schema in 002, the web app in 004). It is also the first run of the manual GitHub flow, so it stays small. Feature 001 builds on it by adding package boundary rules to the same checks.

**Sources:** ROADMAP 000, "Feature size" · HLD §10 (monorepo layout `packages/*`, `apps/*`), §11 (pnpm workspaces, Node ≥ 24.22.1, Vitest, GitHub Actions) · CLAUDE.md §4 (`pnpm lint`, `pnpm typecheck`, `pnpm test` gate every task) · AC: none directly, enables AC-13, AC-14 · OQ: none.

## User scenarios

US1–US3 match the issue's three stories, in order.

### US1 — Set up and run the checks (P1)

A developer or agent clones the repo, installs once, and runs the three checks without help.

**Independent test:** fresh clone → install → three commands pass; README alone is enough to do it.

**Acceptance scenarios:**

1. **Given** a fresh clone and a supported Node.js, **When** the developer runs the install command, **Then** all dependencies install with no prompt.
2. **Given** an installed fresh clone, **When** the developer runs `pnpm lint`, `pnpm typecheck` and `pnpm test`, **Then** all three exit with code 0.
3. **Given** an unsupported Node.js version, **When** the developer installs, **Then** install stops and the message names the required version.
4. **Given** a new folder with source and test files under `packages/` or `apps/`, **When** the three commands run unchanged, **Then** they check those files too.

### US2 — Mistakes fail the checks (P1)

A developer who introduces a mistake sees the matching check fail and points to it.

**Independent test:** add one deliberate mistake of each kind, run each command, see it fail; remove it, see it pass.

**Acceptance scenarios:**

1. **Given** a lint violation, **When** `pnpm lint` runs, **Then** it exits non-zero and reports file, line and rule.
2. **Given** a type error, **When** `pnpm typecheck` runs, **Then** it exits non-zero and reports file and line.
3. **Given** a failing test, **When** `pnpm test` runs, **Then** it exits non-zero and names the test.

### US3 — CI runs the checks on every change (P1)

The owner sees, on every pull request, whether its latest commit passed the checks.

**Independent test:** push a branch with a PR → checks appear on the PR; push a deliberate mistake on a throwaway branch → that run fails at the right step.

**Acceptance scenarios:**

1. **Given** a push to any branch, **When** it reaches GitHub, **Then** install, lint, typecheck and test run, and a pull request on that branch shows the result.
2. **Given** a commit with a lint error, a type error and a failing test, **When** it is pushed, **Then** the run fails and names the failing step.

## Edge cases

- No source or test files exist yet: all three commands pass (an empty repo is valid).
- A lockfile out of sync with `package.json` in CI: install fails instead of silently updating it.
- The checks see generated or installed folders (dependencies, build output): they are ignored.
- Several mistakes at once: CI still reports each failing step, not only the first. *(nice to have; at least the first failing step must be clear)*

## Functional requirements

- **FR-001** The repo MUST be a workspace whose members are every folder under `packages/` and `apps/`.
- **FR-002** Install MUST refuse a Node.js version below 24.22.1 (owner decision 2026-11-20: patched release) and print the required range.
- **FR-003** The package manager version MUST be pinned in the repo, and CI MUST use the same Node.js and package manager versions as local development.
- **FR-004** `pnpm lint`, `pnpm typecheck` and `pnpm test` MUST run from the repo root and cover all workspace members without per-member changes.
- **FR-005** Type checking MUST be strict.
- **FR-006** Each command MUST exit non-zero on any failure.
- **FR-007** `pnpm test` MUST pass when there are no tests.
- **FR-008** CI MUST run on every push to any branch, with install, lint, typecheck and test as separate steps, using a frozen lockfile.
- **FR-009** CI MUST need no secrets and only read access to the repo.
- **FR-010** A root README MUST explain setup and the three commands.

## Success criteria

- **SC-001** A new contributor goes from clone to three passing checks using only the README.
- **SC-002** Each of the three deliberate mistakes is caught locally and in CI (evidence in the PR).
- **SC-003** CI is green on this feature's PR, and no deliberate mistake is merged.

## Constraints and decisions

- Only technologies in HLD §11; any other tool needs a justification in the plan and owner approval (CLAUDE.md §2).
- No empty package or app scaffolding (ROADMAP "Feature size").
- Free GitHub Actions only; private repo on GitHub Free, so merges are not blocked by failed checks — the owner checks before merging.
- Never commit `.env` values (CLAUDE.md §6).

## Assumptions

- "Any branch" includes `main`; a pull request reuses the push run of its head commit rather than running twice.
- Formatting style is enforced only as far as the linter's recommended rules go.

## Out of scope

- Packages, apps, product features.
- Package boundary rules (001).
- Database, local Supabase, browser tests, deployment.
- Code formatter, pre-commit hooks, Dev Containers, branch protection.

## Clarifications

- None yet.
