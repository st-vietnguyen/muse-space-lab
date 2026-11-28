import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Worktrees are full copies of the repo; each one runs its own tests from its own root.
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
    // `pnpm test:coverage` prints which lines and branches of the product code no test runs (CLAUDE.md §2 Implement).
    // No thresholds: the review of each task reads the report for the files the task changed.
    coverage: { provider: "v8", include: ["packages/*/src/**", "apps/*/src/**"], reporter: ["text"] },
  },
});
