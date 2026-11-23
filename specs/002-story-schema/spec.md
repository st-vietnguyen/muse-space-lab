# Spec 002 — `story-schema`

**Issue:** #15 · **Phase:** B · **Status:** Approved (2026-11-23)

## Context

Every later story feature (clock 003, player 004–005, editor 014, publishing 016, seed 017) needs one agreed definition of a valid story. This feature defines the story format, its rules, scene timing and the upgrade path from older format versions, as pure code shared by the player and the editor, plus the reference story "The Chair by the Window" as its first valid example. It is the first feature of phase B and the first to create a package; the owner reviews each task's tests before its code.

**Sources:** ROADMAP 002 · HLD §6.3 (effects), §6.6 (relative focus coordinates), §8.2 (story definition), §8.5 (migration), §9.2 (story limits), §10 (`story-schema` contents), §13.1 (`story-schema` tests) · CLAUDE.md §3 rules 1, 2, 6 · AC-13; AC-15 (reference story; played in 005, seeded in 017) · OQ-09 (MVP-0 effects; overlays only through Memory Reveal), OQ-11 (≤ 12 scenes, ≤ 5 min), OQ-23 (reference story has narration) · ADR-003, ADR-004, ADR-010 (at most one narration), ADR-011 (versioned schema).

## User scenarios

US1–US4 match the issue's four stories, in order.

### US1 — Describe a story (P1)

A developer describes a story as data with the three launch effects and computes its timing, so the player and the editor read exactly the same thing.

**Independent test:** a story using all three effects, with and without narration, is accepted and comes back unchanged; scene start times and the total length are computed from the durations.

**Acceptance scenarios:**

1. **Given** a story whose scenes use Cinematic Focus, Memory Reveal and Final Reveal, each with its settings, some with a caption, **When** it is read, **Then** it is accepted and returned unchanged.
2. **Given** the same story with one narration track (start time, length) and a transcript, **When** it is read, **Then** it is accepted.
3. **Given** scenes of 15 s, 25 s and 25 s, **When** the timing is computed, **Then** the scenes start at 0 s, 15 s and 40 s and the story lasts 65 s.
4. **Given** a story that also stores a start time or a total length, **When** it is read, **Then** it is rejected.

### US2 — Reject invalid stories (P1)

A developer gets a clear error for a story that breaks a rule, so an invalid story can never be published or played.

**Independent test:** one invalid example per rule is rejected under exactly that rule and, inside a scene, with the scene's position and id; the boundary values are accepted.

**Acceptance scenarios:**

1. **Given** a story with no scenes, 13 scenes, or a total length over 5 minutes, **When** it is read, **Then** it is rejected.
2. **Given** a scene whose duration is missing, zero, negative or not a whole number of milliseconds, **When** it is read, **Then** it is rejected and the error names that scene.
3. **Given** narration that ends after the story ends, **When** it is read, **Then** it is rejected. **Given** narration starting at 5 s and lasting 55 s in a 65 s story, **Then** it is accepted.
4. **Given** narration with no transcript or a blank one, **When** it is read, **Then** it is rejected. **Given** a story with captions and no narration, **Then** it is accepted.
5. **Given** a focus region that reaches outside the artwork or has zero size, **When** it is read, **Then** it is rejected.
6. **Given** an unknown effect, or settings that do not match the effect, **When** it is read, **Then** it is rejected.
7. **Given** any rejected story, **Then** each error names the rule it breaks, where in the story it is, and the scene (position and id) when it is inside a scene.

### US3 — Read older stories (P1)

A developer can read a story saved in an older version of the format, so changing the format later never breaks saved drafts or published exhibitions.

**Independent test:** with today's single version, and with a test-only chain of three versions, stories are upgraded one version at a time, current ones come back unchanged, unknown versions are rejected, and the input is never changed.

**Acceptance scenarios:**

