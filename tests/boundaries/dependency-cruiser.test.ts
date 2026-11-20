import { cruise, type ICruiseResult } from "dependency-cruiser";
import { expect, test } from "vitest";
import config from "../../.dependency-cruiser.mjs";

const fixtures = decodeURIComponent(new URL("../fixtures/boundaries", import.meta.url).pathname);

// Each fixture file breaks exactly one rule; files without a violation prove what is allowed.
test("every fixture violation is reported under its own rule, and nothing else", async () => {
  const { output } = await cruise(["."], {
    ...config.options,
    ruleSet: { forbidden: config.forbidden ?? [] },
    validate: true,
    baseDir: fixtures,
    exclude: { path: "node_modules" },
  });
  const violations = (output as ICruiseResult).summary.violations
    .map((v) => `${v.rule.name}: ${v.from}`)
    .sort();

  expect(violations).toEqual([
    "db-only-api: apps/web/src/creator-studio/db-outside-api.ts",
    "supabase-only-api-and-sign-in: apps/web/src/creator-studio/supabase-outside-sign-in.ts",
    "visitor-no-backend: apps/web/src/visitor-experience/page.ts",
  ]);
});
