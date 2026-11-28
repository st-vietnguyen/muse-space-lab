# Notes 003 — `story-clock`

## Review log

| Breakpoint | Round | Result | Findings (blocker / should-fix / needs-owner / question / nit) | Still open or rejected | Tokens |
|---|---|---|---|---|---|
| spec | 1 | CHANGES | 0 / 2 / 0 / 0 / 4 | Fixed: restart while buffering with narration from 0; the 4 nits. The size estimate is over the size rule: handed over, answered by the owner (see "Owner's answers") | reviewer 54 764 |
| spec | 2 | PASS | 0 / 0 / 0 / 0 / 0 | None open, none rejected | reviewer 62 264 (same agent continued; the count includes round 1) |
| T001 tests | 1 | PASS | 0 / 0 / 0 / 0 / 0 | None. Staged blobs: `stories.ts` f958d33, `timeline.test.ts` 7885cfd | implementer 37 486 · reviewer 36 992 |
| T001 code | 1 | PASS | 0 / 0 / 0 / 0 / 1 | Nit not fixed, kept as a known limit (below): `positionAt` throws for a "not a number" time | implementer 41 152 (same agent continued; includes the tests phase) · reviewer 36 524 |
| T002 tests | 1 | PASS | 0 / 0 / 0 / 0 / 2 | Both nits taken up in round 2 (a test name that says "beyond" but seeks to the end; the whole reading checked only at 0 and at the end), together with the changes the split needs | implementer 36 300 · reviewer 42 703 |
| T002 tests | 2 | PASS | 0 / 0 / 0 / 0 / 1 | Both nits of round 1 fixed; `narrationMs` removed and the FR-010 test added for the narrowed scope. New nit not fixed (no review round left for a changed test): the FR-010 test stops at 20 000 ms and does not run a narrated story to its end. Staged blob: `clock.test.ts` b12bda1 | implementer 45 682 · reviewer 58 080 (both continued; the counts include round 1) |
| T002 code | 1 | CHANGES | 0 / 1 / 0 / 0 / 0 | Confirmed by the lead and sent back for a fix: the clock read the time source more than once per call, so with a source that moves between calls a reading could show the end as `playing` without reporting it, and `pause` could leave the clock paused at the end, not finished (FR-009). The reviewed tests could not see it: their source is constant within one call | implementer 52 202 (continued; includes the tests phase) · reviewer 42 479 |
| T002 tests added after the code | 1 | PASS | 0 / 0 / 0 / 0 / 2 | Two tests with a time source that moves on at every read; the reviewer's mutation trial: each fails when `read` or `pause` reads the source a second time, and no other test does. Nits not fixed (listed for the PR): the branch the fixed code takes does not check that the listener was not called and bounds the time only from above; a comment assumes the clock reads the source at creation. Staged blob: `clock.test.ts` 722b0f3 | implementer 60 444 · reviewer 69 563 (both continued) |
| T002 code | 2 | PASS | 0 / 0 / 0 / 0 / 0 | The finding of round 1 is fixed (one read of the time source per call); none open, none rejected | reviewer 47 751 (continued) |
| spec (narrowed after the split) | 1 | PASS | 0 / 0 / 0 / 0 / 1 | Nit fixed: the note for the owner's roadmap change now also names the 003 row | reviewer 81 603 (the spec reviewer continued; the count includes its two earlier rounds) |

## Decisions of the lead

Taken while drafting the spec, plan and tasks (2026-11-28). Each is also an "Assumption" in `spec.md`, so the owner can overturn it.

- **The time source is passed in by the caller, with no default.** The clock stays free of globals, and no line is left that only a real browser clock would run.
- **Defaults where the issue is silent:** a new clock is paused at 0; restart plays from the start; a seek keeps playing/paused; a finished clock stays stopped until a seek back (then paused) or a restart; a scene boundary belongs to the scene that starts there; a seek to "not a number" is ignored.
- **Workspace link, no new package.** `story-runtime` depends on our own `@musespace/story-schema` (`workspace:*`, HLD §10 arrow runtime → schema). Nothing is downloaded, so it is not a new dependency in the sense of CLAUDE.md §2 Plan.
- **After the split, the clock of this feature ignores a story's narration** (FR-010): it runs on the time source for every story, so 004 can play the narrated reference story without sound. The reading has no narration field and no `buffering` status until the follow-up feature adds them.
- **Issue #16 is not edited.** Its narration criteria moved to issue #41 by the owner's answer; the mapping in `spec.md` and a comment on #16 say so. The issue text stays as the owner approved it.

## Owner's answers

