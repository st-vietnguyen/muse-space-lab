import { describe, expect, test } from "vitest";
import { check } from "../../.claude/hooks/rules.mjs";

const bash = (command: string) => check("Bash", { command });

describe("agent guard blocks", () => {
  test.each([
    "rm -rf node_modules",
    "rm -fr dist",
    "rm -r -f dist",
    "rm --recursive --force dist",
    "cd x && rm -Rf y",
    "rm -r build -f",
    "rm build -rf",
    "git push --force",
    "git push -f origin main",
    "git push --force-with-lease",
    "git push origin +main",
    "git reset --hard HEAD~1",
    "git clean -fd",
    "git branch -D old",
    "git -C . push --force",
    "git -C . reset --hard",
    "git --no-pager clean -fd",
    "git -c core.pager=cat branch -D old",
  ])("destructive: %s", (command) => {
    expect(bash(command)).toMatch(/destructive/);
  });

  test.each([
    "git commit --no-verify -m x",
    "git commit -n -m x",
    "git commit -anm x",
    "git -C . commit -n -m x",
    "git push --no-verify",
    "LEFTHOOK=0 git commit -m x",
    "git config core.hooksPath /dev/null",
    "pnpm exec lefthook uninstall",
    "rm .git/hooks/pre-commit",
    "echo exit 0 > .git/hooks/pre-commit",
    "sed -i '' 's/gitleaks/true/' lefthook.yml",
    "cp /tmp/x .claude/settings.json",
    `echo x > ".git/hooks/pre-commit"`,
    `git config "core.hooksPath" /dev/null`,
    "echo x > lefthook-local.yml",
    "cp /tmp/x .gitleaksignore",
  ])("skipping git hooks: %s", (command) => {
    expect(bash(command)).toMatch(/git hooks/);
  });

  test.each([
    "gh pr merge 12 --merge",
    "gh pr merge --squash --auto",
    "cd x && gh pr merge",
    "gh api -X PUT repos/o/r/pulls/12/merge",
    "git push origin main",
    "git push origin HEAD:main",
    "git push -u origin feature:main",
    "git -C . push origin main",
    'git push origin "main"',
    "git push origin feature:'main'",
    "git push origin HEAD:refs/heads/main",
    "git push --all origin",
    "git push origin HEAD:heads/main",
    "gh api graphql -f query='mutation { enablePullRequestAutoMerge(input: {pullRequestId: \"x\"}) { clientMutationId } }'",
    "gh api -X PATCH repos/o/r/git/refs/heads/main -f sha=abc",
    "gh -R o/r pr merge 5",
    "gh --repo o/r pr merge 5",
    "gh pr -R o/r merge 5",
    "gh --repo=o/r pr merge 5",
    `git commit -m "don't" && gh pr merge 5 && echo "it's ok"`,
    String.raw`echo \"\'\" \' ; gh pr merge 1 ; echo \'`,
    'bash -c "gh pr merge 12 --merge"',
    'echo "$(gh pr merge 12 --merge)"',
    'out="$(gh pr merge 12 --squash)"',
    "git push \\\n  origin main",
    "git push origin \\\n  main",
    "gh api \\\n  -X PUT repos/o/r/pulls/1/merge",
    "gh api -X POST repos/o/r/merges -f base=main -f head=x",
    "gh api graphql -f query='mutation { mergePullRequest(input: {pullRequestId: \"x\"}) { clientMutationId } }'",
  ])("merging or pushing to main: %s", (command) => {
    expect(bash(command)).toMatch(/owner merges/);
  });

  test.each([
    "gh issue edit 6 --add-label ready",
    "gh issue edit 6 --remove-label needs-review --add-label ready",
    'gh issue edit 6 --add-label "ready"',
    "gh issue edit 6 --add-label=ready",
    "gh issue edit 6 --add-label bug,ready",
    "gh api repos/o/r/issues/6/labels -f 'labels[]=ready'",
    'gh issue edit 6 --add-label "bug, ready"',
    "gh issue edit 6 --add-label Ready",
    "gh issue create --title x --label ready",
    "gh issue create -t x -l ready",
    "gh issue create --title x --label=bug,ready",
    "gh issue edit 5 \\\n  --add-label ready",
    "gh issue --repo o/r edit 5 --add-label ready",
    "gh -R o/r issue edit 5 --add-label ready",
  ])("adding the ready label: %s", (command) => {
    expect(bash(command)).toMatch(/owner approves/);
  });

  test.each(["cat .env", "less .env.local", "grep KEY apps/api/.env", "cp .env.production /tmp/x", "source ./.env"])(
    ".env in a command: %s",
    (command) => {
      expect(bash(command)).toMatch(/\.env files/);
    },
  );

  test.each([
    ["Read", { file_path: "/repo/.env" }],
    ["Read", { file_path: "/repo/apps/api/.env.local" }],
    ["Edit", { file_path: "/repo/.env" }],
    ["Write", { file_path: "/repo/.env.production" }],
    ["Grep", { pattern: "KEY", path: "/repo/.env" }],
    ["Grep", { pattern: "KEY", glob: ".env*" }],
    ["Glob", { pattern: "**/.env.*" }],
  ])(".env in a file tool: %s %o", (tool, input) => {
    expect(check(tool, input)).toMatch(/\.env files/);
  });

  test.each([
    ["Write", { file_path: "/repo/.git/hooks/pre-commit" }],
    ["Edit", { file_path: "/repo/lefthook.yml" }],
    ["Edit", { file_path: "/repo/.claude/settings.json" }],
    ["Write", { file_path: "/repo/.claude/settings.local.json" }],
    ["Write", { file_path: "/repo/lefthook-local.yml" }],
    ["Write", { file_path: "/repo/.lefthook.yaml" }],
    ["Write", { file_path: "/repo/.gitleaks.toml" }],
    ["Edit", { file_path: "/repo/.gitleaksignore" }],
  ])("writing hook files: %s %o", (tool, input) => {
    expect(check(tool, input)).toMatch(/hooks/);
  });

  test.each([
    ["Write", { file_path: "/repo/.devcontainer/devcontainer.json" }],
    ["Edit", { file_path: "/repo/.devcontainer/Dockerfile" }],
    ["MultiEdit", { file_path: ".devcontainer/devcontainer.json" }],
    ["Write", { file_path: "/repo/.devcontainer/agent/devcontainer.json" }],
    ["Write", { file_path: "/repo/.devcontainer.json" }],
    ["Edit", { file_path: "/repo/.git/config" }],
    ["Write", { file_path: "/repo/.git/config.worktree" }],
    ["Edit", { file_path: "/home/vscode/.gitconfig" }],
    ["Edit", { file_path: "~/.gitconfig" }],
    ["Write", { file_path: "/home/vscode/.config/git/config" }],
    ["Edit", { file_path: "/opt/homebrew/etc/gitconfig" }],
    // A linked worktree's .git is a file pointing to its git folder.
    ["Write", { file_path: "/repo/.git" }],
    // macOS file systems ignore case; paths are normalized first.
    ["Write", { file_path: "/repo/.DevContainer/devcontainer.json" }],
    ["Edit", { file_path: "~/.GitConfig" }],
    ["Edit", { file_path: "/repo/.claude/Settings.json" }],
    ["Edit", { file_path: "/repo/.git/./config" }],
    ["Edit", { file_path: "/repo/.git//config" }],
    ["Edit", { file_path: "/repo/.git/x/../config" }],
    // A linked worktree's own config and its pointer files.
    ["Write", { file_path: "/repo/.git/worktrees/wt/config.worktree" }],
    ["Write", { file_path: "/repo/.git/worktrees/wt/commondir" }],
  ])("should block writing owner-only files with a file tool, in any case or path form: %s %o", (tool, input) => {
    expect(check(tool, input)).toMatch(/only by the owner/);
  });

  test.each([
    "sed -i 's/x/y/' .devcontainer/devcontainer.json",
    "echo '{}' > .devcontainer.json",
    "cp /tmp/x .devcontainer/Dockerfile",
    "mv /tmp/x .devcontainer/devcontainer.json",
    "tee .devcontainer/devcontainer.json < /tmp/x",
    "printf '[core]' >> .git/config",
    "cp /tmp/x ~/.gitconfig",
    "tee -a ~/.config/git/config < /tmp/x",
    "echo x > .git/worktrees/wt/commondir",
    // The folder as the target.
    "cp /tmp/x/devcontainer.json .devcontainer",
    "cp -R /tmp/dc/. .devcontainer",
    "rm -r .devcontainer",
    "cp /tmp/x/config .git/",
    "cp /tmp/x/config ~/.config/git/",
    // Other redirects and in-place edits; case-insensitive file systems.
    "printf '{}' >| .devcontainer.json",
    "printf x >& .git/config",
    "echo x >1/../.git/hooks/pre-commit",
    "sed -E -i 's/a/b/' ~/.gitconfig",
    "sed -Ei 's/a/b/' .git/config",
    "sed --in-place 's/a/b/' .devcontainer/devcontainer.json",
    "sed --in 's/a/b/' .git/config",
    "echo x > .GIT/CONFIG",
  ])("should block writing the dev container or git config from Bash: %s", (command) => {
    expect(bash(command)).toMatch(/only by the owner/);
  });

  test.each([
    "git config core.hookspath /dev/null",
    "git config CORE.HOOKSPATH /dev/null",
    // An include or another global or system config file.
    "git config include.path /tmp/x",
    "git config --global include.path /tmp/x",
    "git config INCLUDE.PATH /tmp/x",
    "git config 'includeIf.gitdir:/workspaces/.path' /tmp/x",
    `git config "includeIf.gitdir:**/muse[ -]space-lab/.path" /tmp/x`,
    "GIT_CONFIG_GLOBAL=/tmp/x git commit -m x",
    "GIT_CONFIG_GLOBAL+=/tmp/x git commit -m x",
    "export GIT_CONFIG_SYSTEM=/tmp/x",
    "XDG_CONFIG_HOME=/tmp/x git commit -m x",
    "LEFTHOOK+=0 git commit -m x",
    // Renaming a section, or the config editor; git accepts a unique prefix of a long option.
    "git config rename-section x core",
    "git config --rename-section x include",
    "git config --rename-s x core",
    "git -c core.editor='cp /tmp/x' config edit",
    "GIT_EDITOR='cp /tmp/x' git config --ed",
    "git config --global -e",
    "git config -ze",
    "git config --edit",
  ])("should block setting core.hooksPath from Bash, also without naming it: %s", (command) => {
    expect(bash(command)).toMatch(/changing git hooks/);
  });
});

