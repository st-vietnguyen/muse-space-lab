# Spec 003 — `story-clock`

**Issue:** #16 · **Phase:** B · **Status:** Reviewed (2026-11-28)

## Context

A story keeps its images, captions and narration in step only if every part reads the same time. This feature builds that time: where the story is at any moment (scene, progress), and one master clock that can be played, paused, sought and restarted, follows the narration while it plays, and reports the end. It builds on the story format of 002 and is pure logic, proven with a simulated time source and simulated narration before anything is drawn. The player (004) draws from this clock; the narration (005) is wired to it and checked in real browsers.

**Sources:** ROADMAP 003 · HLD §6.5 (timeline synchronization), §8.2 (scene times are computed, narration `startAtMs`/`durationMs`), §10 (`story-runtime` contents, dependency direction), §13.1 (`story-runtime` tests) · CLAUDE.md §3 rules 1, 7, 8 and §4 (test-first for the pure timeline) · AC-07 (pause ≤ 50 ms, seek ≤ 100 ms; "after close" belongs to 005), AC-13 · ADR-004, ADR-010 · no related OQ.

Terms used below: **length** is the story's total duration. **Time source** is the running time the clock's creator provides (in a browser, the page's high-resolution time; in tests, a number the test sets). For a story with narration starting at `S` and lasting `D`, the **narration span** is every time `t` with `S ≤ t < S + D`. A **report** is what the player tells the clock about the narration: it _started playing_, _finished seeking_ or sent a _position update_ (HLD §6.5: `playing`, `seeked`, `timeupdate`), each with the narration's position `P` in ms, or it is _waiting for data_ (buffering).

## User scenarios

US1–US4 match the issue's four stories, in order. The examples use the reference timing: scenes of 15 s, 25 s and 25 s (length 65 000 ms), narration from 5 000 ms lasting 55 000 ms.

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
2. **Given** a clock that is playing, paused or finished, **When** it is restarted, **Then** its time is 0 and it is playing (for the one exception, buffering with narration from 0, see FR-008).

### US3 — Follow the narration (P1)

A Visitor hears narration that matches what they see.

**Independent test:** with a simulated narration that reports its position, the clock runs alone before the narration, takes the narration's position on every report, moves with the time source between reports, stops while the narration waits for data, and after a seek is within 100 ms of the narration.

**Acceptance scenarios:**

1. **Given** a clock played from 0, **When** the time source moves on 4 999 ms, **Then** its time is 4 999 ms; a report received then does not change it.
2. **Given** the clock at 5 080 ms, **When** the narration reports it started playing at position 0, **Then** the time is 5 000 ms; 250 ms later it is 5 250 ms; a position update of 250 ms then leaves it at 5 250 ms.
3. **Given** the clock playing at 20 000 ms, **When** the narration reports it is waiting for data and the time source moves on 3 000 ms, **Then** the time is still 20 000 ms and the status is buffering. **When** the narration reports it started playing at position 15 000 ms, **Then** the clock continues from 20 000 ms.
4. **Given** the clock 101 ms ahead of the narration (and likewise 5 000 ms ahead, or 101 ms behind), **When** the narration sends a position update, **Then** the clock's time equals the narration's position plus 5 000 ms.
5. **Given** the clock playing at 10 000 ms, **When** it is sought to 30 000 ms, **Then** the narration's expected position is 25 000 ms. **When** the narration reports it finished seeking at 25 000 ms (or at 25 040 ms), **Then** clock and narration differ by no more than 100 ms (by 0 ms), also 1 000 ms later.

### US4 — Prove it without a browser (P1)

The owner trusts the timing rules before anything is drawn.

**Independent test:** the whole test suite of this feature runs without a browser, real audio or real waiting.

**Acceptance scenarios:**

1. **Given** the tests of US1–US3, **Then** each uses a simulated time source and, for US3, a simulated narration, and asserts the limits 50 ms and 100 ms as written in AC-07.
2. **Given** the reference story played from start to end in a simulated run in which every timer would be recorded, **Then** no timer was scheduled, the scene changes at 15 000 ms and 40 000 ms, and the end is reported once at 65 000 ms.

## Edge cases

- A time exactly on a scene boundary belongs to the scene that starts there; the story's last instant belongs to the last scene, at progress 1.
- A single-scene story: scene 1 from 0 to the end.
- Seek below 0 or to −∞: time 0. Seek past the end or to +∞: the end, finished. Seek to "not a number": ignored, time and state unchanged.
- `play` on a playing clock and `pause` on a paused clock change nothing; in particular they do not shift the time.
- Readings far apart (a tab in the background): the time reflects the time source; nothing was scheduled, so nothing is missed. If the end passed between two readings, the next one says finished at exactly the length and the end is reported then, once.
- A finished clock: `play` and `pause` do nothing; a seek to an earlier time leaves it paused there; a seek to the end again does not report the end again; restart plays from 0, and reaching the end again reports it again, once.
- A removed listener is not called.
- A story without narration: the clock runs on the time source from start to end; reports are ignored.
- Narration starting at 0: there is no lead-in; reports count from the start. Narration ending exactly at the story's end: a report at position `D` finishes the story.
- A report while the clock's time is outside the narration span, or the clock is finished: ignored (for example a "finished seeking at 0" that arrives after the Visitor sought back into the lead-in).
- A report with a position below 0 or above `D`: the position is limited to 0…`D`.
- A report while paused inside the span: the time takes the narration's position and the clock stays paused.
- The narration never reports (it failed to start): the clock runs on the time source through the span; the story is not blocked.
- Paused while buffering, then played: still buffering until the narration reports it started playing.
- Restart while buffering in a story whose narration starts at 0: time 0 is inside the span, so the clock is at 0 and still buffering until the narration reports it started playing (the same rule as a seek inside the span).
- A seek inside the span while buffering: the time moves to the target and stays stopped until the narration reports it started playing. A seek or restart to a time outside the span while buffering, or a report at position `D`: buffering ends and the clock runs (or finishes, when that time is the story's end).
- The narration waits for data and never recovers: the clock stays stopped until a seek or restart takes it outside the span. What the player shows then belongs to 005.

## Functional requirements

Position in the story:

- **FR-001** For a story and a time, the runtime MUST give the time limited to 0…length, the current scene (its place in the story and its id), the progress within that scene and the progress through the story, both as fractions from 0 to 1. The result depends only on the story and the time.
- **FR-002** A scene MUST be current from its start (included) to its end (excluded); at the story's end the last scene is current with scene progress 1 and story progress 1. Scene starts and the length are computed from the scene durations as in 002, never stored.

The clock:

- **FR-003** The clock MUST take its time only from the time source its creator provides, compute its time only when it is read or commanded, and MUST NOT schedule any timer or callback of its own.
- **FR-004** A new clock MUST be paused at time 0. A reading MUST give the status (paused, playing, buffering or finished), the position of FR-001 for the clock's time and the narration's expected position (FR-013).
- **FR-005** While the status is playing, the clock's time MUST advance by exactly as much as the time source advances. `play` on a playing clock MUST NOT change its time.
- **FR-006** `pause` MUST stop the time; while paused the time MUST NOT change by itself, however long the pause; `play` MUST continue from the paused time. Pause and resume together move the position by 0 ms (limit: 50 ms, AC-07).
- **FR-007** A seek MUST set the time to the target limited to 0…length and keep the clock playing or paused as it was. A target that is not a number MUST be ignored.
- **FR-008** Restart MUST set the time to 0 and start playing, from any state: the clock is then neither paused nor finished. Its status is playing, except that a clock that was buffering stays buffering when time 0 is inside the narration span (narration starting at 0, FR-012).
- **FR-009** When the clock's time reaches the length (by running, by a seek or by a report), the clock MUST become finished, its time MUST stay at exactly the length, and every listener for the end MUST be called exactly once for that arrival. The clock MUST never give a time beyond the length. A finished clock ignores `play` and `pause`; a seek to an earlier time leaves it paused there; a restart plays from 0. A listener can be removed and is then not called.

Narration (stories with narration; `S`, `D`, span and reports as defined under Context):

- **FR-010** Outside the narration span (before `S`, from `S + D` on) and in a story without narration, the clock MUST run on the time source alone and MUST ignore every report. A finished clock ignores every report.
- **FR-011** Inside the span, a report that the narration started playing, finished seeking or sent a position update MUST set the clock's time to `S + P` (`P` limited to 0…`D`), whether the clock is playing, buffering or paused, and without changing a paused clock to playing. Between reports, a playing clock advances with the time source from that time (FR-005).
- **FR-012** Inside the span, a report that the narration is waiting for data MUST stop the clock's time (status buffering while it would otherwise be playing) until a report that the narration started playing, from which it continues at `S + P`. Buffering MUST also end when the clock's time leaves the span (a seek or restart to a time outside it, or a report at position `D`); a seek inside the span MUST NOT end it.
- **FR-013** A reading MUST give the narration's expected position: inside the span the clock's time minus `S`, outside it none. After a seek to a time `t` inside the span it is exactly `t − S`, and once the narration reports it finished seeking, clock and narration differ by 0 ms (limit: 100 ms, AC-07).
- **FR-014** After every position report of FR-011 the difference between the clock and the narration MUST be 0 ms. So when clock and narration are more than 100 ms apart, the next report moves the clock to the narration's position (HLD §6.5); a smaller difference is corrected the same way.

## Key entities

- **Position**: time, scene (index and id), scene progress, story progress. Derived from a story and a time; never stored.
- **Clock**: status (paused, playing, buffering, finished) and time; changed only by its commands (play, pause, seek, restart), by reports and by the time source moving on.
- **Report**: started playing, finished seeking or position update, each with the narration's position; or waiting for data.

## Success criteria

- **SC-001** Every FR and every edge case above has an automated test that runs with a simulated time source (and simulated narration for FR-010–FR-014), without a browser, real audio or real waiting, and was written before the code (AC-13).
- **SC-002** The tests assert the AC-07 limits as written: position moved ≤ 50 ms after a pause of 10 minutes; clock and narration ≤ 100 ms apart after a seek; a difference of 101 ms corrected by the next report.
- **SC-003** The reference story (`The Chair by the Window`, 002) plays from start to end in a simulated run: scene changes at 15 000 ms and 40 000 ms, the end reported once at 65 000 ms, no timer scheduled.
- **SC-004** `pnpm lint` (with the boundary rules for `story-runtime`), `pnpm typecheck` and `pnpm test` pass; the files of this feature have no line or branch that no test runs.

## Constraints and decisions

- One master clock; animation, overlays, captions and audio all read it. No chains of timers to drive the story (CLAUDE.md §3 rule 8, HLD §6.5).
- The same runtime serves the player and the editor preview (CLAUDE.md §3 rule 1, ADR-004); this feature is its first part.
- The runtime never calls the API and never controls the gallery; it only reports events to its listeners (CLAUDE.md §3 rule 7).
- The timeline logic does not depend on the animation library (HLD §11) and is unit-tested with a fake clock (HLD §6.5, §13.1); tests are written first (CLAUDE.md §4).
- Scene start times and the length come from the scene durations (HLD §8.2, 002 FR-008). The clock takes a story that 002's reading has accepted and does not validate it again.
- At most one narration track; its time in the story is `startAtMs + position` (ADR-010, HLD §6.5).
- Limits: 50 ms after pause, 100 ms after seek (AC-07); 100 ms drift (HLD §6.5).

## Assumptions

- Every position report re-anchors the clock, as HLD §6.5 lists the three events; the "drift over 100 ms" rule of HLD §6.5 is then the guaranteed result of FR-011, not a second mechanism. If the browser check of 005 shows that re-anchoring on small differences is visible, re-anchoring position updates only above 100 ms is the alternative; that would be a change to this spec and the HLD.
- A new clock is paused at 0; the player decides when to play.
- Restart means "play from the start", also when paused or finished.
- A seek keeps playing or paused; a finished clock sought back is paused, and `play` on a finished clock does nothing (the player offers restart).
- A seek to the end finishes the story also while paused.
- Progress is a fraction from 0 to 1; times are milliseconds and may be fractional, as the time source gives them.
- The clock's creator provides the time source; there is no built-in default.

## Out of scope

- Drawing, animation and the player controls (004); the focus fit of HLD §6.6 (004).
- The real narration: starting, pausing and seeking the audio, volume and mute, what to show when it fails or never recovers, and the check on real browsers (005).
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
| Before the narration starts the clock runs on its own | FR-010 · US3 scenario 1 |
| Follows the narration's position, smooth between its updates | FR-011, FR-005 · US3 scenario 2 |
| Narration stops to load: the clock stops, continues with it | FR-012 · US3 scenario 3 |
| More than 100 ms apart: the clock jumps to the narration's position | FR-014 · US3 scenario 4 |
| After a seek, clock and narration within 100 ms | FR-013, FR-011 · US3 scenario 5 |
| Every rule tested with simulated clock and narration, exact limits, before the code | SC-001, SC-002 · US4 scenario 1 |
| Never driven by chains of timers; everything reads the one clock | FR-003 · SC-003 · US4 scenario 2 |

## Clarifications

None asked: the issue lists no open question.
