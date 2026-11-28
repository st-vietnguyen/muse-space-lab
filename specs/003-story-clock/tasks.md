# Tasks 003 — `story-clock`

Plan: [plan.md](./plan.md). One commit per task (`T00X: ...`). Each task follows CLAUDE.md §2 Implement in the feature lane: tests first (reviewed), then code (reviewed), then commit. Tasks run in order.

The first commit on branch `003-story-clock` holds `spec.md`, `plan.md`, this file and `notes.md`. The first version had a third task, T003 "Follow the narration"; by the owner's decision of 2026-11-28 it moved to issue #41 (`notes.md`).

## US1 — Know where the story is

- [x] **T001** `logic` Create `packages/story-runtime` with the workspace link to `story-schema`; `positionAt`.
  Tests (`tests/story-runtime/timeline.test.ts`, one table row per time with its expected position): for the reference timing 0 → scene 1, progress 0; 14 999 → scene 1, 14 999/15 000; 15 000 → scene 2, progress 0; 27 500 → scene 2, progress 0.5, story progress 27 500/65 000; 39 999.5 → scene 2; 40 000 → scene 3, progress 0; 65 000 → scene 3, scene progress 1, story progress 1; each row checks time, scene index, scene id and both progress values. −1 and −∞ give the position at 0; 65 001 and +∞ give the position at the end. A single-scene story: scene 1 at 0, in the middle and at the end. The same story and time asked twice give equal positions, and a deep-frozen story is accepted.
  Files: `packages/story-runtime/package.json`, `packages/story-runtime/src/index.ts`, `packages/story-runtime/src/timeline.ts`, `pnpm-lock.yaml`, `tests/story-runtime/timeline.test.ts`, `tests/story-runtime/stories.ts`
  FR-001, FR-002 · AC-13

## US1, US2, US4 — The clock: play, pause, seek, restart, end

- [ ] **T002** `logic` `createStoryClock`: reading, play, pause, seek, restart, the end and its listeners, no timers; a story's narration has no effect.
  Tests (`tests/story-runtime/clock.test.ts`, time is a variable the test sets):
  - New clock: paused, time 0, the reading holds the position of scene 1 at progress 0; time does not move while the source moves.
  - Play: the time advances by exactly what the source advances (1 ms, 1 000 ms, 16.5 ms); `play` on a playing clock does not shift the time. At one point in the middle of a run the whole reading is checked (status and all position fields).
  - Pause: playing at 12 345 ms, paused, source +10 min, played → moved ≤ 50 ms (exactly 12 345), then +1 000 ms → 13 345; `pause` on a paused clock changes nothing.
  - Seek (table): 50 000 from 10 000 → scene 3; −1 and −∞ → 0; "not a number" → time and status unchanged; a seek while playing stays playing and keeps advancing from the target; a seek while paused stays paused.
  - Restart: from playing, paused and finished → time 0, playing.
  - End: playing at 64 000, source +5 000, read twice → finished at exactly 65 000 both times, listener called once; two listeners are both called; a removed listener is not called; seek to 70 000 and to +∞ finishes, while playing and while paused, listener called once; a finished clock ignores `play` and `pause`; a seek back leaves it paused at the target and `play` continues from there; a seek to the end on a finished clock does not call the listener again; restart then running to the end calls it a second time.
  - Readings far apart: one read long after the end passed → finished at exactly 65 000, listener once; a command (`pause`, `seek` back) arriving first after the end passed → the end is reported first.
  - A story with narration (the reference timing with narration from 5 000 ms): played from 0 through 5 000 ms and on, the time follows the source exactly and the status stays playing.
  - A run from start to end: the scene changes at 15 000 and 40 000 ms.
  - No timers: with Vitest fake timers, a run from play to the end with pause, seek and restart leaves `vi.getTimerCount()` at 0.
  Files: `packages/story-runtime/src/clock.ts`, `packages/story-runtime/src/index.ts`, `tests/story-runtime/clock.test.ts`
  FR-003–FR-010 · SC-003 · AC-07 (pause ≤ 50 ms), AC-13
