# MuseSpace

Online art exhibitions where each artwork tells its story in a cinematic way. Product and architecture: [`docs/`](docs/); rules for AI agents: [`CLAUDE.md`](CLAUDE.md).

## Setup

Requires the Node.js version in `.nvmrc` (or newer), Corepack (ships with Node.js) and [gitleaks](https://github.com/gitleaks/gitleaks).

The AI-agent workflow (`CLAUDE.md`) runs in the dev container (see [Sandbox](#sandbox-dev-container)) and also needs:

- [Claude Code](https://claude.com/claude-code): it runs the agent hooks in `.claude/settings.json` and the workflow skills in `.claude/skills/`. Other agents only read `CLAUDE.md` and the skill files as plain instructions; the hooks do not run for them.
- [GitHub CLI](https://cli.github.com/) (`gh`). The agent uses it in the container, signed in with the repo-scoped token. On the host, `gh` is for the owner's own actions only.
- For the Claude review on pull requests: the Claude GitHub App installed on the repository and the repository secret `CLAUDE_CODE_OAUTH_TOKEN`.

```sh
brew install gitleaks   # once per machine; the pre-commit hook needs it
corepack enable         # once per machine; provides the pnpm version pinned in package.json
pnpm install            # also installs the git hooks (lefthook.yml)
```

## Sandbox (dev container)

AI agents work in the dev container (`.devcontainer/`). It has the same Node.js and pnpm as CI, because it reads them from `.nvmrc` and `package.json` (`packageManager`). It also has gitleaks for the git hooks, and no host folder, `.env` file or credential.

1. **Turn off forwarding (once per machine).** Install Docker and the VS Code extension Dev Containers. In the VS Code user settings on the host, turn off what the extension forwards into containers by default (`.gitconfig`, the git credential helper, Docker credentials):

   ```jsonc
   "dev.containers.copyGitConfig": false,
   "dev.containers.gitCredentialHelperConfigLocation": "none",
   "dev.containers.dockerCredentialHelper": false
   ```

   The extension also forwards the host's SSH agent, with every key in it: GitHub keys and server keys alike. A host in `~/.ssh/config` with `AddKeysToAgent yes` loads its key back into the agent on every connection from the host. So keep the agent empty for every host: drop `AddKeysToAgent yes`, or set `IdentityAgent none` under `Host *` (the key files and the Keychain passphrase still work). Then run `ssh-add -D` once.

   VS Code's own GitHub sign-in could also answer git in the container. `.devcontainer/devcontainer.json` turns this off for the container (`git.terminalAuthentication` and `github.gitAuthentication` set to false).
2. **Clone into a volume.** Run "Dev Containers: Clone Repository in Container Volume…" with `https://github.com/st-vietnguyen/muse-space-lab`. The repo then lives in a Docker volume, not in a host folder.
   - The setup installs Node.js and runs `pnpm install`.
   - It fails when the git hooks could not be installed. If git reports "dubious ownership", run `git config --global --add safe.directory "$PWD"` and then `pnpm install`.
3. **Check that nothing came in from the host.** In the container terminal, check each of these:
   - `git config --show-origin --get-regexp 'credential|user'` shows no host file or helper.
   - `ssh-add -l` lists no key. The agent repeats this check at the start of every session.
   - `env | grep -i askpass` prints nothing.
   - `ls ~/.docker/config.json` finds nothing.
   - `gpg --list-secret-keys` is empty.
   - `ls .git/hooks` lists `pre-commit` and `pre-push`.
4. **Sign in to GitHub with a repo-scoped token.** Create a fine-grained personal access token for this repository only.
   - Read and write: Contents, Issues, Pull requests.
   - Read: Actions, Commit statuses.
   - Nothing else. Without Workflows, changes to `.github/workflows/` are pushed by the owner.
   - Expiry: 90 days or less. Revoke the token when you delete the volume.

   gh stores the token as plain text in the container, which is why the agent may never print it (CLAUDE.md §6). In the container, run `gh auth login` (paste the token), `gh auth setup-git`, and `git config --global user.name` / `user.email`.
5. **Sign in to Claude Code** in the container. Rebuilding the container loses these sign-ins.

Only the owner edits `.devcontainer/` and `.devcontainer.json`. The agent guard blocks the usual ways, but it only matches command text. `initializeCommand` runs on the host at every start and `mounts` bring host files in. So before reopening or rebuilding the container after agent work, check what changed: `git status --short -- .devcontainer .devcontainer.json`, `git diff HEAD -- .devcontainer .devcontainer.json`, and `git log -p origin/main.. -- .devcontainer .devcontainer.json`.

## Checks

Run from the repo root; they cover every package under `packages/` and `apps/`. CI runs the same three on every push.

```sh
pnpm lint        # formatting (Prettier), common mistakes (ESLint) and architecture boundaries (.dependency-cruiser.mjs)
pnpm typecheck   # strict TypeScript
pnpm test        # unit tests
pnpm format      # fix formatting
```

Git hooks run before code leaves your machine: `pre-commit` scans staged files for secrets (gitleaks), formats, lints and checks boundaries; `pre-push` runs the type check. Do not skip them (`--no-verify`): a secret that reaches GitHub must be treated as leaked and rotated. Partial staging (`git add -p`) is safe: Lefthook hides unstaged changes while Prettier fixes and re-stages files (checked with Lefthook 2.2.2).

AI agents (Claude Code) also run the hooks in `.claude/settings.json`: destructive commands, skipping git hooks, editing the hook files, git config files and the dev container config (listed in `.claude/hooks/rules.mjs`; the scripts in `.claude/hooks/` are reviewed in PRs like other code), merging PRs, pushing to `main`, adding the `ready` label and reading `.env` files are blocked, and every file the agent writes is formatted and linted. The guard fails closed: if it errors, the call is blocked. It matches command text, so it is a safety net, not a security boundary; the `package.json` scripts (e.g. `prepare`) are not protected because agents edit that file routinely. Git hooks and CI remain the gates.
