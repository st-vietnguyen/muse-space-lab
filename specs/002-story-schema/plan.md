# Plan 002 — `story-schema`

Spec: [spec.md](./spec.md) · Status: **approved by the owner 2026-11-23**

## Approach

A new pure package `packages/story-schema` holds one Zod schema for the current format, the timing functions and the list of upgrade steps. One entry point, `parseStory(input: unknown)`, upgrades the story and then validates it; every caller (runtime, editor, API, seed) reads stories through it. Tests live in `tests/story-schema/`, the reference story in `tests/fixtures/stories/`.

| Need | Choice | Why |
|---|---|---|
| Format and single-field rules (FR-001–FR-007, FR-010) | Zod 4 `z.strictObject` schemas; the effect is `z.discriminatedUnion("type", …)` | Zod is the validation library in HLD §11. Strict objects reject unknown fields (FR-010). The union rejects unknown effects and mismatched params. `z.infer` gives the TypeScript types, so types and rules cannot diverge |
| Rules across fields: total ≤ 5 min, narration end, transcript required, unique ids (FR-003, FR-006, FR-007, FR-009) | Plain functions on the typed result, run only after the schema passes | In the trial, a Zod refinement on the story also ran next to a scene's invalid duration, so it sees half-valid data. Checking after the fields are valid keeps these checks simple and unable to crash |
| Errors (FR-011) | Map each Zod issue to `StoryError { rule, path, scene?, message }`: `rule` from the issue's path (table below), `scene` `{ index, id }` from the input | One small mapping instead of a custom message on every field; `message` is Zod's English text, for developers |
| Timing (FR-008) | `sceneStartsMs(story)`, `totalDurationMs(story)` | Plain sums; the 5-minute check uses the same function |
| Versions (FR-001, FR-012–FR-014) | `migrate(input, steps = STEPS)` in `src/migrate.ts` | See "Upgrades" |
| Package entry | `package.json` `"exports": { ".": "./src/story.ts" }`, no build step | Workspace consumers import the TypeScript source. Trial: another workspace package imported `@musespace/story-schema` by name and `tsc` resolved it |

### Format (version 1)

```jsonc
{
  "schemaVersion": 1,
  "narration": { "assetId": "…", "startAtMs": 5000, "durationMs": 55000 }, // optional
  "transcript": "…", // optional; required and non-blank when narration is present
  "scenes": [ // 1–12 scenes, total ≤ 300 000 ms
    {
      "id": "…", "durationMs": 15000, "caption": "…", // caption optional, non-empty
      "effect": { "type": "cinematic-focus", "params": { "region": { "x": 0.4, "y": 0.35, "width": 0.3, "height": 0.4 } } }
    },
    { "id": "…", "durationMs": 25000, "effect": { "type": "memory-reveal", "params": { "assetId": "…", "placement": "beside" } } }, // "over" | "beside"
    { "id": "…", "durationMs": 25000, "effect": { "type": "final-reveal", "params": {} } }
  ]
}
```

- Scene ids and asset ids are non-empty strings. Times are integers (`z.int()`): durations > 0, `startAtMs` ≥ 0.
- Focus region: `x, y ≥ 0`; `width, height > 0`; `x + width ≤ 1` and `y + height ≤ 1`, with a 1e-9 tolerance for floating-point rounding.
- Every object is strict. A blank text is one with no non-space character; strings are never trimmed, so a valid story comes back exactly as given.

### Error rules

`StoryRule` is a closed string union:

| Rule | Raised when | Path |
|---|---|---|
| `schema-version` | version missing, not an integer, < 1 or > current | `schemaVersion` |
| `scene-count` | 0 or more than 12 scenes | `scenes` |
| `story-length` | total > 300 000 ms | `scenes` |
| `scene-id` | id missing, empty or repeated | `scenes[i].id` |
| `scene-duration` | duration missing, not an integer, or ≤ 0 | `scenes[i].durationMs` |
| `effect-unknown` | effect missing or of an unknown type | `scenes[i].effect`, `scenes[i].effect.type` |
| `effect-params` | params missing, with an extra field, or wrong | `scenes[i].effect.params…` |
| `focus-region` | region missing, zero-size or outside 0–1 | `scenes[i].effect.params.region…` |
| `narration` | a narration field is invalid, or narration ends after the story | `narration…` |
| `transcript` | narration without a non-blank transcript, or a blank transcript | `transcript` |
| `format` | anything else: not an object, an unknown field, a bad caption | as reported |

