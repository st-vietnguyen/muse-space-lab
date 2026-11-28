# Plan 003 — `story-clock`

Spec: [spec.md](./spec.md) · Feature lane: reviewed by the agent `reviewer` (see the "Review log" in [notes.md](./notes.md)) · Narrowed on 2026-11-28 to the position and the clock without narration (owner's decision, `notes.md`); following the narration is issue #41.

## Approach

A new package `packages/story-runtime` (HLD §10) gets its first two modules, both plain TypeScript with no DOM, no global and no library: the position in a story as a pure function, and the master clock as a small state machine that reads a time source passed in by its creator. Tests live in `tests/story-runtime/` and drive the clock with a number they set.

| Need | Choice | Why |
|---|---|---|
| Position (FR-001, FR-002) | `positionAt(story, timeMs)` in `src/timeline.ts`, built on `sceneStartsMs` and `totalDurationMs` of `@musespace/story-schema` | Scene starts and the length have one home (002 FR-008); the player and the clock call the same function |
| Clock (FR-003–FR-010) | `createStoryClock(story, now)` in `src/clock.ts`; `now: () => number` is required | No global is read and no line exists that only a browser would run (trial: a default `() => performance.now()` shows as an uncovered branch in `pnpm test:coverage`) |
| No timers (FR-003) | The clock never calls `setTimeout`, `setInterval` or `requestAnimationFrame`; it computes its time when read or commanded | CLAUDE.md §3 rule 8. Tests prove it with Vitest fake timers: `vi.getTimerCount()` stays 0 over a whole run (trial) |
| End of the story (FR-009) | `onFinished(listener)` returns a function that removes the listener | The runtime only reports events (CLAUDE.md §3 rule 7); the player removes its listener when a story closes |
| Narration (FR-010) | The clock does not read `story.narration` | Following the narration is issue #41; until then every story plays on the time source |
| Package entry | `package.json` `"exports": { ".": "./src/index.ts" }`, no build step; `src/index.ts` re-exports the two modules | Same `exports` field as `story-schema` (002), which also ships its TypeScript source without a build step |

### Public API (`src/index.ts`)

```ts
type Position = { timeMs: number; sceneIndex: number; sceneId: string; sceneProgress: number; storyProgress: number };
function positionAt(story: Story, timeMs: number): Position;

type ClockStatus = "paused" | "playing" | "finished";
type Reading = Position & { status: ClockStatus };
type StoryClock = {
  read(): Reading;
  play(): void;
  pause(): void;
  seek(timeMs: number): void;
  restart(): void;
  onFinished(listener: () => void): () => void;
};
function createStoryClock(story: Story, now: () => number): StoryClock;
```

`Story` is the type of `@musespace/story-schema`. `sceneIndex` counts from 0. Issue #41 adds the narration reports, the `buffering` status and the narration's expected position to this API.

### Clock state

- The clock keeps: `playing`, `finished` and one anchor: a story time and the time-source value at which it held.
- It **advances** when it is playing and not finished. Its time is then `anchor time + (now() − anchor source value)`, otherwise the anchor time. A read never moves the anchor, so readings do not add up rounding errors.
- Every read and command first brings the clock up to date: if the computed time has reached the length, the clock finishes (time = length, listeners called once, after the state is set) before the command is applied.
- Setting the time (seek, restart) limits it to 0…length, moves the anchor to "now", and finishes the clock when the new time is the length.
- Status: `finished` if finished; else `playing` if playing; else `paused`.

| Input | Effect |
|---|---|
| `play` | finished or playing: nothing. Paused: playing, anchor source value = now |
| `pause` | finished or paused: nothing. Else: anchor at the current time, paused |
| `seek(t)` | not a number: nothing. Finished and `t` < length: paused. Then set the time |
| `restart` | not finished, playing, set the time to 0 |

### Tests

- `tests/story-runtime/*.test.ts`, importing `../../packages/story-runtime/src/index.js` (trial: an import by package name from `tests/` does not typecheck, because the root package does not depend on the workspace packages; 002 does the same).
- `tests/story-runtime/stories.ts`: the reference timing (15/25/25 s) with and without narration and a single-scene story, each read through `parseStory`, so the tests use real `Story` values. (It also holds two narration variants written for the first scope; see `notes.md`.)
- Time is a variable the test sets; no test waits. The limit appears as written: `≤ 50` after a 10-minute pause.

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

None outside `specs/003-story-clock/`. HLD §6.5, §10 and §13.1 already describe this feature; the plan does not differ from them. The roadmap row for issue #41 is the owner's change (`notes.md`, "Outside this feature").

## Expected size

2 tasks; 7 files besides the spec documents and the lockfile; 739 hand-written lines as built (about 680 when the owner decided the split):

| Part | Files | Lines |
|---|---|---|
| T001 position (done) | `package.json` 11, `index.ts` 1, `timeline.ts` 26, `stories.ts` 41, `timeline.test.ts` 78 | 157 |
| T002 clock (done) | `clock.ts` 93, `index.ts` +1, `clock.test.ts` 488 | 582 (about 520 expected; the rest is the FR-010 test, the tests the reviews asked for and the fix of the code review) |

That is over the size rule of `docs/ROADMAP.md` (about 400 lines). The owner accepted about 600 lines on 2026-11-28 and, when the tests of T002 came out three times larger than planned, decided to end this feature after T002 (about 680 lines) and move the narration to issue #41 (`notes.md`, "Owner's answers").
