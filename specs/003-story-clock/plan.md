# Plan 003 — `story-clock`

Spec: [spec.md](./spec.md) · Feature lane: reviewed by the agent `reviewer` (see the "Review log" in [notes.md](./notes.md))

## Approach

A new package `packages/story-runtime` (HLD §10) gets its first two modules, both plain TypeScript with no DOM, no global and no library: the position in a story as a pure function, and the master clock as a small state machine that reads a time source passed in by its creator. Tests live in `tests/story-runtime/` and drive the clock with a number they set and with a simulated narration.

| Need | Choice | Why |
|---|---|---|
| Position (FR-001, FR-002) | `positionAt(story, timeMs)` in `src/timeline.ts`, built on `sceneStartsMs` and `totalDurationMs` of `@musespace/story-schema` | Scene starts and the length have one home (002 FR-008); the player and the clock call the same function |
| Narration's expected position (FR-013) and the span test | `narrationMsAt(story, timeMs)` in `src/timeline.ts`: `timeMs − startAtMs` inside the span, otherwise `undefined` | One pure function answers both "where should the narration be" and "is this time inside the span" |
| Clock (FR-003–FR-012, FR-014) | `createStoryClock(story, now)` in `src/clock.ts`; `now: () => number` is required | No global is read and no line exists that only a browser would run (trial: a default `() => performance.now()` shows as an uncovered branch in `pnpm test:coverage`) |
| No timers (FR-003) | The clock never calls `setTimeout`, `setInterval` or `requestAnimationFrame`; it computes its time when read or commanded | CLAUDE.md §3 rule 8. Tests prove it with Vitest fake timers: `vi.getTimerCount()` stays 0 over a whole run (trial) |
| End of the story (FR-009) | `onFinished(listener)` returns a function that removes the listener | The runtime only reports events (CLAUDE.md §3 rule 7); the player removes its listener when a story closes |
| Package entry | `package.json` `"exports": { ".": "./src/index.ts" }`, no build step; `src/index.ts` re-exports the two modules | Same `exports` field as `story-schema` (002), which also ships its TypeScript source without a build step |

### Public API (`src/index.ts`)

```ts
type Position = { timeMs: number; sceneIndex: number; sceneId: string; sceneProgress: number; storyProgress: number };
function positionAt(story: Story, timeMs: number): Position;
function narrationMsAt(story: Story, timeMs: number): number | undefined;

type ClockStatus = "paused" | "playing" | "buffering" | "finished";
type NarrationReport = { type: "playing" | "seeked" | "timeupdate"; positionMs: number } | { type: "waiting" };
type Reading = Position & { status: ClockStatus; narrationMs?: number };
type StoryClock = {
  read(): Reading;
  play(): void;
  pause(): void;
  seek(timeMs: number): void;
  restart(): void;
  report(report: NarrationReport): void;
  onFinished(listener: () => void): () => void;
};
function createStoryClock(story: Story, now: () => number): StoryClock;
```

`Story` is the type of `@musespace/story-schema`. `sceneIndex` counts from 0. The report types carry the names of the audio events of HLD §6.5, so 005 passes them through.

### Clock state

- The clock keeps: `playing`, `finished`, `stalled` (the narration is waiting for data) and one anchor: a story time and the time-source value at which it held.
- It **advances** when it is playing, not finished, and not (`stalled` and inside the span). Its time is then `anchor time + (now() − anchor source value)`, otherwise the anchor time. A read never moves the anchor, so readings do not add up rounding errors.
- Every read, command and report first brings the clock up to date: if the computed time has reached the length, the clock finishes (time = length, listeners called once, after the state is set) before the command or report is applied.
- Setting the time (seek, restart, report) limits it to 0…length, moves the anchor to "now", clears `stalled` when the new time is outside the span, and finishes the clock when the new time is the length.
- Status: `finished` if finished; else `paused` if not playing; else `buffering` if `stalled` (it is then inside the span); else `playing`.

