# Notes 002 — `story-schema`

## Deviations

- **T001 (implementation detail):** the focus-region rules (FR-005: x, y ≥ 0; width, height > 0; inside 0–1 with a 1e-9 tolerance) are in the T001 schema because the plan's "Format" defines the region there; their tests come in T002.
- **T001 → T002:** the region's "inside 0–1" check runs even when a field of the region has already failed, so one bad region gives two Zod issues (e.g. `{ x: -1, width: 5 }` → `too_small` + `custom`). T002's error mapping must report it once (or skip the check when an earlier issue exists). Done in T002: the check runs only when the region's fields are valid (Zod `when`).
- **T002 (owner decision 2026-11-23):** a story with more than 12 scenes reports only `scene-count`; errors inside its scenes are not reported (spec edge case "every error in single fields is reported together" does not hold here). Zod's `.max(12)` stops before the scenes are checked; reporting them would need a hard cap before parsing to avoid a denial of service on huge arrays.
- **T002 (implementation detail):** the shared sample story of the tests moved to `tests/story-schema/sample-story.ts` (owner request after self-review); `format.test.ts` imports it.
- **T002 (owner decision 2026-11-23):** "blank" stays as in the plan (no non-space character); a transcript of only invisible characters such as a zero-width space is accepted.
- **T002 (known limit):** scene ids are compared exactly, without Unicode normalisation or trimming; a getter on the input that throws on a second read escapes `parseStory` (input from JSON has no getters).
- **T003 (agent decision, owner delegated 2026-11-23):** a story whose version is missing or unknown reports only `schema-version`; its other errors are not reported (a story of an unknown version cannot be checked against the current schema). Same kind of exception as the 12-scene one above.
- **T003 (agent decision):** `migrate` takes an object; `parseStory` sends input that is not an object straight to the schema, which reports `format`. `migrate` returns errors in the same shape as `parseStory`. `STEPS` is not exported until a caller needs it.
- **T003 (note for the first real step):** `migrate` copies the story with `structuredClone` only when a step runs (never today). From then on, an in-process caller passing a story with a function in it gets a thrown `DataCloneError`; stories parsed from JSON cannot contain one.

## Outside this feature

- **Boundary rules miss installed libraries** (found while planning, see `plan.md`): `.dependency-cruiser.mjs` has `node_modules` in `exclude`, so an import of an installed library from a pure package is never checked against CLAUDE.md §3 rules 3–7. Trial: `packages/story-schema` importing the installed `dependency-cruiser` and `vitest` passed; with `node_modules` moved from `exclude` to `doNotFollow` only, both were reported under `pure-allowlist` and `zod` stayed allowed. Not fixed here (CLAUDE.md §5); proposed to the owner as a separate `bug` PR.

## Process

- **2026-11-23:** the owner adopted "test names start with `should`" during this feature (override of the CLAUDE.md §2.1 freeze; process PR #31). T001's tests use it.
- **2026-11-23:** the owner asked for T003–T005 to be done without the per-task reviews and reviews the feature once, with authority for the agent to decide open points (recorded above as "agent decision").
