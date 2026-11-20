// PreToolUse hook: blocks destructive commands, skipping git hooks, and access to .env files.
// Exit code 2 blocks the tool call and shows the reason to the agent.
import { check } from "./rules.mjs";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const { tool_name: toolName, tool_input: toolInput } = JSON.parse(raw);

const reason = check(toolName, toolInput ?? {});
if (reason) {
  process.stderr.write(reason + "\n");
  process.exit(2);
}