1. **Given** a story with no format version, **When** it is read, **Then** it is rejected.
2. **Given** a story in the current version, **When** it is upgraded, **Then** it comes back unchanged.
3. **Given** a version the system does not know (newer than the current one, below 1, not a whole number, not a number), **When** it is read, **Then** it is rejected.
4. **Given** a format with versions 1, 2 and 3, **When** a version 1 story is upgraded, **Then** the step 1→2 runs, then 2→3; a version 2 story runs only 2→3.
5. **Given** any story, **When** it is read or upgraded, **Then** the input is not changed.

### US4 — Have the reference story (P1)

The owner has the reference story "The Chair by the Window" in the format, so the quality bar for the product exists from the start.

**Independent test:** the stored reference story is read and passes every rule.

**Acceptance scenarios:**

1. **Given** the reference story, **When** it is read, **Then** it is accepted, with Cinematic Focus 15 s → Memory Reveal 25 s → Final Reveal 25 s (65 s in total), narration from 5 s to 60 s, and a transcript.

## Edge cases

- Exactly 12 scenes, a total of exactly 5 minutes, narration ending exactly when the story ends, narration starting at 0, a focus region touching the artwork's edge (also when the edge is reached through floating-point arithmetic): accepted.
- A total of 5 minutes plus 1 ms, narration ending 1 ms after the story: rejected.
- Two scenes with the same id: rejected; the error names the second scene.
- A field the format does not define (a typo such as `captoin`, or a stored start time): rejected, never silently dropped.
- Input that is not an object (nothing, a list, text): rejected.
- A format version written as text (`"1"`): rejected as unknown.
- A transcript without narration: accepted.
- An empty caption: rejected; a scene without a caption omits it.
- Several errors in one story: every error in single fields is reported together; the rules that span several fields (total length, narration end, repeated ids, transcript required) are checked once the single fields are valid.

## Functional requirements

- **FR-001** A story MUST record its format version.
- **FR-002** A story MUST have an ordered list of 1 to 12 scenes.
- **FR-003** Each scene MUST have an id unique within the story, a duration in whole milliseconds greater than 0, and exactly one effect with its settings; it MAY have a non-empty caption.
- **FR-004** The effects MUST be exactly: Cinematic Focus, whose settings are one focus region; Memory Reveal, whose settings are one archival image reference and its placement, over or beside the artwork; Final Reveal, which has no settings. Memory Reveal MUST be the only way a story shows an extra image.
- **FR-005** A focus region MUST be given relative to the artwork (0 to 1 on each axis), MUST have a width and height greater than 0, and MUST lie entirely inside the artwork, edges included.
- **FR-006** A story MAY have at most one narration track, with an audio reference, a start time (whole milliseconds, 0 or more) and a length (whole milliseconds, greater than 0). Narration MUST end at or before the end of the story.
- **FR-007** A story with narration MUST have a non-blank transcript. A story without narration MAY rely on captions alone.
- **FR-008** Scene start times and the story's total length MUST be computed from the scene durations in scene order, and MUST NOT be stored in the story.
- **FR-009** The total length MUST be at most 5 minutes.
- **FR-010** A story containing a field the format does not define MUST be rejected.
- **FR-011** Reading a story MUST either accept it, returning it unchanged, or reject it with a list of errors. Each error MUST name the rule broken and the place in the story and, when it is inside a scene, the scene's position and id.
- **FR-012** Reading a story MUST first upgrade it from its recorded version to the current one, one version at a time.
- **FR-013** A story in the current version MUST come back unchanged from the upgrade; a story whose version is missing or unknown MUST be rejected.
- **FR-014** Reading and upgrading MUST NOT change the input and MUST be pure: no I/O, and the same input always gives the same result.
- **FR-015** The reference story "The Chair by the Window" MUST be kept as data in the current format (Cinematic Focus 15 s, Memory Reveal 25 s, Final Reveal 25 s, narration from 5 s lasting 55 s, a transcript, captions) and MUST pass every rule.
- **FR-016** Image and audio references MUST be treated as opaque names: whether they exist, are processed and belong to the creator, and whether the narration length matches the audio file, is not checked here.

## Key entities

