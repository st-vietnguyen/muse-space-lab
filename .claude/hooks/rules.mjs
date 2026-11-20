// Pure rules for the agent guard (guard.mjs). No I/O, so tests/hooks/ can import it.
// ponytail: regex over the command string is best effort (`bash -c`, variables or aliases can hide a command);
// git hooks and CI stay the real gates.

// `.env`, `.env.local`, globs like `.env*` / `.env.*`; not `.envrc` or `environment.ts`.
const ENV_FILE = /(^|[\s/'"=<>:])\.env([.*][\w.*-]*)?(?![\w.*-])/g;
const ALLOWED_ENV_FILE = ".env.example";
const ENV_REASON = "Blocked: .env files hold secrets (CLAUDE.md §6). Only .env.example may be read.";

// Files that turn the checks off when changed: git hooks, Lefthook config (incl. the local override), gitleaks
// config (allowlists) and this guard itself. Only the owner edits them.
const HOOK_FILE = String.raw`(\.git/hooks\b|\.?lefthook(-local)?\.ya?ml\b|\.gitleaks(\.toml|ignore)\b|\.claude/(settings(\.local)?\.json|hooks/))`;
const HOOK_FILE_PATH = new RegExp(`(^|/)${HOOK_FILE}`);
const HOOK_REASON =
  "Blocked: git hooks, Lefthook and gitleaks config and the agent hooks are changed only by the owner.";
const WRITE_TOOLS = ["Edit", "MultiEdit", "Write", "NotebookEdit"];

// `git` plus any global options before the subcommand (`git -C . push`, `git --no-pager clean`).
// The flag patterns after it use `[^;&|]*` so they stay inside one command (`git push x && rm -f a` is fine).
/** @param {string} subcommand */
const git = (subcommand) => String.raw`\bgit(\s+-\S+(\s+[^\s-]\S*)?)*\s+${subcommand}\b`;

/** @type {[RegExp, string][]} */
const DESTRUCTIVE = [
  [
    new RegExp(
      git("push") + String.raw`[^;&|]*(\s--force(-with-lease)?\b|\s-[a-zA-Z]*f[a-zA-Z]*\b|\s--mirror\b|\s\+\S+)`,
    ),
    "git push --force",
  ],
  [new RegExp(git("reset") + String.raw`[^;&|]*\s--hard\b`), "git reset --hard"],
  [new RegExp(git("clean") + String.raw`[^;&|]*\s-[a-zA-Z]*f`), "git clean -f"],
  [new RegExp(git("branch") + String.raw`[^;&|]*\s(-D\b|--delete\s+--force\b|--force\s+--delete\b)`), "git branch -D"],
];

// Flags that skip hooks. Matched with quoted text removed, so a commit message mentioning them is fine.
/** @type {[RegExp, string][]} */
const SKIP_HOOK_FLAGS = [
  [/--no-verify\b/, "--no-verify"],
  [new RegExp(git("commit") + String.raw`[^;&|]*\s-[a-zA-Z]*n[a-zA-Z]*\b`), "git commit -n"],
];

// Settings and files that turn hooks off. Matched on the raw command, because paths and values are often quoted.
/** @type {[RegExp, string][]} */
const CHANGE_HOOKS = [
  [/\bLEFTHOOK(_EXCLUDE)?=/, "LEFTHOOK=0"],
  [/\bcore\.hooksPath\b/, "core.hooksPath"],
  [/\blefthook\s+uninstall\b/, "lefthook uninstall"],
  [
    new RegExp(String.raw`(\b(rm|mv|cp|ln|chmod|tee|truncate)\b|\bsed\s+-i|>)[^|;&]*${HOOK_FILE}`),
    "writing hook files",
  ],
];

/**
 * `rm` with both a recursive and a force flag, in any order or position (`rm -rf x`, `rm -r x -f`, `rm x -rf`).
 * @param {string} command
 */
function isRmRf(command) {
  return command.split(/[;&|]/).some((segment) => {
    const args = segment.match(/\brm\s+(.*)/)?.[1];
    if (args === undefined) return false;
    const flags = args.split(/\s+/).filter((token) => token.startsWith("-"));
    const recursive = flags.some((f) => /^-[a-zA-Z]*[rR]/.test(f) || f === "--recursive");
    const force = flags.some((f) => /^-[a-zA-Z]*f/.test(f) || f === "--force");
    return recursive && force;
  });
}

/** @param {string} text */
function touchesEnvFile(text) {
  return [...text.matchAll(ENV_FILE)].some((m) => `.env${m[2] ?? ""}` !== ALLOWED_ENV_FILE);
}

/**
 * Returns why the tool call is blocked, or null if it may run.
 * @param {string} toolName
 * @param {Record<string, unknown>} input
 */
export function check(toolName, input) {
  if (toolName === "Bash") {
    const command = String(input.command ?? "");
    // Flags inside quoted text (a commit message) are not flags.
    const unquoted = command.replace(/'[^']*'|"[^"]*"/g, "''");
    if (isRmRf(unquoted)) return "Blocked: destructive command (rm -rf). Ask the owner to run it.";
    for (const [pattern, name] of DESTRUCTIVE) {
      if (pattern.test(unquoted)) return `Blocked: destructive command (${name}). Ask the owner to run it.`;
    }
    for (const [pattern, name] of SKIP_HOOK_FLAGS) {
      if (pattern.test(unquoted)) return `Blocked: skipping or changing git hooks (${name}) is not allowed.`;
    }
    for (const [pattern, name] of CHANGE_HOOKS) {
      if (pattern.test(command)) return `Blocked: skipping or changing git hooks (${name}) is not allowed.`;
    }
    return touchesEnvFile(command) ? ENV_REASON : null;
  }
  // File tools. A Grep `pattern` is a regex over file contents, not a path, so it is not checked.
  const fields = toolName === "Grep" ? ["path", "glob"] : ["file_path", "notebook_path", "path", "pattern"];
  const paths = fields.map((f) => input[f]).filter((v) => typeof v === "string");
  if (WRITE_TOOLS.includes(toolName) && paths.some((p) => HOOK_FILE_PATH.test(p))) return HOOK_REASON;
  return paths.some(touchesEnvFile) ? ENV_REASON : null;
}
