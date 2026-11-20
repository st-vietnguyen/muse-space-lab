# MuseSpace

Online art exhibitions where each artwork tells its story in a cinematic way. Product and architecture: [`docs/`](docs/); rules for AI agents: [`CLAUDE.md`](CLAUDE.md).

## Setup

Requires the Node.js version in `.nvmrc` (or newer), Corepack (ships with Node.js) and [gitleaks](https://github.com/gitleaks/gitleaks).

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

Git hooks run before code leaves your machine: `pre-commit` scans staged files for secrets (gitleaks), formats, lints and checks boundaries; `pre-push` runs the type check. Do not skip them (`--no-verify`): a secret that reaches GitHub must be treated as leaked and rotated.

AI agents (Claude Code) also run the hooks in `.claude/settings.json`: destructive commands, skipping git hooks, editing the hook files (`.git/hooks`, `lefthook.yml`, `.claude/settings*.json`, `.claude/hooks/`) and reading `.env` files are blocked, and every file the agent writes is formatted and linted.
