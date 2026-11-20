# Spec 001 — `boundary-rules`

**Issue:** #6 · **Phase:** A · **Status:** Approved (2026-11-20)

## Context

Feature 000 gave the repo one set of checks (lint, typecheck, test) run locally and in CI. CLAUDE.md §3 rules 3–7 say which code may depend on which, and that they are "checked automatically in CI", but nothing checks them yet. This feature adds that check before any package or app exists, so features 002+ are checked from their first file. It is also the first feature run with plan-level approval only (phase A).

**Sources:** ROADMAP 001, "Feature size" · CLAUDE.md §3 rules 3–7 · HLD §4 (frontend uses Supabase only for sign-in; Visitors never call API/DB), §4.4 principles 3, 5, 7, 8, 9, §10 (layout, package table, dependency direction) · AC-11 (setup only; the runtime check is the Playwright scenario in 007) · OQ: none.

## User scenarios

US1–US3 match the issue's three stories, in order.

### US1 — Forbidden dependencies fail the check (P1)

The owner gets a failing check whenever code crosses a boundary from CLAUDE.md §3 rules 3–7.

**Independent test:** for each rule, a deliberate violation placed in the rule's path makes the check fail; removing it makes the check pass.

**Acceptance scenarios:**

1. **Given** code outside the API app and the web app's sign-in area that uses the Supabase SDK, **When** the check runs, **Then** it fails (rule 3).
2. **Given** web or package code that uses a database driver or ORM, **When** the check runs, **Then** it fails (rule 4).
3. **Given** Visitor code that uses, directly or through other files, the Creator area, the sign-in area, the API app, the Supabase SDK or a database driver, **When** the check runs, **Then** it fails (rule 5).
4. **Given** a pure package (`story-schema`, `gallery-layout`, `domain`) that uses a Node.js built-in module, the network, or any library or package not on its allowlist, **When** the check runs, **Then** it fails (rule 6).
5. **Given** `gallery-engine` code that uses `domain`, **When** the check runs, **Then** it fails (rule 7).
6. **Given** `story-runtime` code that uses `gallery-engine`, an app, the Supabase SDK, a database driver or the network, **When** the check runs, **Then** it fails (rule 7).

### US2 — The failure says exactly what is wrong (P1)

A developer can fix a violation from the message alone.

**Independent test:** run the check on one violation and read the output.

**Acceptance scenarios:**

1. **Given** a violation, **When** the check runs, **Then** the output names the rule, the offending file and what it used.
2. **Given** code that follows the rules, **When** the check runs, **Then** it passes with no warnings.

### US3 — The rules are proven and run everywhere (P1)

The owner can trust that a passing check means something.

**Independent test:** the automated test suite exercises every rule; a deliberate violation pushed to a throwaway branch fails CI.

**Acceptance scenarios:**

1. **Given** the kept violation examples, **When** the tests run, **Then** each example is reported under exactly the rule it was written for, and no example passes.
2. **Given** a violation pushed to any branch, **When** CI runs, **Then** the run fails at the step that runs the check and shows the rule.
3. **Given** a later feature that creates a package or app in its planned place, **When** the check runs, **Then** that code is checked with no change to the rules.

## Edge cases

- No `apps/` or `packages/` folder exists yet: the check passes (today's repo).
- The kept violation examples must not fail the normal lint, typecheck or boundary check of the repo.
- A violation through a chain of files (Visitor → shared UI → Creator API client) is still caught.
- A violation through a relative path that leaves the package (`../../domain/src/x`) is caught like one through the package name.
- A library that is not installed yet is still matched by its name.
- Type-only imports count as dependencies (they still couple the code).

## Functional requirements

- **FR-001** Code MUST NOT use the Supabase SDK unless it is in the API app or the web app's sign-in area (rule 3).
- **FR-002** Code outside the API app MUST NOT use a database driver or ORM (rule 4).
- **FR-003** Visitor code MUST NOT reach, directly or transitively, the Creator area, the sign-in area, the API app, the Supabase SDK or a database driver (rule 5).
- **FR-004** Pure packages MUST NOT use Node.js built-in modules or network globals (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`), and MAY use only `zod` and the packages `story-schema`, `gallery-layout`, `domain`, `contracts` (rule 6).
- **FR-005** `gallery-engine` MUST NOT use `domain` (rule 7).
- **FR-006** `story-runtime` MUST NOT use `gallery-engine`, any app, the Supabase SDK, a database driver or network globals (rule 7).
- **FR-007** Each violation MUST be reported with the rule name, the offending file and the dependency, and MUST make the check exit non-zero.
- **FR-008** The rules MUST run as part of the existing root checks, so CI runs them on every push with no workflow change, no secrets and no cost.
- **FR-009** Each rule MUST have at least one kept violation example, and an automated test MUST prove each example is reported under that rule.
- **FR-010** Rules MUST be written against the planned paths, so code added there later is checked unchanged.

## Success criteria

- **SC-001** Every rule in FR-001 to FR-006 has a passing test that proves its violation example is caught.
- **SC-002** A deliberate violation pushed to a throwaway branch fails CI (run linked in the PR); nothing from it is merged.
- **SC-003** `pnpm lint`, `pnpm typecheck`, `pnpm test` pass on this feature's PR with no warnings.

## Constraints and decisions

- Rules 3–7 are checked in CI; on a violation fix the code, never loosen the rule (CLAUDE.md §3).
- Only tools in HLD §11; any other needs a justification in the plan and owner approval (CLAUDE.md §2).
- No CI configuration change unless asked (CLAUDE.md §5): the check must ride on an existing root command.
- No empty package or app scaffolding (ROADMAP "Feature size"): violation examples live under test fixtures, not in `apps/` or `packages/`.

## Assumptions

- Web app areas live under `apps/web/src/`: `visitor-experience/`, `creator-studio/`, `public-pages/`, `ui/` (HLD §4.1, §10), plus `auth/` for the sign-in part, which HLD does not name yet. All Creator API calls live in `creator-studio/`. HLD §10 is updated with these paths.
- Database drivers and ORM: `drizzle-orm`, `drizzle-kit`, `postgres`, `pg` (HLD §11). A new driver means a rule change.
- "The network" is checked as imports plus the network globals in FR-004; a call through a library that is not on the allowlist is already caught by the allowlist.
- `contracts` holds types only, so the pure packages may use it (HLD §10 dependency direction).
- Runtime network calls from Visitor pages (a `fetch` to the API URL) cannot be seen from imports; AC-11 is fully checked by the Playwright scenario in 007.

## Out of scope

- Product code; the packages and apps these rules protect come in later features.
- Rules that dependency analysis cannot see: no `eval`/`new Function` (rule 2), no `setTimeout` chains (rule 8), immutability (rule 9).
- The rest of the HLD §10 dependency direction (e.g. packages never import apps, `story-schema` never imports `domain`); add it when a feature needs it.
- Keeping the service role key out of the web bundle (rule 10): secret scan today, checked again in 009.
- Blocking merges on failed checks (GitHub Free, private repo).

## Clarifications

- None yet.