| Input | Effect |
|---|---|
| `play` | finished or playing: nothing. Paused: playing, anchor source value = now |
| `pause` | finished or paused: nothing. Else: anchor at the current time, paused |
| `seek(t)` | not a number: nothing. Finished and `t` < length: paused. Then set the time |
| `restart` | not finished, playing, set the time to 0. `stalled` is cleared like for any time set outside the span, so it survives only when the narration starts at 0 (FR-008) |
| report `playing` / `seeked` / `timeupdate` with `P` | no narration, finished, or current time outside the span: nothing. Else: `playing` clears `stalled`; set the time to `startAtMs + P`, `P` limited to 0…`durationMs` |
| report `waiting` | same guard. Else: anchor at the current time, `stalled` |

### Tests

- `tests/story-runtime/*.test.ts`, importing `../../packages/story-runtime/src/index.js` (trial: an import by package name from `tests/` does not typecheck, because the root package does not depend on the workspace packages; 002 does the same).
- `tests/story-runtime/stories.ts`: the reference timing (15/25/25 s, narration 5 000 + 55 000 ms) and small variants (single scene, no narration, narration from 0, narration ending with the story), each read through `parseStory`, so the tests use real `Story` values.
- `tests/story-runtime/simulated-narration.ts`: a narration that keeps its own position against the same simulated time, can start, wait for data, resume, seek (exactly or a few ms off) and fall behind, and sends the reports to the clock.
- Time is a variable the test sets; no test waits. The limits appear as written: `≤ 50` after a 10-minute pause, `≤ 100` after a seek, a difference of `101` corrected by the next report.
- The run of the reference story reads `tests/fixtures/stories/the-chair-by-the-window.json` through `parseStory`.

## Dependencies

No new package from the registry. `packages/story-runtime/package.json` depends on `@musespace/story-schema` with `workspace:*`: our own package, the arrow runtime → schema of HLD §10. `pnpm-lock.yaml` gains the six lines of the new importer (trial); nothing is downloaded. GSAP is not used: the timeline logic does not depend on it (HLD §11); 004 adds it.

## Checked against reality (trial of 2026-11-28, scratchpad copy of the repo with its `pnpm-workspace.yaml` and `.npmrc`)

- `pnpm install` with the new package: only the lockfile lines above change; `pnpm install --frozen-lockfile` passes afterwards.
- `packages/story-runtime/src/index.ts` importing `@musespace/story-schema` by name: `tsc` (the repo's single program), Vitest 5.0.5 and dependency-cruiser resolve it through the workspace link and the `exports` field.
- `pnpm lint` passes with the package present: the existing rules `runtime-no-engine`, `runtime-no-backend` and the network-globals rule already name `packages/story-runtime/`. No config changes.
- `vi.useFakeTimers()` with `vi.getTimerCount()` works in the repo's Vitest setup.
- `pnpm test:coverage` reports `packages/story-runtime/src/**`.

## CLAUDE.md §3

Rule 1: this is the one runtime; nothing here is specific to the player or the preview. Rule 2: nothing from the story is executed. Rule 7: no API, no gallery; only the end event. Rule 8: no timers (FR-003, tested). Rules 3–6: no Supabase, database or network; the modules are pure although `story-runtime` as a whole is not on the pure list.

## Docs touched

None outside `specs/003-story-clock/`. HLD §6.5, §10 and §13.1 already describe this feature; the plan does not differ from them.

## Expected size

3 tasks; 9 files besides the spec documents and the lockfile. Counted per file, about 600 hand-written lines:

| Part | Files | Lines (about) |
|---|---|---|
| T001 position | `package.json` 11, `index.ts` 2, `timeline.ts` 30, `stories.ts` 30, `timeline.test.ts` 50 | 125 |
| T002 clock without narration | `clock.ts` 80, `clock.test.ts` 140 | 220 |
| T003 narration | `clock.ts` +35, `timeline.ts` +8, `simulated-narration.ts` 40, `narration.test.ts` 180 | 265 |

That is over the size rule of `docs/ROADMAP.md` (about 400 lines); tasks and files are within it. The owner decided on 2026-11-28 to keep it as one feature and accept about 600 lines (hand-over on issue #16; the answer is in `notes.md`). If the work grows clearly past this estimate, that is handed over again.