- **Story** — format version, ordered scenes, optional narration, optional transcript. Its total length is derived, not stored.
- **Scene** — id (unique in the story), duration, one effect, optional caption. Its start time is derived, not stored.
- **Effect** — one of the three launch effects with its own settings.
- **Focus region** — a rectangle in coordinates relative to the artwork.
- **Narration** — audio reference, start time, length.
- **Validation error** — the rule broken, the place in the story, and the scene (position and id) if any.

## Success criteria

- **SC-001** Every acceptance criterion of issue #15 has at least one automated test, written and reviewed before the code that makes it pass.
- **SC-002** Each invalid example is rejected under exactly its expected rule; each boundary example and the reference story are accepted.
- **SC-003** `pnpm lint`, `pnpm typecheck` and `pnpm test` pass in CI on this feature's PR.

## Constraints and decisions

- Pure code: no I/O, no frameworks, no rendering or animation libraries; only the validation library and the other pure packages (CLAUDE.md §3 rule 6, HLD §10).
- A story is data; nothing in it is ever executed (CLAUDE.md §3 rule 2, ADR-003).
- The player and the editor share this one definition (CLAUDE.md §3 rule 1, ADR-004).
- MVP-0 effects only; extra images only through Memory Reveal (OQ-09). At most one narration track (ADR-010).
- At most 12 scenes and 5 minutes (OQ-11).
- The reference story has narration (OQ-23).
- Upgrades go one version at a time; reading never writes the saved copy (HLD §8.5).

## Assumptions

- Durations and times are whole milliseconds, so adding them up never drifts through rounding.
- Memory Reveal placement is "over" or "beside"; which side "beside" uses is the player's choice (004).
- No length limit on captions or the transcript in this feature.
- The same rules apply to every story. Whether the editor may autosave a draft that is still incomplete (for example, no focus region picked yet) is decided in 014.
- Error messages are for developers, in English; the editor shows its own text for each rule (OQ-22).
- The reference story's captions, transcript and focus region are drafts, and its image and audio references are placeholders; 017 replaces them with the real media and a transcript that matches the recorded narration.

## Out of scope

- Checking that referenced images and audio exist, are fully processed and belong to the same creator, and that the narration length matches the real audio file: needs stored media, comes with publishing (016).
- Playing a story (003–005) and editing it (014); the scene at a given time and the clock (003).
- Detail Journey, Atmosphere Transition and ambient sound (019).
- The real images and narration of the reference story (017).
- The published snapshot format (016).

## Mapping to issue #15

| Issue criterion | Covered by |
|---|---|
| Ordered scenes; each with id, duration, one effect with settings, optional caption | FR-002, FR-003 · US1-1 |
| The three effects | FR-004, FR-005 · US1-1 |
| At most one narration with start and length, and a transcript | FR-006, FR-007 · US1-2 |
| Start times and total computed, never stored (15/25/25 s → second starts at 15 s, 65 s) | FR-008 · US1-3, US1-4 |
| No scenes, more than 12, or over 5 minutes rejected | FR-002, FR-009 · US2-1 |
| Missing, zero or negative duration rejected | FR-003 · US2-2 |
| Narration ending after the story rejected; 5 s + 55 s in 65 s accepted | FR-006 · US2-3 |
| Narration without transcript rejected; captions without narration accepted | FR-007 · US2-4 |
| Focus region outside the artwork rejected | FR-005 · US2-5 |
| Unknown effect or mismatched settings rejected | FR-004, FR-010 · US2-6 |
| Each error names the scene and the rule | FR-011 · US2-7 |
| Every story records its format version | FR-001 · US3-1 |
| Current version unchanged; unknown version rejected | FR-013 · US3-2, US3-3 |
| One version at a time; reading never changes the saved copy | FR-012, FR-014 · US3-4, US3-5 |
| Reference story uses the three effects, narration 5–60 s, transcript, passes every rule | FR-015 · US4-1 |
| Every rule has automated tests written before the code | SC-001 |

## Clarifications

- None yet.
