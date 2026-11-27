// PostToolUse hook: formats and lints a file right after the agent writes it.
// Remaining lint errors exit with code 2, so the agent sees them and fixes them.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const input = JSON.parse(raw).tool_input?.file_path;
const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
// Normalize first, so a path such as <root>/../x cannot pass the prefix check.
const file = typeof input === "string" ? resolve(input) : "";
if (!file.startsWith(root + "/")) process.exit(0);

// A file in a git worktree (.claude/worktrees/<name>/) is checked from that worktree, with its tools and config:
// from the project root it is ignored (.gitignore, eslint.config.js) and path-based ESLint rules (packages/...)
// would not match it. A new worktree needs `pnpm install` first.
const worktree = file.slice(root.length).match(/^\/\.claude\/worktrees\/[^/]+(?=\/)/)?.[0];
const base = root + (worktree ?? "");
const run = (cmd, args) =>
  execFileSync(`${base}/node_modules/.bin/${cmd}`, args, { cwd: base, encoding: "utf8", stdio: "pipe" });

try {
  run("prettier", ["--write", "--ignore-unknown", "--log-level", "warn", file]);
  if (/\.(c|m)?(j|t)sx?$/.test(file)) run("eslint", ["--fix", "--no-warn-ignored", "--max-warnings", "0", file]);
} catch (error) {
  process.stderr.write(`${error.stdout ?? ""}${error.stderr ?? ""}` || String(error));
  process.exit(2);
}
