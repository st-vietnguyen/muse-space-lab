import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["**/dist/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  // CLAUDE.md §3 rules 6–7: no network in the pure packages or story-runtime. Imports are checked by .dependency-cruiser.mjs.
  {
    files: ["packages/{story-schema,gallery-layout,domain,story-runtime}/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].map((name) => ({
          name,
          message: "Rules 6–7: pure packages and story-runtime make no network calls.",
        })),
      ],
    },
  },
);
