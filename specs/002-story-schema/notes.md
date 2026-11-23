# Notes 002 — `story-schema`

## Deviations

- **T001 (implementation detail):** the focus-region rules (FR-005: x, y ≥ 0; width, height > 0; inside 0–1 with a 1e-9 tolerance) are in the T001 schema because the plan's "Format" defines the region there; their tests come in T002.
- **T001 → T002:** the region's "inside 0–1" check runs even when a field of the region has already failed, so one bad region gives two Zod issues (e.g. `{ x: -1, width: 5 }` → `too_small` + `custom`). T002's error mapping must report it once (or skip the check when an earlier issue exists).

## Process

- **2026-11-23:** the owner adopted "test names start with `should`" during this feature (override of the CLAUDE.md §2.1 freeze; process PR #31). T001's tests use it.
