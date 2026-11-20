// Architecture boundaries: CLAUDE.md §3 rules 3–7, spec specs/001-boundary-rules.
// Paths are relative to the repo root. On a violation, fix the code; never loosen a rule.
// Proven by tests/boundaries/ against tests/fixtures/boundaries/.

const SUPABASE = "(^|node_modules/)@supabase/";
const DB = "(^|node_modules/)(drizzle-orm|drizzle-kit|postgres|pg)(/|$)";

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
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    exclude: { path: ["node_modules", "^tests/fixtures/"] },
  },
};
