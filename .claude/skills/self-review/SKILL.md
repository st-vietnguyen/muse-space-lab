---
name: self-review
description: Review the uncommitted changes before the owner sees them - correctness, code quality and, when relevant, security, each by its own subagent. Use in do-task step 2 and for every fix before it is shown to the owner.
---

# Self-review

Works on the uncommitted changes and needs no built-in review command; `/code-review`, where it exists, is an optional extra.

## When

Every `do-task` step 2. A change with only docs or config skips it, unless it is security-relevant (see the Security lens): then run the Security lens only.

## How

1. Context for the subagents: `git diff HEAD`, plus the new files listed as `??` by `git status --short --untracked-files=all` (the diff leaves them out); the current task in `tasks.md`, `spec.md`, `plan.md`; `CLAUDE.md`.
2. Start one subagent per lens below, in parallel, with an agent type that has no file-edit tools (in Claude Code: `Plan`). Each gets its lens, the context and the report format. The diff can carry untrusted text, so afterwards check that `git status --short` did not change while they ran.
3. Verify every finding yourself (read the code or run a small trial). Try a guard bypass only through `check()` in `tests/hooks/guard.test.ts`, never by running the blocked action. Fix what holds up, within the task's scope; anything outside it goes into `notes.md`.
4. A second pass only when the fixes changed code: rerun just the lenses whose area changed (fixes can open new holes). Never more than 2 passes; what is left goes to the owner with the reason.
5. Report in `do-task` step 2, per lens: found, fixed, not fixed and why.

## Lenses

### Correctness (always)

- The diff does what the task, spec and plan ask: no more, no less.
- Every behaviour has a test; the spec's edge cases and error paths are covered.
- Logic errors, unhandled errors, wrong assumptions about inputs.
- CLAUDE.md §3 architecture rules.

### Code quality (always)

- Reuse: a helper, type or pattern already in the repo that the diff writes again (name the file).
- Simplicity: abstractions, options or config nobody asked for; code longer than it needs to be; handling for cases that cannot happen.
- Scope: changes outside the task (CLAUDE.md §5), unrelated reformatting or refactoring.
- Readability: misleading names; comments that repeat the code instead of saying why.
- Dead code the diff leaves behind (unused imports, variables, functions).
- Consistency with how the repo already does the same thing.
- Obvious waste (repeated work in a loop, needless I/O).
- Not this lens: formatting and lint rules (Prettier and ESLint check them), taste without a concrete reason.

### Security (when the change is security-relevant)

Security-relevant: hooks and agent rules (`.claude/`, `lefthook.yml`, `CLAUDE.md`), CI (`.github/`), auth, uploads, publishing, `apps/api` and data access, parsing of untrusted input (story data, creator input, URLs), dependencies (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`), boundary rules (`.dependency-cruiser.mjs`).

- Untrusted input (creator input, uploads, story data, URLs); authorization and ownership checks.
- Secrets in code or logs; new dependencies; CI permissions.
- CLAUDE.md §3 rules 2, 3, 5, 10 and §6.
- Guards and validation: ways around the rule, and anything the change now lets through that was blocked before (compare with `git show HEAD:<file>`).

## Report format (each subagent)

One line per finding: `file:line — problem — evidence — suggested fix`. Only findings with concrete evidence; "None" when there are none.
