# Notes 001 — `boundary-rules`

## Deviations from the plan

- **T001:** the config is `.dependency-cruiser.mjs` (ESM), not `.cjs`. The test imports it, and a `.cjs` file needs Node.js types (`module`) that the repo does not have (`@types/node` is not installed); ESM needs nothing new. For the same reason the test builds the fixture path from `import.meta.url` instead of importing `node:url`.
- **T001:** `eslint.config.js` does not exclude `tests/fixtures/`: the fixtures are valid code for the normal lint, and the ESLint boundary block matches `packages/...` from the repo root only, so it never fires on them. Only `tsconfig.json` excludes them (they import libraries that are not installed).

## Risks

- dependency-cruiser 18.7.0 supports TypeScript `>=2 <7`. A TypeScript 7 upgrade must wait until dependency-cruiser supports it.

## Review fixes

- **Claude review (PR #7), untested area:** an import by workspace package name (`@musespace/domain`) was not resolved, so no path rule applied to it (verified: a `gallery-engine` → `@musespace/domain` import passed). Cause: dependency-cruiser ignores `package.json` `exports` by default. Fix: `enhancedResolveOptions.exportsFields`; new fixture `business-rules-by-name.ts` with a pnpm-style link in `tests/fixtures/boundaries/node_modules/` (un-ignored in `.gitignore`).
- **Claude review (PR #7), nit:** `globalThis.fetch`, `window.fetch`, `self.fetch` passed `no-restricted-globals`. Fix: `no-restricted-properties` for those objects, plus fixture `packages/gallery-layout/src/network.ts`. Still not caught: aliasing the global object (`const g = globalThis; g.fetch()`); left to review.
