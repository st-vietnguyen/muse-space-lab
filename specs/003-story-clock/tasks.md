# Tasks 003 — `story-clock`

Plan: [plan.md](./plan.md). One commit per task (`T00X: ...`). Each task follows CLAUDE.md §2 Implement in the feature lane: tests first (reviewed), then code (reviewed), then commit. Tasks run in order.

The first commit on branch `003-story-clock` holds `spec.md`, `plan.md`, this file and `notes.md`.

## US1 — Know where the story is

- [ ] **T001** `logic` Create `packages/story-runtime` with the workspace link to `story-schema`; `positionAt`.
  Tests (`tests/story-runtime/timeline.test.ts`, one table row per time with its expected position): for the reference timing 0 → scene 1, progress 0; 14 999 → scene 1, 14 999/15 000; 15 000 → scene 2, progress 0; 27 500 → scene 2, progress 0.5, story progress 27 500/65 000; 39 999.5 → scene 2; 40 000 → scene 3, progress 0; 65 000 → scene 3, scene progress 1, story progress 1; each row checks time, scene index, scene id and both progress values. −1 and −∞ give the position at 0; 65 001 and +∞ give the position at the end. A single-scene story: scene 1 at 0, in the middle and at the end. The same story and time asked twice give equal positions, and a deep-frozen story is accepted.
  Files: `packages/story-runtime/package.json`, `packages/story-runtime/src/index.ts`, `packages/story-runtime/src/timeline.ts`, `pnpm-lock.yaml`, `tests/story-runtime/timeline.test.ts`, `tests/story-runtime/stories.ts`
  FR-001, FR-002 · AC-13

## US1, US2 — The clock: play, pause, seek, restart, end

- [ ] **T002** `logic` `createStoryClock` for a story without narration: reading, play, pause, seek, restart, the end and its listeners, no timers.
  Tests (`tests/story-runtime/clock.test.ts`, time is a variable the test sets):
  - New clock: paused, time 0, the reading holds the position of scene 1 at progress 0; time does not move while the source moves.
  - Play: the time advances by exactly what the source advances (1 ms, 1 000 ms, 16.5 ms); `play` on a playing clock does not shift the time.
  - Pause: playing at 12 345 ms, paused, source +10 min, played → moved ≤ 50 ms (exactly 12 345), then +1 000 ms → 13 345; `pause` on a paused clock changes nothing.
  - Seek (table): 50 000 from 10 000 → scene 3; −1 and −∞ → 0; "not a number" → time and status unchanged; a seek while playing stays playing and keeps advancing from the target; a seek while paused stays paused.
  - Restart: from playing, paused and finished → time 0, playing.
  - End: playing at 64 000, source +5 000, read twice → finished at exactly 65 000 both times, listener called once; two listeners are both called; a removed listener is not called; seek to 70 000 and to +∞ finishes, while playing and while paused, listener called once; a finished clock ignores `play` and `pause`; a seek back leaves it paused at the target and `play` continues from there; a seek to the end on a finished clock does not call the listener again; restart then running to the end calls it a second time.
  - Readings far apart: one read long after the end passed → finished at exactly 65 000, listener once; a command (`pause`, `seek` back) arriving first after the end passed → the end is reported first.
  - No timers: with Vitest fake timers, a run from play to the end with pause, seek and restart leaves `vi.getTimerCount()` at 0.
  Files: `packages/story-runtime/src/clock.ts`, `packages/story-runtime/src/index.ts`, `tests/story-runtime/clock.test.ts`
  FR-003–FR-009 · AC-07 (pause ≤ 50 ms), AC-13

## US3, US4 — Follow the narration

- [ ] **T003** `logic` Narration: the span, the reports, buffering, the expected narration position; the run of the reference story.
  Tests (`tests/story-runtime/narration.test.ts` with `tests/story-runtime/simulated-narration.ts`):
  - Lead-in: played from 0, source +4 999 → 4 999; reports of every type received before 5 000 change nothing (also "finished seeking at 0" and "waiting").
  - Re-anchoring: clock at 5 080, "started playing" at 0 → 5 000; +250 ms → 5 250; "position update" 250 → 5 250.
  - Drift (table): clock 101 ms ahead, 5 000 ms ahead, 101 ms behind, 100 ms ahead, 30 ms ahead → after a position update the clock equals `5 000 + P`.
  - Paused inside the span: a report sets the time and the clock stays paused. Narrated pause: in step at 20 000, both paused, source +10 min, a position update at the same position, played, "started playing" at the same position → moved ≤ 50 ms.
  - Buffering: "waiting" at 20 000 → source +3 000 → still 20 000, status buffering; "started playing" at 15 000 → continues from 20 000, status playing; a position update or "finished seeking" during buffering moves the time and it stays stopped; paused during buffering → status paused, played → buffering until "started playing"; a seek inside the span during buffering → the target, still stopped; a seek to the lead-in, a restart, and a report at position `D` during buffering → the clock runs again (with narration ending at the story's end: the report at `D` finishes the story, listener once); with narration from 0, a restart during buffering → time 0, status still buffering, and it runs after "started playing".
  - Limits of a report: position −5 → time 5 000; position `D` + 1 000 → time 60 000.
  - Expected narration position: none at 4 999, 0 at 5 000, 25 000 at 30 000, none at 60 000 and after; none for a story without narration.
  - Seek: playing at 10 000, seek to 30 000 → expected position 25 000; the simulated narration seeks there exactly, and 40 ms off, and reports "finished seeking" → clock and narration differ by ≤ 100 ms (0), also after +1 000 ms.
  - Outside the span: reports after 60 000 and on a finished clock change nothing; a story without narration ignores every report; with narration from 0 a report counts at time 0; a narration that never reports → the clock runs through the span to the end.
  - Reference story (`tests/fixtures/stories/the-chair-by-the-window.json`, read with `parseStory`), fake timers on: play with the simulated narration from start to end → scene index changes at 15 000 and 40 000, the listener is called once at 65 000, `vi.getTimerCount()` is 0.
  Files: `packages/story-runtime/src/clock.ts`, `packages/story-runtime/src/timeline.ts`, `packages/story-runtime/src/index.ts`, `tests/story-runtime/narration.test.ts`, `tests/story-runtime/simulated-narration.ts`
  FR-010–FR-014 · SC-003 · AC-07 (seek ≤ 100 ms), AC-13
