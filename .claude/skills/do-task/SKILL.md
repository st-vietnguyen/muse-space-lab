---
name: do-task
description: Do one task from specs/00X-<name>/tasks.md, or one fix from a review round, with the owner reviewing the tests and then the code before anything is committed. Use for every implementation step.
---

# Do one task

Rules: CLAUDE.md §2 Implement. Take the first unchecked task in `tasks.md`, or the one the owner names, and read its FR, files and `AC-xx`. Stop where it says **Stop**; if the owner asks for changes, apply them and stop again at the same step.

1. **Tests.** Write only the task's tests and run them (`pnpm test <path>`). **Stop:** show the owner the test files and what each test checks. Do not commit.
   A task with nothing to test (config, docs) and a fix from a review round start at step 2.
2. **Code.** Write the minimum code that makes the approved tests pass. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`. **Stop:** show the owner the diff and any deviation from the plan. A different library, version, task order or scope: ask before doing it. An implementation detail: update `plan.md`/`tasks.md` and record it in `notes.md`. Do not commit.
3. **Commit.** After approval: `git status`, stage files by name (never `-A` or `.`), mark the task `[x]` in `tasks.md`, update "Current status" if this step changes it, commit `T00X: <what>` (a review fix: `Review fix: <what>`), push. A failing hook means fixing the cause, never skipping it.

A task that proves CI fails on a violation: after step 3, push the violation to a throwaway branch `<branch>-ci-check` (never merged), keep the link to the failed run for the PR's "Checks", then delete that branch.

After the last task, open the PR with the skill `open-pr`.
