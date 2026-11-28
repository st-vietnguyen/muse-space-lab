---
name: open-pr
description: Open the pull request once every task of a feature or process change is committed - final check against the spec, in the feature lane a self-review of the whole branch, PR description, CI - and hand it to the Claude review. Use after the last task.
---

# Open the PR

Rules: CLAUDE.md §2.1 step 4. Each task was already reviewed in the skill `do-task`. Feature lane: run every command against the worktree (`git -C <worktree>`, `pnpm -C <worktree>`); `gh` takes the branch or PR number as an argument.

1. `git fetch origin main`. Feature lane: if `origin/main` moved, merge it first (`run-features` step 4). `pnpm lint && pnpm typecheck && pnpm test`. Re-read `git diff origin/main...HEAD` against the spec: every FR done and tested, nothing extra. Feature lane: the diff touches no control-plane path, and nothing under `docs/` beyond what an owner's answer you read yourself allows (CLAUDE.md §2.3).
2. Feature lane: review the whole branch once with the skill `self-review` (scope "a feature branch"). Fixes from steps 1–2 go through `do-task` steps 2–3 and are pushed before the PR is opened.
3. Write the PR description to a file in the scratchpad, from `.github/pull_request_template.md` (a file, so the guard never matches text inside it): `Closes #N`, AC met, checks, the review results, known limits; first line `Merge after #N` if it depends on another PR. Feature lane: the "Review log" table from `notes.md` plus a `branch` line for step 2, the findings you rejected with the reason, every new package with its version and publish date, and every change to the check configuration (`eslint.config.js`, `.dependency-cruiser.mjs`, `vitest.config.ts`, `tsconfig.json`, `.prettierignore`, `package.json` scripts, `tests/hooks/`, `tests/boundaries/`).
4. `gh pr create --head <branch> --title "<title>" --assignee @me --label <feature|process|bug|chore> --body-file <file>` (not a draft). Then `gh pr checks <number> --watch`. Red CI: fix through `do-task` steps 2–3.
5. Green: `gh pr edit <number> --add-label claude-review`. Process lane: tell the owner the PR link; the review round is a new session. Feature lane: go on with other work or wait for the review (`run-features` step 4). When the review summary arrives, use the skill `review-round`.
