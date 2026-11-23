# MuseSpace

Online art exhibitions where each artwork tells its story in a cinematic way. Product and architecture: [`docs/`](docs/); rules for AI agents: [`CLAUDE.md`](CLAUDE.md).

## Setup

Requires the Node.js version in `.nvmrc` (or newer), Corepack (ships with Node.js) and [gitleaks](https://github.com/gitleaks/gitleaks).

The AI-agent workflow (`CLAUDE.md`) also needs:

- [Claude Code](https://claude.com/claude-code): it runs the agent hooks in `.claude/settings.json` and the workflow skills in `.claude/skills/`. Other agents only read `CLAUDE.md` and the skill files as plain instructions; the hooks do not run for them.
- [GitHub CLI](https://cli.github.com/) (`gh`), signed in with access to the repository.
- For the Claude review on pull requests: the Claude GitHub App installed on the repository and the repository secret `CLAUDE_CODE_OAUTH_TOKEN`.

```sh
brew install gitleaks   # once per machine; the pre-commit hook needs it
corepack enable         # once per machine; provides the pnpm version pinned in package.json
pnpm install            # also installs the git hooks (lefthook.yml)
```

## Checks

Run from the repo root; they cover every package under `packages/` and `apps/`. CI runs the same three on every push.

```sh
pnpm lint        # formatting (Prettier), common mistakes (ESLint) and architecture boundaries (.dependency-cruiser.mjs)
pnpm typecheck   # strict TypeScript
pnpm test        # unit tests
pnpm format      # fix formatting
```

Git hooks run before code leaves your machine: `pre-commit` scans staged files for secrets (gitleaks), formats, lints and checks boundaries; `pre-push` runs the type check. Do not skip them (`--no-verify`): a secret that reaches GitHub must be treated as leaked and rotated. Partial staging (`git add -p`) is safe: Lefthook hides unstaged changes while Prettier fixes and re-stages files (checked with Lefthook 2.2.2).

AI agents (Claude Code) also run the hooks in `.claude/settings.json`: destructive commands, skipping git hooks, editing the hook files (listed in `.claude/hooks/rules.mjs`; the scripts in `.claude/hooks/` are reviewed in PRs like other code), merging PRs, pushing to `main`, adding the `ready` label and reading `.env` files are blocked, and every file the agent writes is formatted and linted. The guard fails closed: if it errors, the call is blocked. It matches command text, so it is a safety net, not a security boundary; the `package.json` scripts (e.g. `prepare`) are not protected because agents edit that file routinely. Git hooks and CI remain the gates.
