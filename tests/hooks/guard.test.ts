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
    "git push --force",
    "git push -f origin main",
    "git push --force-with-lease",
    "git push origin +main",
    "git reset --hard HEAD~1",
    "git clean -fd",
    "git branch -D old",
  ])("destructive: %s", (command) => {
    expect(bash(command)).toMatch(/destructive/);
  });

  test.each([
    "git commit --no-verify -m x",
    "git commit -n -m x",
    "git commit -anm x",
    "git push --no-verify",
    "LEFTHOOK=0 git commit -m x",
    "git config core.hooksPath /dev/null",
    "pnpm exec lefthook uninstall",
    "rm .git/hooks/pre-commit",
    "echo exit 0 > .git/hooks/pre-commit",
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
});

describe("agent guard allows", () => {
  test.each([
    "rm -r packages/tmp",
    "rm -f notes.txt",
    "git push -u origin 001-boundary-rules",
    "git reset --soft HEAD~1",
    "git branch -d merged",
    "git commit -m 'fix -n handling'",
    "cat .env.example",
    "cat .envrc",
    "grep -rn dotenv src",
    "pnpm lint",
    "ls .git/hooks",
  ])("%s", (command) => {
    expect(bash(command)).toBeNull();
  });

  test.each([
    ["Read", { file_path: "/repo/.env.example" }],
    ["Read", { file_path: "/repo/src/environment.ts" }],
    ["Grep", { pattern: "\\.env", path: "/repo/src" }],
    ["Glob", { pattern: "**/*.ts" }],
  ])("%s %o", (tool, input) => {
    expect(check(tool, input)).toBeNull();
  });
});
