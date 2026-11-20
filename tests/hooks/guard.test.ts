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
});
