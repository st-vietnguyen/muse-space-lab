// Architecture boundaries: CLAUDE.md §3 rules 3–7, spec specs/001-boundary-rules.
// Paths are relative to the repo root. On a violation, fix the code; never loosen a rule.
// Proven by tests/boundaries/ against tests/fixtures/boundaries/.

const SUPABASE = "(^|node_modules/)@supabase/";
const DB = "(^|node_modules/)(drizzle-orm|drizzle-kit|postgres|pg)(/|$)";
const PURE = "^packages/(story-schema|gallery-layout|domain)/";

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: "supabase-only-api-and-sign-in",
      comment: "Rule 3: only apps/api and the web sign-in area (apps/web/src/auth/) may use the Supabase SDK.",
      severity: "error",
      from: { pathNot: ["^apps/api/", "^apps/web/src/auth/"] },
      to: { path: SUPABASE },
    },
    {
      name: "db-only-api",
      comment: "Rule 4: only apps/api may use a database driver or ORM.",
      severity: "error",
      from: { pathNot: "^apps/api/" },
      to: { path: DB },
    },
    {
      name: "visitor-no-backend",
      comment: "Rule 5: Visitor pages never reach the Creator area, sign-in, the API, Supabase or the database.",
      severity: "error",
      from: { path: "^apps/web/src/visitor-experience/" },
      to: {
        reachable: true,
        path: ["^apps/web/src/(creator-studio|auth)/", "^apps/api/", SUPABASE, DB],
      },
    },
    {
      name: "pure-no-node-builtins",
      comment: "Rule 6: story-schema, gallery-layout and domain do no I/O, so no Node.js built-in modules.",
      severity: "error",
      from: { path: PURE },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "pure-allowlist",
      comment: "Rule 6: story-schema, gallery-layout and domain may use only zod and the pure packages plus contracts.",
      severity: "error",
      from: { path: PURE },
      to: {
        dependencyTypesNot: ["core"],
        pathNot: ["^packages/(story-schema|gallery-layout|domain|contracts)/", "(^|node_modules/)zod(/|$)"],
      },
    },
    {
      name: "engine-no-business-rules",
      comment: "Rule 7: gallery-engine contains no business rules, so it never uses domain.",
      severity: "error",
      from: { path: "^packages/gallery-engine/" },
      to: { path: "^packages/domain/" },
    },
    {
      name: "runtime-no-engine",
      comment: "Rule 7: story-runtime only emits events; it never controls gallery-engine directly.",
      severity: "error",
      from: { path: "^packages/story-runtime/" },
      to: { path: "^packages/gallery-engine/" },
    },
    {
      name: "runtime-no-backend",
      comment: "Rule 7: story-runtime never calls the API: no apps, Supabase or database.",
      severity: "error",
      from: { path: "^packages/story-runtime/" },
      to: { path: ["^apps/", SUPABASE, DB] },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    // Worktrees are full copies of the repo; each one is checked from its own root.
    exclude: { path: ["node_modules", "^tests/fixtures/", String.raw`^\.claude/worktrees/`] },
    // Resolve workspace packages through their package.json "exports", so an import by package
    // name lands on packages/<name>/... and the path rules above apply to it.
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "default"] },
  },
};
