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

const bin = (name) => `${root}/node_modules/.bin/${name}`;
const run = (cmd, args) => execFileSync(bin(cmd), args, { cwd: root, encoding: "utf8", stdio: "pipe" });

try {
  run("prettier", ["--write", "--ignore-unknown", "--log-level", "warn", file]);
  if (/\.(c|m)?(j|t)sx?$/.test(file)) run("eslint", ["--fix", "--no-warn-ignored", "--max-warnings", "0", file]);
} catch (error) {
  process.stderr.write(`${error.stdout ?? ""}${error.stderr ?? ""}` || String(error));
  process.exit(2);
}
