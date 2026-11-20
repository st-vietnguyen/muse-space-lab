// Runs the hook scripts as real processes, the way Claude Code does: exit code 2 blocks, 0 allows.
// (.mjs because the repo has no Node.js type definitions for node:child_process in TypeScript.)
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
