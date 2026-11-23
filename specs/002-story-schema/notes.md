# Notes 002 — `story-schema`

## Deviations

- **T001 (implementation detail):** the focus-region rules (FR-005: x, y ≥ 0; width, height > 0; inside 0–1 with a 1e-9 tolerance) are in the T001 schema because the plan's "Format" defines the region there; their tests come in T002.
- **T001 → T002:** the region's "inside 0–1" check runs even when a field of the region has already failed, so one bad region gives two Zod issues (e.g. `{ x: -1, width: 5 }` → `too_small` + `custom`). T002's error mapping must report it once (or skip the check when an earlier issue exists). Done in T002: the check runs only when the region's fields are valid (Zod `when`).
- **T002 (owner decision 2026-11-23):** a story with more than 12 scenes reports only `scene-count`; errors inside its scenes are not reported (spec edge case "every error in single fields is reported together" does not hold here). Zod's `.max(12)` stops before the scenes are checked; reporting them would need a hard cap before parsing to avoid a denial of service on huge arrays.
- **T002 (implementation detail):** the shared sample story of the tests moved to `tests/story-schema/sample-story.ts` (owner request after self-review); `format.test.ts` imports it.
- **T002 (owner decision 2026-11-23):** "blank" stays as in the plan (no non-space character); a transcript of only invisible characters such as a zero-width space is accepted.
- **T002 (known limit):** scene ids are compared exactly, without Unicode normalisation or trimming; a getter on the input that throws on a second read escapes `parseStory` (input from JSON has no getters).

## Process

- **2026-11-23:** the owner adopted "test names start with `should`" during this feature (override of the CLAUDE.md §2.1 freeze; process PR #31). T001's tests use it.
