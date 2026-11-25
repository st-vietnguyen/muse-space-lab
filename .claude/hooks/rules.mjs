// Pure rules for the agent guard (guard.mjs). No I/O, so tests/hooks/ can import it.
// ponytail: regex over the command string is best effort (`bash -c`, variables or aliases can hide a command);
// git hooks and CI stay the real gates.

// `.env`, `.env.local`, globs like `.env*` / `.env.*`; not `.envrc` or `environment.ts`.
const ENV_FILE = /(^|[\s/'"=<>:])\.env([.*][\w.*-]*)?(?![\w.*-])/g;
const ALLOWED_ENV_FILE = ".env.example";
const ENV_REASON = "Blocked: .env files hold secrets (CLAUDE.md §6). Only .env.example may be read.";

// Files that turn the checks off, or reach outside the dev container, when changed. Only the owner edits them.
// Matched ignoring case, because macOS file systems do. The hook scripts in .claude/hooks/ are not listed: they are
// code, reviewed in the PR like any other code.
const HOOK_FILE = `(${[
  String.raw`\.git/hooks\b`,
  // Git config can set core.hooksPath: .git/config(.worktree), ~/.config/git/config, or their folder as a target;
  // ~/.gitconfig and the system gitconfig; a linked worktree's config.worktree and its pointer files.
  String.raw`(\.git|\.config/git)(/config(\.worktree)?)?/?(?![\w./-])`,
  String.raw`\.git/worktrees\b`,
  String.raw`\.?gitconfig(?![\w./-])`,
  // Lefthook config (incl. the local override), gitleaks config (allowlists), the Claude Code settings that register
  // the agent hooks.
  String.raw`\.?lefthook(-local)?\.ya?ml\b`,
  String.raw`\.gitleaks(\.toml|ignore)\b`,
  String.raw`\.claude/settings(\.local)?\.json\b`,
  // Dev container config: initializeCommand runs on the host, mounts bring host files in.
  String.raw`\.devcontainer(\.json)?(?![\w.-])`,
].join("|")})`;
const HOOK_FILE_PATH = new RegExp(`(^|/)${HOOK_FILE}`, "i");
// A write (rm, mv, cp, ln, chmod, tee, truncate, dd, install, sed -i, a redirect but not `2>&1`) to one of them on the
// same line.
// ponytail: a write whose target is on a later line (inside `$(...)` or quotes) is missed; the newline limit is what
// lets `cmd 2>/dev/null` followed by `cat .git/config` through.
const WRITE_HOOK_FILE = new RegExp(
  String.raw`(\b(rm|mv|cp|ln|chmod|tee|truncate|dd|install)\b|\bsed\b[^|;&\n]*\s(-[a-zA-Z]*i|--i[\w-]*)|>(\||&(?!\d))?)[^|;&\n]*(?<![\w.-])${HOOK_FILE}`,
  "i",
);
// A cd into a folder that holds one of them, at any depth: a write after it can use a relative path
// (`cd .git/info && echo x > ../config`). Only where a command can start, so `--format=%cd` or "CI/CD" is not a cd.
// Keep the list in step with HOOK_FILE.
// ponytail: it also blocks reading there (`cd .git && git log`) and a cd into `.claude/hooks` or `.claude/skills`, whose
// files agents may edit; match `.claude` only as the last part if that gets in the way and `../settings.json` is accepted.
const CD_HOOK_DIR =
  /(?<![^\s;&|(`])(cd|pushd|chdir)\b[^|;&\n]*(?<![\w.-])(\.git|\.config|\.claude|\.devcontainer)(?![\w.-])/i;
const HOOK_REASON =
  "Blocked: git hooks, git config files, Lefthook and gitleaks config, Claude Code settings and the dev container config are changed only by the owner.";
const WRITE_TOOLS = ["Edit", "MultiEdit", "Write", "NotebookEdit"];

// Options between the words of a command, each with an optional value (`git -C . push`, `gh -R o/r pr merge`).
const FLAGS = String.raw`(\s+-\S+(\s+[^\s-]\S*)?)*`;

// `git` plus any global options before the subcommand (`git -C . push`, `git --no-pager clean`).
// The flag patterns after it use `[^;&|]*` so they stay inside one command (`git push x && rm -f a` is fine).
/** @param {string} subcommand */
const git = (subcommand) => String.raw`\bgit${FLAGS}\s+${subcommand}\b`;

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

// Settings and commands that turn hooks off. Matched on `rawAndJoined`, because keys and values are often quoted. `+=`
// sets a variable too.
/** @type {[RegExp, string][]} */
const CHANGE_HOOKS = [
  [/\bLEFTHOOK(_EXCLUDE)?\+?=/, "LEFTHOOK=0"],
  // Git config keys are case-insensitive. An include, another global or system config file, renaming a section or the
  // config editor can set core.hooksPath without naming it; git accepts a unique prefix of a long option (`--ed`).
  [/\bcore\.hooksPath\b/i, "core.hooksPath"],
  [/\binclude(If\.|\.path\b)/i, "include.path"],
  [/\b(GIT_CONFIG\w*|XDG_CONFIG_HOME)\+?=/, "GIT_CONFIG_*"],
  [
    /\bgit\b[^;&|\n]*\sconfig\b[^;&|\n]*\s(-[a-z]*e|--ed\w*|edit|--ren[\w-]*|rename-section)(?![\w-])/,
    "git config edit",
  ],
  [/\blefthook\s+uninstall\b/, "lefthook uninstall"],
];

// Only the owner merges and approves issues (CLAUDE.md §2.1).
// `gh pr merge` is matched with single-quoted text removed (it never runs), so `-m '... gh pr merge ...'` is fine;
// double quotes can run `$(...)`. The others are matched on the raw command, because refs, queries and labels are often
// quoted; `[^;&|\n]` keeps them in one command (line continuations are joined first).
// ponytail: a plain `git push` while on main is not caught (no refspec to read); branch protection would catch it.
const PR_MERGE = new RegExp(String.raw`\bgh${FLAGS}\s+pr${FLAGS}\s+merge\b`);
const MERGE = [
  /\bgh\s+api\b[^;&|\n]*(\/merges?\b|mergePullRequest|enablePullRequestAutoMerge|git\/refs\/heads\/main\b)/,
  new RegExp(git("push") + String.raw`[^;&|\n]*(\s--all\b|(\s|:|heads/)["']?main["']?(?![\w./-]))`),
];
const MERGE_REASON = "Blocked: only the owner merges PRs and pushes to main (CLAUDE.md §2.1).";
// GitHub matches label names case-insensitively; a label list may have spaces after commas.
const READY_LABEL = [
  /\bgh\s[^;&|\n]*\b(issue|pr)\s[^;&|\n]*\b(create|edit)\b[^;&|\n]*(--add-label|--label|\s-l)[=\s]+["']?([^\s"',]*,\s*)*ready(?![\w-])/i,
  /\bgh\s+api\b[^;&|\n]*labels[^;&|\n]*\bready(?![\w-])/i,
];
const READY_REASON = "Blocked: the owner approves an issue by adding the label ready (CLAUDE.md §2.1).";

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

/**
 * Resolves `.` and `..` and drops repeated slashes, so `.git/x/../config` and `.git//config` read as `.git/config`.
 * @param {string} path
 */
function normalize(path) {
  /** @type {string[]} */
  const parts = [];
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== "." && part !== "") parts.push(part);
  }
  return (path.startsWith("/") ? "/" : "") + parts.join("/");
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
    // A backslash-newline continues the same command.
    const command = String(input.command ?? "").replace(/\\\n/g, " ");
    // Flags inside quoted text (a commit message) are not flags.
    const unquoted = command.replace(/'[^']*'|"[^"]*"/g, "''");
    // Two ways to drop single-quoted text; a merge found by either is blocked. The first skips `'` inside double
    // quotes (`"don't"`), the second covers a `"` the shell does not treat as a quote (`\"`, comments, heredocs).
    const singleUnquoted = [
      command.replace(/"[^"]*"|'[^']*'/g, (m) => (m[0] === "'" ? "''" : m)),
      command.replace(/'[^']*'/g, "''"),
    ];
    // Quotes and backslashes removed: the words as the shell joins them (`core.hooks''Path`, `.gi''t/config`). The raw
    // command is checked too: it keeps the word boundary a quote gives (`env -S'LEFTHOOK=0'`).
    const rawAndJoined = [command, command.replace(/['"\\]/g, "")];
    if (isRmRf(unquoted)) return "Blocked: destructive command (rm -rf). Ask the owner to run it.";
    for (const [pattern, name] of DESTRUCTIVE) {
      if (pattern.test(unquoted)) return `Blocked: destructive command (${name}). Ask the owner to run it.`;
    }
    for (const [pattern, name] of SKIP_HOOK_FLAGS) {
      if (pattern.test(unquoted)) return `Blocked: skipping or changing git hooks (${name}) is not allowed.`;
    }
    for (const [pattern, name] of CHANGE_HOOKS) {
      if (rawAndJoined.some((text) => pattern.test(text)))
        return `Blocked: skipping or changing git hooks (${name}) is not allowed.`;
    }
    if (rawAndJoined.some((text) => WRITE_HOOK_FILE.test(text) || CD_HOOK_DIR.test(text))) return HOOK_REASON;
    if (singleUnquoted.some((text) => PR_MERGE.test(text)) || MERGE.some((pattern) => pattern.test(command)))
      return MERGE_REASON;
    if (READY_LABEL.some((pattern) => pattern.test(command))) return READY_REASON;
    return touchesEnvFile(command) ? ENV_REASON : null;
  }
  // File tools. A Grep `pattern` is a regex over file contents, not a path, so it is not checked.
  const fields = toolName === "Grep" ? ["path", "glob"] : ["file_path", "notebook_path", "path", "pattern"];
  const paths = fields.map((f) => input[f]).filter((v) => typeof v === "string");
  if (WRITE_TOOLS.includes(toolName) && paths.some((p) => HOOK_FILE_PATH.test(normalize(p)))) return HOOK_REASON;
  return paths.some(touchesEnvFile) ? ENV_REASON : null;
}
