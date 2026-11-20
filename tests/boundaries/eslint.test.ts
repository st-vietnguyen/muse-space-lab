import { ESLint } from "eslint";
import { expect, test } from "vitest";

const root = decodeURIComponent(new URL("../..", import.meta.url).pathname);
const fixtures = decodeURIComponent(new URL("../fixtures/boundaries", import.meta.url).pathname);

// Network calls are globals, not imports, so dependency-cruiser cannot see them.
test("network globals are reported in the pure packages and story-runtime only", async () => {
  const eslint = new ESLint({ cwd: fixtures, overrideConfigFile: `${root}eslint.config.js` });
  const results = await eslint.lintFiles(["packages/*/src/network.ts"]);
  const violations = results
    .flatMap((r) => r.messages.map((m) => `${m.ruleId}: ${r.filePath.slice(fixtures.length + 1)}`))
    .sort();

  expect(violations).toEqual([
    "no-restricted-globals: packages/domain/src/network.ts",
    "no-restricted-globals: packages/story-runtime/src/network.ts",
    "no-restricted-properties: packages/gallery-layout/src/network.ts",
  ]);
});
