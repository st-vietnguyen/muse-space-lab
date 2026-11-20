// PreToolUse hook: blocks destructive commands, skipping git hooks, and access to .env files.
// Exit code 2 blocks the tool call and shows the reason to the agent. Any other failure would let the
// call run, so every error (bad input, a broken rules.mjs) blocks too: the guard fails closed.
let reason;
try {
  const { check } = await import("./rules.mjs");
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const { tool_name: toolName, tool_input: toolInput } = JSON.parse(raw);
  reason = check(toolName, toolInput ?? {});
} catch (error) {
  reason = `Blocked: the agent guard failed, so it fails closed (${error}). Ask the owner.`;
}
if (reason) {
  process.stderr.write(reason + "\n");
  process.exit(2);
}
