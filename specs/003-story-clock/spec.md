# Spec 003 — `story-clock`

**Issue:** #16 · **Phase:** B · **Status:** Reviewed (2026-11-28); narrowed by the owner's decision of 2026-11-28 (see "Clarifications")

## Context

A story keeps its images, captions and narration in step only if every part reads the same time. This feature builds that time: where the story is at any moment (scene, progress), and one master clock that can be played, paused, sought and restarted and reports the end. It builds on the story format of 002 and is pure logic, proven with a simulated time source before anything is drawn. The player (004) draws from this clock. Following the narration (lead-in, re-anchoring, buffering, drift) was split off into its own feature (issue #41), which the narration of 005 needs.

**Sources:** ROADMAP 003 · HLD §6.5 (timeline synchronization), §8.2 (scene times are computed), §10 (`story-runtime` contents, dependency direction), §13.1 (`story-runtime` tests) · CLAUDE.md §3 rules 1, 7, 8 and §4 (test-first for the pure timeline) · AC-07 (pause ≤ 50 ms; the limit after a seek belongs to issue #41, "after close" to 005), AC-13 · ADR-004 · no related OQ.

Terms used below: **length** is the story's total duration. **Time source** is the running time the clock's creator provides (in a browser, the page's high-resolution time; in tests, a number the test sets).

## User scenarios

US1, US2 and US4 match the issue's stories "Know where the story is", "Pause, resume and restart" and "Prove it without a browser"; the issue's "Follow the narration" (US3 of the first spec) moved to issue #41. The examples use the reference timing: scenes of 15 s, 25 s and 25 s (length 65 000 ms).

### US1 — Know where the story is (P1)

A developer asks the clock which scene is playing and how far into it, so every part of the player shows the same moment.

**Independent test:** for a story and any time, the position (scene, scene progress, story progress) is computed without a clock; a clock that is played, sought and run to the end gives the same positions and reports the end once.

**Acceptance scenarios:**

1. **Given** the reference timing, **When** the position is asked for 0, 14 999, 15 000, 27 500 and 65 000 ms, **Then** it is scene 1 at progress 0; scene 1 at 14 999/15 000; scene 2 at progress 0; scene 2 at progress 0.5 with story progress 27 500/65 000; scene 3 at progress 1 with story progress 1.
2. **Given** a clock playing at 10 000 ms, **When** it is sought to 50 000 ms, **Then** its time is 50 000 ms in scene 3. **When** it is sought to −1 ms, **Then** its time is 0. **When** it is sought to 70 000 ms, **Then** its time is 65 000 ms and it is finished.
3. **Given** a clock playing at 64 000 ms and a listener for the end, **When** the time source moves on 5 000 ms and the clock is read twice, **Then** both readings say finished at exactly 65 000 ms and the listener was called once.

### US2 — Pause, resume and restart (P1)

A Visitor pauses for as long as they like and continues from the same point.

**Independent test:** with a simulated time source, a pause of any length moves the position by 0 ms (limit 50 ms); restart returns to the start.

**Acceptance scenarios:**

1. **Given** a clock playing at 12 345 ms, **When** it is paused, the time source moves on 10 minutes and it is played again, **Then** its time is within 50 ms of 12 345 ms (exactly 12 345 ms), and 1 000 ms later it is 13 345 ms.
2. **Given** a clock that is playing, paused or finished, **When** it is restarted, **Then** its time is 0 and it is playing.

### US4 — Prove it without a browser (P1)

The owner trusts the timing rules before anything is drawn.

**Independent test:** the whole test suite of this feature runs without a browser or real waiting.

**Acceptance scenarios:**

1. **Given** the tests of US1 and US2, **Then** each uses a simulated time source and asserts the limit of 50 ms as written in AC-07.
2. **Given** a story played from start to end in a simulated run in which every timer would be recorded, **Then** no timer was scheduled, the scene changes at 15 000 ms and 40 000 ms, and the end is reported once at 65 000 ms.

## Edge cases

- A time exactly on a scene boundary belongs to the scene that starts there; the story's last instant belongs to the last scene, at progress 1.
- A single-scene story: scene 1 from 0 to the end.
- Seek below 0 or to −∞: time 0. Seek past the end or to +∞: the end, finished. Seek to "not a number": ignored, time and state unchanged.
- `play` on a playing clock and `pause` on a paused clock change nothing; in particular they do not shift the time.
- Readings far apart (a tab in the background): the time reflects the time source; nothing was scheduled, so nothing is missed. If the end passed between two readings, the next one says finished at exactly the length and the end is reported then, once. A command that arrives first after the end passed finds the clock finished: the end is reported before the command is applied.
- A finished clock: `play` and `pause` do nothing; a seek to an earlier time leaves it paused there; a seek to the end again does not report the end again; restart plays from 0, and reaching the end again reports it again, once.
- A removed listener is not called.
- A story with narration: in this feature the clock runs on the time source from start to end, exactly as for a story without narration.

## Functional requirements

Position in the story:

- **FR-001** For a story and a time, the runtime MUST give the time limited to 0…length, the current scene (its place in the story and its id), the progress within that scene and the progress through the story, both as fractions from 0 to 1. The result depends only on the story and the time.
- **FR-002** A scene MUST be current from its start (included) to its end (excluded); at the story's end the last scene is current with scene progress 1 and story progress 1. Scene starts and the length are computed from the scene durations as in 002, never stored.

The clock:

- **FR-003** The clock MUST take its time only from the time source its creator provides, compute its time only when it is read or commanded, and MUST NOT schedule any timer or callback of its own.
- **FR-004** A new clock MUST be paused at time 0. A reading MUST give the status (paused, playing or finished) and the position of FR-001 for the clock's time.
- **FR-005** While the status is playing, the clock's time MUST advance by exactly as much as the time source advances. `play` on a playing clock MUST NOT change its time.
- **FR-006** `pause` MUST stop the time; while paused the time MUST NOT change by itself, however long the pause; `play` MUST continue from the paused time. Pause and resume together move the position by 0 ms (limit: 50 ms, AC-07).
- **FR-007** A seek MUST set the time to the target limited to 0…length and keep the clock playing or paused as it was. A target that is not a number MUST be ignored.
- **FR-008** Restart MUST set the time to 0 and the status to playing, from any state.
- **FR-009** When the clock's time reaches the length (by running or by a seek), the clock MUST become finished, its time MUST stay at exactly the length, and every listener for the end MUST be called exactly once for that arrival. The clock MUST never give a time beyond the length. A finished clock ignores `play` and `pause`; a seek to an earlier time leaves it paused there; a restart plays from 0. A listener can be removed and is then not called.
- **FR-010** The clock MUST run on the time source alone for every story: a story's narration does not change the clock's time or status in this feature.

## Key entities

- **Position**: time, scene (index and id), scene progress, story progress. Derived from a story and a time; never stored.
- **Clock**: status (paused, playing, finished) and time; changed only by its commands (play, pause, seek, restart) and by the time source moving on.

## Success criteria

- **SC-001** Every FR and every edge case above has an automated test that runs with a simulated time source, without a browser or real waiting, and was written before the code (AC-13).
- **SC-002** The tests assert the AC-07 limit as written: position moved ≤ 50 ms after a pause of 10 minutes.
- **SC-003** A story plays from start to end in a simulated run: scene changes at 15 000 ms and 40 000 ms, the end reported once at 65 000 ms, no timer scheduled.
- **SC-004** `pnpm lint` (with the boundary rules for `story-runtime`), `pnpm typecheck` and `pnpm test` pass; the files of this feature have no line or branch that no test runs.

## Constraints and decisions

- One master clock; animation, overlays, captions and audio all read it. No chains of timers to drive the story (CLAUDE.md §3 rule 8, HLD §6.5).
- The same runtime serves the player and the editor preview (CLAUDE.md §3 rule 1, ADR-004); this feature is its first part.
- The runtime never calls the API and never controls the gallery; it only reports events to its listeners (CLAUDE.md §3 rule 7).
- The timeline logic does not depend on the animation library (HLD §11) and is unit-tested with a fake clock (HLD §6.5, §13.1); tests are written first (CLAUDE.md §4).
- Scene start times and the length come from the scene durations (HLD §8.2, 002 FR-008). The clock takes a story that 002's reading has accepted and does not validate it again.
- Limit: 50 ms after pause (AC-07).

## Assumptions

- A new clock is paused at 0; the player decides when to play.
- Restart means "play from the start", also when paused or finished.
- A seek keeps playing or paused; a finished clock sought back is paused, and `play` on a finished clock does nothing (the player offers restart).
- A seek to the end finishes the story also while paused.
- Progress is a fraction from 0 to 1; times are milliseconds and may be fractional, as the time source gives them.
- The clock's creator provides the time source; there is no built-in default.

## Out of scope

- Following the narration: the lead-in, re-anchoring to the narration's position, stopping while it buffers, the 100 ms drift rule, clock and narration within 100 ms after a seek, the narration's expected position, and the simulated run of the reference story with its narration (issue #41).
- Drawing, animation and the player controls (004); the focus fit of HLD §6.6 (004).
- The real narration: starting, pausing and seeking the audio, volume and mute, and the check on real browsers (005).
- Stopping all sound within 200 ms after a story closes (AC-07, third limit; 005). The clock holds no timer or resource, so closing needs nothing from it.
- Ambient audio, Atmosphere events, Static Mode (MVP-1); Reduced Motion (005, 007).
- Events other than the end (for example "scene changed"): readers derive them from the reading.

## Mapping to the issue's criteria

| Issue criterion | Covered by |
|---|---|
| Current scene, progress within it, overall progress at any time | FR-001, FR-002, FR-004 · US1 scenario 1 |
| Seek to any time, across scenes; stops at the start or the end | FR-007, FR-009 · US1 scenario 2 |
| End reached: finished once, stops | FR-009 · US1 scenario 3 |
| Pause of any length, resume within 50 ms | FR-006 · US2 scenario 1 |
| Restart goes back to the start | FR-008 · US2 scenario 2 |
| Before the narration starts the clock runs on its own | Moved to issue #41. Here the clock runs on its own for the whole story (FR-010) |
| Follows the narration's position, smooth between its updates | Moved to issue #41 |
| Narration stops to load: the clock stops, continues with it | Moved to issue #41 |
| More than 100 ms apart: the clock jumps to the narration's position | Moved to issue #41 |
| After a seek, clock and narration within 100 ms | Moved to issue #41 |
| Every rule tested with simulated clock and narration, exact limits, before the code | SC-001, SC-002 · US4 scenario 1, for the rules of this feature (simulated clock, 50 ms); the narration rules and the 100 ms limit: issue #41 |
| Never driven by chains of timers; everything reads the one clock | FR-003 · SC-003 · US4 scenario 2 |

## Clarifications

- **2026-11-28, size.** The plan first estimated 400–450 hand-written lines, then about 600; the owner accepted about 600 in one feature (hand-over on issue #16).
- **2026-11-28, split.** The tests of the clock alone came out three times larger than planned, heading for about 1 200 lines. The owner decided to split now: this feature ends with the clock without narration, and following the narration is a new feature (issue #41). Both answers are recorded in `notes.md`.