- **2026-11-28, size (hand-over on issue #16, answered in the lead's session).** Asked whether to split the feature (about 600 hand-written lines against the rule's about 400) or keep it as one, the owner chose the option "Giữ 1 feature, chấp nhận ~600 dòng" ("Keep one feature, accept about 600 lines": one PR, no roadmap change, knowingly over the size rule).
- **2026-11-28, size again (second hand-over on issue #16, answered in the lead's session).** The tests of T002 came out at 428 lines against 140 planned, so the whole feature was heading for about 1 200 lines. Asked whether to split now, keep one feature of about 1 200 lines, or shorten the tests, the owner chose the option "Tách ngay (Recommended)" ("Split now": this feature ends after T002, about 680 lines in 7 files; following the narration, T003, becomes a new feature that depends on this one, with a new roadmap row and a new issue drafted by the agent). Done: draft issue #41 (`needs-review`); spec, plan and tasks narrowed to T001 + T002; the label `needs-owner` removed.

## Deviations

- **Scope (owner's answer of 2026-11-28, above):** US3 "Follow the narration", the narration requirements (FR-010–FR-014 of the first spec), the run of the reference story and task T003 are no longer part of this feature. `spec.md`, `plan.md` and `tasks.md` were narrowed after T001 was committed; T001 is not affected. The first spec with those parts is in the branch's first commit (`5957f76`).
- **T001 leftovers of the first scope:** `tests/story-runtime/stories.ts` (reviewed and committed with T001) also exports `narrationFromZero` and `narrationToEnd`, which only the narration feature will use. Left as they are: changing a reviewed helper for tidiness is not worth a review round.

- **Size as built:** 739 hand-written lines (132 source with `package.json`, 607 tests) against the about 680 the owner's split decision was based on. The 59 lines more are the FR-010 test, the tests the reviews asked for, and the fix of the code review. Not handed over a third time: the scope is the one the owner chose and nothing can be cut without dropping a reviewed test.

## Known limits

- **T001:** `positionAt(story, NaN)` throws (no scene is found). The spec asks for "not a number" handling only at the clock's seek (FR-007), so the clock of T002 must never pass such a time on; a direct caller with a "not a number" time gets the error. Done in T002: `seek` returns on such a target before anything else.
- **T002:** the clock reads the time source once when it is created, for its first anchor. A listener removed while the end is being reported is still called in that round (the clock calls a copy of the list); no test covers this.
- **T002, open nits of the tests reviews** (optional, not fixed): the FR-010 test stops at 20 000 ms and does not run a narrated story to its end; in the two tests with a moving time source, the branch the code takes checks the status and `time < 65 000` but not that the listener was not called.

## For the follow-up feature (issue #41)

Decisions already taken and reviewed for the narration part, kept here so they are not lost; they are input for that feature's spec, not part of this one:

- **Every narration position report re-anchors the clock.** HLD §6.5 names two rules: re-anchor on `playing`, `seeked` and `timeupdate`, and re-anchor when the drift is over 100 ms. The first spec followed the first as written; the second is then its guaranteed result, not a second mechanism. The other reading (a `timeupdate` moves the clock only above 100 ms) would differ from the HLD text; the browser spike of feature 005 is the place to revisit it if re-anchoring on small differences is visible.
- **Restart while buffering, narration from 0:** buffering continues, by the same rule as a seek inside the narration span.
- The reviewed requirements, edge cases and test list for the narration are in `spec.md`, `plan.md` and `tasks.md` of commit `5957f76`.
- **Estimating:** a clock test is a short sequence with its expected values, about 10 lines per case (T002: 40 cases, 428 lines). Count the cases, not table rows.

## Process notes

- The text report of `pnpm test:coverage` leaves out files that are fully covered, so a new file at 100% does not appear in it. Per-file numbers for the reviews were read from a `json-summary` report written to the scratchpad.
- Nothing can be pushed between a task's tests step and its code step: the pre-push hook runs `tsc` on the working tree, and the reviewed tests import code that does not exist yet. The commit that narrowed the documents (`362b939`) was therefore pushed together with T002.
- The size estimate of the plan was wrong twice (400–450, then about 600, against about 1 200 on the way); each time the owner decided. See "Estimating" above.

## Outside this feature

- "Current status" in `docs/ROADMAP.md` still says the `process-auto-lane` PR is to be opened and that issue #16 waits for `ready`; PR #40 is merged and #16 is `ready`. A feature branch never edits it (CLAUDE.md §2.1); told to the owner.
- The roadmap needs three changes for the split: a row for the narration feature (issue #41); its place in "Depends on" (the player 004 needs only this feature; the narration of 005 needs #41); and the 003 row itself narrowed to the position and the clock without narration (its scope still lists lead-in, re-anchoring, buffering and drift, and the 100 ms limit of AC-07 is now in #41). That is the owner's change, in the process lane; told to the owner.
