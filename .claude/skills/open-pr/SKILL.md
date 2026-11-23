---
name: open-pr
description: Open the pull request once every task of a feature or process change is committed - final check against the spec, PR description, CI - and hand it to the Claude review. Use after the last task.
---

# Open the PR

Rules: CLAUDE.md §2.1 step 4. Each task was already self-reviewed in the skill `do-task`.

1. `pnpm lint && pnpm typecheck && pnpm test`. Re-read `git diff main...HEAD` against the spec: every FR done and tested, nothing extra. Fixes go through `do-task` steps 2–3.
2. Write the PR description to a file in the scratchpad, from `.github/pull_request_template.md` (a file, so the guard never matches text inside it): `Closes #N`, AC met, checks, the tasks' self-review results, known limits; first line `Merge after #N` if it depends on another PR.
3. `gh pr create --title "<title>" --assignee @me --label <feature|process|bug|chore> --body-file <file>` (not a draft). Then `gh pr checks --watch`. Red CI: fix through `do-task` steps 2–3.
4. Green: `gh pr edit --add-label claude-review`. Tell the owner the PR link. When the review summary arrives, use the skill `review-round`.