`scene` is `{ index, id }` whenever the path starts with `scenes[i]`; `id` is set only if that input scene has a string id. A repeated id is reported on the second scene.

### Upgrades

- `STEPS` is an array of pure functions; `STEPS[n]` turns a version n+1 story into version n+2. Today it is empty, so the current version is 1 (`STEPS.length + 1`) and the schema accepts only `schemaVersion: 1`.
- `migrate` rejects a missing or unknown version (`schema-version`) and returns a current-version input as it is. Otherwise it copies the input once (`structuredClone`), applies the steps from its version to the current one in order, and sets `schemaVersion` after each step. The input is never changed and nothing is written (HLD §8.5).
- The tests pass a fake three-version step list to prove the order and partial upgrades. A later format change adds one function to `STEPS`, updates the schema's version literal, and adds its own test.

### Public API (`src/story.ts`)

`parseStory(input: unknown): { ok: true; story: Story } | { ok: false; errors: StoryError[] }` · `sceneStartsMs(story)` · `totalDurationMs(story)` · types `Story`, `Scene`, `Effect`, `StoryError`, `StoryRule`. `migrate` stays in `src/migrate.ts` (used by `parseStory` and its tests); it is added to the entry when a caller needs it on its own.

### Where the tests and the fixture live

- Tests: `tests/story-schema/*.test.ts`, the repo's test folder (like `tests/boundaries/`), importing `../../packages/story-schema/src/*.js`. Not next to the code: the boundary rule `pure-allowlist` forbids `vitest` in `packages/story-schema/` (trial: reported once the boundary finding below is fixed).
- Reference story: `tests/fixtures/stories/the-chair-by-the-window.json`, imported with `with { type: "json" }`. Trial: TypeScript 6 (NodeNext) typechecks the import with no `tsconfig.json` change, and Vitest, ESLint and Prettier accept it. JSON rather than TypeScript, so the test reads it as untyped data like a stored story, and 004 and 017 can reuse the same file.
- Content: placeholder asset ids `reference-archival-photo` and `reference-narration`; scenes `light-on-the-chair` (Cinematic Focus 15 s, region on the chair), `her-reading-letters` (Memory Reveal 25 s, beside), `the-whole-room` (Final Reveal 25 s); narration 5000 ms + 55 000 ms; short English captions and a transcript of about 120 words (drafts, see spec Assumptions).

## Dependency to add

`zod` `^4.6.7`, a runtime dependency of `packages/story-schema` (listed in HLD §11, so not a new library). Checked 2026-11-23: 4.6.7 (2026-10-12) is the newest release and is allowed by the 21-day `minimumReleaseAge`; it has no dependencies, no peer dependencies and no `engines` field (Node.js from `.nvmrc` is fine); it works with TypeScript 6.0.3 `strict` + NodeNext (trial); `pnpm audit` reports nothing new (only the known `minimatch` dev alert).

## Finding outside this feature: boundary rules miss installed libraries

In a scratchpad copy of the repo's `.dependency-cruiser.mjs`, `exclude: node_modules` drops every dependency that resolves into `node_modules`, so an import of an installed library is never checked. `packages/story-schema` importing the installed `dependency-cruiser` and `vitest` passed; with `node_modules` removed from `exclude` (kept in `doNotFollow`), both were reported under `pure-allowlist` and `zod` stayed allowed. The 001 tests missed it because their fixtures only import libraries that are not installed. It affects rules 3–7 for every installed library. Not fixed here (CLAUDE.md §5): recorded in `notes.md` and proposed to the owner as a separate `bug` PR. This feature does not depend on the fix: `story-schema` imports only `zod`, and its tests live outside `packages/`.

## Docs touched

- `docs/HLD.md` §8.2: effect settings (focus region, placement values, Final Reveal has none), whole-millisecond times, unique scene ids, unknown fields rejected. §10: `tests/` also holds unit tests per package (`tests/<package>/`) and story fixtures.
- `docs/ROADMAP.md`: "Current status".
- `specs/002-story-schema/notes.md`: the boundary finding and any deviation.

## Expected size

5 tasks; about 12 files besides the spec documents and the lockfile; about 400–450 hand-written lines (about 170 source, 250 tests; the fixture is not counted). That is at the size limit; table-driven tests keep it there. If it goes over, the split is US3 (`migrate`) as its own PR, proposed to the owner first.
