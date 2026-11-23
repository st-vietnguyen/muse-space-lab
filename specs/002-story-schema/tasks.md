# Tasks 002 — `story-schema`

Plan: [plan.md](./plan.md). One commit per task (`T00X: ...`). Each task follows CLAUDE.md §2 Implement: tests first (owner reviews), then code (owner reviews), then commit.

The first commit on branch `002-story-schema` holds `spec.md`, `plan.md`, this file and "Current status" in `docs/ROADMAP.md`.

## US1 — Describe a story

- [x] **T001** Create `packages/story-schema` with `zod`; the version 1 format with the three effects; `parseStory` (schema only); `sceneStartsMs`, `totalDurationMs`.
  Tests (`tests/story-schema/format.test.ts`): a story using all three effects, with captions, is accepted and returned equal to the input; the same with narration and a transcript; scenes of 15/25/25 s start at 0/15 000/40 000 ms and total 65 000 ms; a single scene starts at 0; a stored `startMs` on a scene or a `totalDurationMs` on the story is rejected.
  Files: `packages/story-schema/package.json`, `packages/story-schema/src/story.ts`, `pnpm-lock.yaml`, `tests/story-schema/format.test.ts`
  FR-001–FR-004, FR-006, FR-008, FR-010 · AC-13

## US2 — Reject invalid stories

- [x] **T002** Rule codes, the rules across fields, and errors naming rule, path and scene.
  Tests (`tests/story-schema/validate.test.ts`, one table row per case with its expected `{ rule, scene }`). Rejected: no scenes; 13 scenes; 5 min + 1 ms; duration missing, 0, −1, 1.5; narration 1 ms past the end; narration with no transcript and with a blank one; region with x + width > 1, negative x, zero width; unknown effect; missing effect; Final Reveal with params; Memory Reveal without `assetId`; unknown placement; empty caption; repeated scene id (names the second scene); unknown field on the story; input that is not an object. Accepted: 12 scenes; exactly 5 min; narration ending exactly at the end; narration from 0; region touching the edge, including `x = 0.123456789`, `width = 1 − x`; captions with no narration; a transcript with no narration; narration from 5 s lasting 55 s in 65 s.
  Files: `packages/story-schema/src/story.ts`, `tests/story-schema/validate.test.ts`, `tests/story-schema/sample-story.ts`, `tests/story-schema/format.test.ts`
  FR-002–FR-007, FR-009–FR-011 · AC-13

## US3 — Read older stories

- [x] **T003** `migrate` with the step list; `parseStory` upgrades before it validates.
  Tests (`tests/story-schema/migrate.test.ts`): a current-version story comes back unchanged; version missing, `"1"`, 0, 1.5 and 2 are rejected with `schema-version`; with a fake 1→2→3 step list, a version 1 story runs both steps in order, a version 2 story only the second, a version 3 story none, and version 4 is rejected; a deep-frozen input is not changed by `migrate` or `parseStory`; `parseStory` reports `schema-version` for an unknown version.
  Files: `packages/story-schema/src/migrate.ts`, `packages/story-schema/src/story.ts`, `tests/story-schema/migrate.test.ts`
  FR-001, FR-012–FR-014 · AC-13

## US4 — Have the reference story

- [ ] **T004** [P] (with T003, after T002) The reference story as data. No new code: the test and the fixture are reviewed at step 1; step 2 is the checks and the self-review.
  Tests (`tests/story-schema/reference-story.test.ts`): `parseStory` accepts it; effects in order Cinematic Focus, Memory Reveal, Final Reveal, lasting 15/25/25 s; total 65 s; narration from 5 s to 60 s; transcript present.
  Files: `tests/fixtures/stories/the-chair-by-the-window.json`, `tests/story-schema/reference-story.test.ts`
  FR-015 · AC-13, AC-15 (data only)

## Docs

- [ ] **T005** HLD §8.2 and §10; `notes.md` (boundary finding, deviations); "Current status".
  Files: `docs/HLD.md`, `specs/002-story-schema/notes.md`, `docs/ROADMAP.md`
