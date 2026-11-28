---
name: do-task
description: Do one task from specs/00X-<name>/tasks.md, or one fix from a review round. In the feature lane the agents implementer and reviewer write and review the tests, then the code; in the process lane the owner reviews both before anything is committed. Use for every implementation step.
---

# Do one task

Rules: CLAUDE.md §2 Implement. Take the first unchecked task in `tasks.md`, or the one the owner names, and read its FR, files and `AC-xx`.

Two lanes, same three steps:

- **Feature lane** (a roadmap feature in its worktree, led by the skill `run-features`): the agent `implementer` writes, the agent `reviewer` reviews, you check and commit. No owner stop; what CLAUDE.md §2.3 lists is handed over (`run-features` step 5). All commands use `git -C <worktree>` / `pnpm -C <worktree>`. Before each task, check the issue still has the label `ready` (`gh issue view N --json labels`); without it, stop work on the feature and tell the owner.
- **Process lane** (a process change, CLAUDE.md §2.2, or any work the owner drives by hand): you write, the owner reviews at each **Stop**; if the owner asks for changes, apply them and stop again at the same step. There is no spec folder: the proposal the owner approved stands in for `tasks.md`, and deviations go into the PR description instead of `notes.md`.

A task with nothing to test (`config/docs`) and a fix from a review round start at step 2.

## Feature lane: after every agent run

Agents work on text they did not write, so check both checkouts yourself each time one finishes, before you use its report:

- Main checkout: `git -C <repo> status --short` and `git -C <repo> rev-parse HEAD` are what they were (it supplies the rules; no agent writes there).
- `git -C <worktree> rev-parse HEAD` is what it was before the agent started (agents never commit).
- `git -C <worktree> status --short --untracked-files=all` lists no protected path (CLAUDE.md §2.3) and nothing staged that you did not stage.
- The reviewed tests are the ones you staged: `git -C <worktree> ls-files -s -- <test files>` shows the blob ids you noted in step 1, and `git -C <worktree> diff -- <test files>` is empty.
- After a `reviewer` run: the status and `git -C <worktree> diff HEAD | sha256sum` are exactly what they were before it started.
- After phase `code`: no other test, test helper or fixture changed outside the task's file list, and the diff adds no `.skip`, `.only`, `.todo` or `skipIf`.

Anything else than expected: do not commit it. A changed reviewed test goes back to step 1's review; a protected path, or a test deleted, skipped or loosened, is handed over.

## 1. Tests

For security-sensitive logic (guards, validation, permissions) the tests cover ways around the rule, not only the normal case.

- **Feature lane.**
  1. Start `implementer` (phase `tests`) with the repo root, the worktree path and the task ID.
  2. Start `reviewer` (mode `tests`) with the same, plus the list of test files from the implementer's report, and nothing of the implementer's reasoning.
  3. Verify the findings; a `[question]` you confirm is a `[should-fix]`. Fixes go back to the same implementer (continue it, in Claude Code with `SendMessage`, so it keeps its context; if it is gone, start a new one). A `[blocker]`, `[should-fix]` or `[needs-owner]` you reject goes back to the reviewer with your reason; so does every fix. That second round is the last: a finding the reviewer keeps against your reason, a `[needs-owner]` that holds up, or a `[blocker]`/`[should-fix]` still open is handed over.
  4. When the review passes, stage the reviewed test files by name (`git -C <worktree> add <files>`) and note their blob ids (`git -C <worktree> ls-files -s -- <files>`) in the task's "Review log" line. The staged copy is the reviewed one: later checks compare against it, and a new session reads it as "tests reviewed".
- **Process lane.** Write only the task's tests and run them (`pnpm test <path>`). **Stop:** show the owner the test files and what each test checks. Do not commit.

## 2. Code

The minimum code that makes the reviewed tests pass. A different package, version, task order or scope is never decided here: feature lane, hand over; process lane, ask first. An implementation detail: update `plan.md`/`tasks.md` and record it in `notes.md`.

- **Feature lane.**
  1. Continue the same `implementer` (phase `code`). It also writes a `config/docs` task.
  2. Run `pnpm -C <worktree> lint`, `typecheck`, `test` and `test:coverage` yourself; read the diff.
  3. Start `reviewer` (mode `code`) with the repo root, the worktree path, the task ID and the list of reviewed test files. A `config/docs` task gets no reviewer, unless it is security-relevant as the skill `self-review` defines it; a fix from a review round always gets one, and a test it changes goes through step 1's review.
  4. Verify the findings; fixes go to the implementer. A missing test is written by the implementer, checked by the `reviewer` in mode `tests` (told that the test was added after the code), then staged like the others. Questions, rejected findings, the second round and the hand-over work as in step 1.3.
- **Process lane.** Write the code. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`. Self-review with the skill `self-review`. **Stop:** show the owner the diff, the self-review result (fixed, and not fixed with the reason) and any deviation from the plan. Do not commit.

## 3. Commit

Feature lane: when the review passes. Process lane: after the owner's approval.

`git status`, stage files by name (never `-A` or `.`), mark the task `[x]` in `tasks.md`, commit `T00X: <what>` (a review fix: `Review fix: <what>`), push. Write the message to a file and commit with `git commit -F <file>`: the guard reads the command text, quoted messages included. A failing hook means fixing the cause, never skipping it.

- Feature lane: `notes.md` with the task's "Review log" lines is part of the commit. Push with `git -C <worktree> push origin 00X-<name>`. Then go on with the next task in this session.
- Process lane: update "Current status" in `docs/ROADMAP.md` if this step changes it, then tell the owner that the next task starts in a new session (`/clear`, CLAUDE.md §2 Sessions).

After the last task, open the PR with the skill `open-pr`.
