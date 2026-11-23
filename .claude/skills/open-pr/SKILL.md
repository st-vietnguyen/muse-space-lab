---
name: open-pr
description: Open the pull request once every task of a feature or process change is committed - self-review, PR description, CI - and hand it to the Claude review. Use after the last task.
---

# Open the PR

Rules: CLAUDE.md §2.1 step 4.

1. `pnpm lint && pnpm typecheck && pnpm test`. Re-read `git diff main...HEAD` against the spec: every FR done and tested, nothing extra.
2. Self-review: `/code-review` on the diff, plus `/security-review` when it touches `.claude/`, `.github/`, auth, uploads or publishing. Fixes go through the skill `do-task` (steps 2–3).
3. Write the PR description to a file in the scratchpad, from `.github/pull_request_template.md` (a file, so the guard never matches text inside it): `Closes #N`, AC met, checks, self-review, known limits; first line `Merge after #N` if it depends on another PR.
4. **Stop:** show the owner the description and wait for approval.
5. `gh pr create --draft --assignee @me --label <feature|process|bug|chore> --body-file <file>`, then `gh pr checks --watch`. Red CI: fix through `do-task` steps 2–3.
6. Green: `gh pr ready`, `gh pr edit --add-label claude-review`. When the review summary arrives, use the skill `review-round`.
