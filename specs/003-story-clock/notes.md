# Notes 003 — `story-clock`

## Review log

| Breakpoint | Round | Result | Findings (blocker / should-fix / needs-owner / question / nit) | Still open or rejected | Tokens |
|---|---|---|---|---|---|
| spec | 1 | CHANGES | 0 / 2 / 0 / 0 / 4 | Fixed: restart while buffering with narration from 0; the 4 nits. The size estimate is over the size rule: handed over, answered by the owner (see "Owner's answers") | reviewer 54 764 |
| spec | 2 | PASS | 0 / 0 / 0 / 0 / 0 | None open, none rejected | reviewer 62 264 (same agent continued; the count includes round 1) |

## Decisions of the lead

Taken while drafting the spec, plan and tasks (2026-11-28). Each is also an "Assumption" in `spec.md`, so the owner can overturn it.

- **Every narration position report re-anchors the clock.** HLD §6.5 names two rules: re-anchor on `playing`, `seeked` and `timeupdate`, and re-anchor when the drift is over 100 ms. The spec follows the first as written; the second is then its guaranteed result, not a second mechanism (FR-014). The other reading (a `timeupdate` moves the clock only above 100 ms) would differ from the HLD text, so it is not chosen here; the browser spike of feature 005 is the place to revisit it if re-anchoring on small differences is visible.
- **The time source is passed in by the caller, with no default.** The clock stays free of globals, and no line is left that only a real browser clock would run.
- **Defaults where the issue is silent:** a new clock is paused at 0; restart plays from the start; a seek keeps playing/paused; a finished clock stays stopped until a seek back (then paused) or a restart; a scene boundary belongs to the scene that starts there; a seek to "not a number" is ignored.
- **Workspace link, no new package.** `story-runtime` depends on our own `@musespace/story-schema` (`workspace:*`, HLD §10 arrow runtime → schema). Nothing is downloaded, so it is not a new dependency in the sense of CLAUDE.md §2 Plan.
- **Restart while buffering, narration from 0** (spec review round 1): buffering continues, by the same rule as a seek inside the span (FR-008, FR-012).
- **Size: not decided by the lead.** The first draft estimated 400–450 hand-written lines and did not split. The spec review (round 1) found the estimate low; counted again per file it is about 600 lines (about 165 source, 440 tests and test helpers) in 3 tasks and 9 files. 002 was planned at 400–450 and came out at 514. That is over the size rule, so the split was handed over to the owner (issue #16, 2026-11-28); the answer is under "Owner's answers".

## Owner's answers

- **2026-11-28, size (hand-over on issue #16, answered in the lead's session).** Asked whether to split the feature (about 600 hand-written lines against the rule's about 400) or keep it as one, the owner chose the option "Giữ 1 feature, chấp nhận ~600 dòng" ("Keep one feature, accept about 600 lines": one PR, no roadmap change, knowingly over the size rule). The feature stays one PR with T001–T003; the label `needs-owner` is removed.

## Deviations

None yet.

## Outside this feature

- "Current status" in `docs/ROADMAP.md` still says the `process-auto-lane` PR is to be opened and that issue #16 waits for `ready`; PR #40 is merged and #16 is `ready`. A feature branch never edits it (CLAUDE.md §2.1); told to the owner.
