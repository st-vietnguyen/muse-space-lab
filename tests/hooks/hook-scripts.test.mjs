// Runs the hook scripts as real processes, the way Claude Code does: exit code 2 blocks, 0 allows.
// (.mjs because the repo has no Node.js type definitions for node:child_process in TypeScript.)
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { afterEach, expect, test } from "vitest";

const hooks = fileURLToPath(new URL("../../.claude/hooks/", import.meta.url));
const temps = [];
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "hooks-test-"));
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

// A project dir with fake prettier/eslint binaries that log their calls; eslint fails when the file says LINT_ERROR.
const fakeProject = () => {
  const root = tempDir();
  const bin = join(root, "node_modules", ".bin");
  mkdirSync(bin, { recursive: true });
  const log = join(root, "calls.log");
  writeFileSync(join(bin, "prettier"), `#!/bin/sh\necho "prettier $*" >> "${log}"\n`, { mode: 0o755 });
  writeFileSync(
    join(bin, "eslint"),
    `#!/bin/sh\necho "eslint $*" >> "${log}"\nfor f; do :; done\nif grep -q LINT_ERROR "$f"; then echo "1:1 error fake-rule"; exit 1; fi\n`,
    { mode: 0o755 },
  );
  const calls = () => (existsSync(log) ? readFileSync(log, "utf8") : "");
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
