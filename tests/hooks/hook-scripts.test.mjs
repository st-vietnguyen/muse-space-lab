// Runs the hook scripts as real processes, the way Claude Code does: exit code 2 blocks, 0 allows.
// (.mjs because the repo has no Node.js type definitions for node:child_process in TypeScript.)
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { afterEach, expect, test } from "vitest";

const hooks = fileURLToPath(new URL("../../.claude/hooks/", import.meta.url));
const temps = [];
const tempDir = () => {
  // The real path: on macOS the temp folder is a symlink, and the fake tools log the physical `pwd`.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "hooks-test-")));
  temps.push(dir);
  return dir;
};
const run = (script, input, env = {}) =>
  spawnSync("node", [script], { input, encoding: "utf8", env: { ...globalThis.process.env, ...env } });

afterEach(() => temps.splice(0).forEach((dir) => rmSync(dir, { recursive: true })));

test("guard allows a harmless call", () => {
  const result = run(
    join(hooks, "guard.mjs"),
    JSON.stringify({ tool_name: "Bash", tool_input: { command: "pnpm lint" } }),
  );
  expect(result.status).toBe(0);
});

test("guard blocks a forbidden call with exit 2 and a reason", () => {
  const result = run(
    join(hooks, "guard.mjs"),
    JSON.stringify({ tool_name: "Bash", tool_input: { command: "git reset --hard" } }),
  );
  expect(result.status).toBe(2);
  expect(result.stderr).toMatch(/destructive/);
});

test("guard fails closed on input it cannot parse", () => {
  const result = run(join(hooks, "guard.mjs"), "not json");
  expect(result.status).toBe(2);
  expect(result.stderr).toMatch(/fails closed/);
});

test("guard fails closed when rules.mjs is broken", () => {
  const dir = tempDir();
  cpSync(join(hooks, "guard.mjs"), join(dir, "guard.mjs"));
  writeFileSync(join(dir, "rules.mjs"), "export const check = (");
  const result = run(
    join(dir, "guard.mjs"),
    JSON.stringify({ tool_name: "Bash", tool_input: { command: "pnpm lint" } }),
  );
  expect(result.status).toBe(2);
  expect(result.stderr).toMatch(/fails closed/);
});

test("format hook reports a readable error when Prettier is not installed (fresh clone)", () => {
  const dir = tempDir();
  const file = join(dir, "a.ts");
  writeFileSync(file, "export const a = 1;\n");
  const result = run(join(hooks, "format.mjs"), JSON.stringify({ tool_input: { file_path: file } }), {
    CLAUDE_PROJECT_DIR: dir,
  });
  expect(result.status).toBe(2);
  expect(result.stderr).toMatch(/prettier/);
});

// Fake prettier/eslint binaries in `dir` that log their calls and working directory; eslint fails when the file says
// LINT_ERROR. Returns a reader for the log.
const fakeTools = (dir) => {
  const bin = join(dir, "node_modules", ".bin");
  mkdirSync(bin, { recursive: true });
  const log = join(dir, "calls.log");
  writeFileSync(join(bin, "prettier"), `#!/bin/sh\necho "prettier $* cwd=$(pwd)" >> "${log}"\n`, { mode: 0o755 });
  writeFileSync(
    join(bin, "eslint"),
    `#!/bin/sh\necho "eslint $* cwd=$(pwd)" >> "${log}"\nfor f; do :; done\nif grep -q LINT_ERROR "$f"; then echo "1:1 error fake-rule"; exit 1; fi\n`,
    { mode: 0o755 },
  );
  return () => (existsSync(log) ? readFileSync(log, "utf8") : "");
};

// A project dir with the fake tools installed.
const fakeProject = () => {
  const root = tempDir();
  const calls = fakeTools(root);
  const format = (file) =>
    run(join(hooks, "format.mjs"), JSON.stringify({ tool_input: { file_path: file } }), { CLAUDE_PROJECT_DIR: root });
  return { root, calls, format };
};

test("format hook runs Prettier and ESLint on a file in the project", () => {
  const { root, calls, format } = fakeProject();
  const file = join(root, "a.ts");
  writeFileSync(file, "export const a = 1;\n");
  expect(format(file).status).toBe(0);
  expect(calls()).toMatch(/prettier --write .*a\.ts/);
  expect(calls()).toMatch(/eslint --fix .*a\.ts/);
});

test("format hook sends remaining lint errors back to the agent", () => {
  const { root, format } = fakeProject();
  const file = join(root, "a.ts");
  writeFileSync(file, "// LINT_ERROR\n");
  const result = format(file);
  expect(result.status).toBe(2);
  expect(result.stderr).toMatch(/fake-rule/);
});

test.each([
  ["a file outside the project", (root) => join(root, "..", "outside-sibling", "x.ts")],
  ["a path that leaves the project with ..", (root) => `${root}/../x.ts`],
])("format hook ignores %s", (_, pathFor) => {
  const { root, calls, format } = fakeProject();
  expect(format(pathFor(root)).status).toBe(0);
  expect(calls()).toBe("");
});

test("should format a worktree file with the worktree's own tools, run from the worktree root", () => {
  const { root, calls, format } = fakeProject();
  const worktree = join(root, ".claude", "worktrees", "003-story-clock");
  const worktreeCalls = fakeTools(worktree);
  const file = join(worktree, "packages", "story-schema", "src", "a.ts");
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, "export const a = 1;\n");
  expect(format(file).status).toBe(0);
  expect(worktreeCalls()).toContain(`prettier --write --ignore-unknown --log-level warn ${file} cwd=${worktree}\n`);
  expect(worktreeCalls()).toContain(`eslint --fix --no-warn-ignored --max-warnings 0 ${file} cwd=${worktree}\n`);
  expect(calls()).toBe("");
});

test("should report an error, not fall back to the project's tools, when a worktree has no tools installed", () => {
  const { root, calls, format } = fakeProject();
  const worktree = join(root, ".claude", "worktrees", "003-story-clock");
  mkdirSync(worktree, { recursive: true });
  const file = join(worktree, "a.ts");
  writeFileSync(file, "export const a = 1;\n");
  const result = format(file);
  expect(result.status).toBe(2);
  expect(result.stderr).toContain(join(worktree, "node_modules", ".bin", "prettier"));
  expect(calls()).toBe("");
});

test.each([
  ["a file directly in the worktrees folder", (root) => join(root, ".claude", "worktrees", "a.ts")],
  ["a path that leaves a worktree with ..", (root) => `${root}/.claude/worktrees/w1/../../a.ts`],
  ["a file in a folder with a similar name", (root) => join(root, ".claude", "worktrees-old", "w1", "a.ts")],
])("should format %s with the project's tools, not a worktree's", (_, pathFor) => {
  const { root, calls, format } = fakeProject();
  const worktreeCalls = fakeTools(join(root, ".claude", "worktrees", "w1"));
  const file = pathFor(root);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, "export const a = 1;\n");
  expect(format(file).status).toBe(0);
  expect(calls()).toContain(`cwd=${root}\n`);
  expect(worktreeCalls()).toBe("");
});

// Lint, the boundary rules and the tests skip .claude/worktrees/, so a committed file there would never be checked.
test("should keep the worktrees folder out of git", () => {
  const repo = fileURLToPath(new URL("../../", import.meta.url));
  const result = spawnSync("git", ["ls-files", "--", ".claude/worktrees"], { cwd: repo, encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe("");
});