describe("agent guard allows", () => {
  test.each([
    "rm -r packages/tmp",
    "rm -f notes.txt",
    "git push -u origin 001-boundary-rules",
    "git reset --soft HEAD~1",
    "git -C . status",
    "git --no-pager log --oneline -5",
    "git push origin x && rm -f a",
    "git push -q; gh api repos/x -f body=y",
    "git commit -m x && pnpm foo -n",
    "rm -r build; ls -f",
    "git branch -d merged",
    "git commit -m 'fix -n handling'",
    "cat .env.example",
    "cat .envrc",
    "grep -rn dotenv src",
    "pnpm lint",
    "ls .git/hooks",
    "gh pr ready 12",
    "gh pr view 12 --json mergeable",
    "gh -R o/r pr view 12 --json mergedAt",
    "gh -R o/r pr list --search merge",
    "gh pr edit 12 --add-label claude-review",
    "gh issue edit 6 --add-label needs-review",
    "gh issue edit 6 --remove-label ready",
    "git push -u origin 002-story-schema",
    "git push origin main-docs",
    "git switch main && git pull",
    "git merge main",
    'git push origin "main-docs"',
    "git commit -m 'T001: block gh pr merge in the guard'",
    "gh issue create --title x --label needs-review",
    "gh issue list -l ready",
    "ls -l ready.txt",
    "git push -u origin 002-x\ngit switch main",
    // The guard code is reviewed in the PR like any code; only hook registration and config are owner-only.
    "echo '' > .claude/hooks/rules.mjs",
  ])("%s", (command) => {
    expect(bash(command)).toBeNull();
  });

  test.each([
    ["Read", { file_path: "/repo/.env.example" }],
    ["Read", { file_path: "/repo/src/environment.ts" }],
    ["Grep", { pattern: "\\.env", path: "/repo/src" }],
    ["Glob", { pattern: "**/*.ts" }],
    ["Read", { file_path: "/repo/lefthook.yml" }],
    ["Read", { file_path: "/repo/.claude/hooks/rules.mjs" }],
    ["Edit", { file_path: "/repo/tests/hooks/guard.test.ts" }],
    ["MultiEdit", { file_path: "/repo/.claude/hooks/rules.mjs" }],
    ["Write", { file_path: "/repo/.claude/hooks/format.mjs" }],
  ])("%s %o", (tool, input) => {
    expect(check(tool, input)).toBeNull();
  });

  test.each([
    ["Read", { file_path: "/repo/.devcontainer/devcontainer.json" }],
    ["Read", { file_path: "/repo/.git/config" }],
    ["Write", { file_path: "/repo/docs/devcontainer.md" }],
    ["Write", { file_path: "/repo/src/gitconfig-parser.ts" }],
    ["Write", { file_path: "/repo/src/git/config.ts" }],
    ["Write", { file_path: "/repo/src/git/config/index.ts" }],
    ["Write", { file_path: "/repo/.gitignore" }],
    ["Write", { file_path: "/repo/.github/workflows/ci.yml" }],
    ["Write", { file_path: "/repo/.devcontainer/../docs/x.md" }],
  ])("should allow reading the dev container and git config, and writing similar names: %s %o", (tool, input) => {
    expect(check(tool, input)).toBeNull();
  });

  test.each([
    "cat .devcontainer/devcontainer.json",
    "cat .git/config",
    "sed -n '1,5p' .git/config",
    "git config user.name x",
    "git config --global --add safe.directory /workspaces/muse-space-lab",
    "git config --get remote.origin.url",
    "git config --get-regexp alias",
    `git config --global core.editor "code --wait"`,
    "printenv GIT_CONFIG_GLOBAL",
    "echo x >> .gitignore",
    "cp -r /tmp/mirror.git /tmp/backup",
    // `2>&1` copies a stream and writes no file.
    "cat 2>&1 .git/config",
    // A redirect on one line does not reach a path on the next one.
    "git status --short 2>/dev/null\ncat .git/config",
  ])(
    "should allow reading the dev container and git config, other git config keys and similar names: %s",
    (command) => {
      expect(bash(command)).toBeNull();
    },
  );
});
