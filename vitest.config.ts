import { configDefaults, defineConfig } from "vitest/config";

// Worktrees are full copies of the repo; each one runs its own tests from its own root.
export default defineConfig({ test: { exclude: [...configDefaults.exclude, ".claude/worktrees/**"] } });
