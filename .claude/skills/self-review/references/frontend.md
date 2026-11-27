# Frontend lens

For React code in the diff (`.tsx`, hooks, components). Stack: HLD §11 (React, Tailwind CSS with shadcn/ui, Zustand, TanStack Query, React Three Fiber). Check only what Prettier, ESLint and TypeScript do not already check.

## Hooks

- Rules of Hooks: no hook inside a condition, loop or nested function.
- Effect dependencies are complete and not wider than needed; an effect that subscribes cleans up.
- Derive, do not sync: a value computable from props or state is computed during render, not mirrored into state by an effect.
- `useMemo` / `useCallback` only where a measured or obvious cost needs it, not by default.

## Rendering

- List keys are stable ids from the data; an index only for a static list that never reorders.
- `&&` guards are booleans: `items.length > 0 && …`, never `items.length && …` (renders `0`).
- A fragment instead of a wrapper element when no DOM node is needed.
- A handler longer than one line is a named function, not an inline arrow in JSX.
- No `dangerouslySetInnerHTML` with story or creator content; URLs from creator input are limited to `http(s)` before they go into `href` or `src` (CLAUDE.md §3 rule 2, HLD §12.3).

## State and data

- Server data through TanStack Query, through the Backend API only (CLAUDE.md §3 rule 4); shared client state in Zustand; UI-only state local.
- Presentation components get data and callbacks through props; they do not fetch or decide permissions.
- Business logic lives in a hook or a pure package, not in a page component's effects.
- The Visitor flow reads only the static snapshot (CLAUDE.md §3 rule 5).
- The Supabase SDK only in the sign-in part (CLAUDE.md §3 rule 3); no secret in `VITE_*` variables, which Vite puts in the bundle (rule 10).

## Types

- No `any`; `unknown` plus narrowing for untrusted shapes (story data goes through `story-schema`).
- A non-null assertion `!` has a comment saying why it is safe.
- Named exports.

## 3D scene and timeline

- Time and progress changes do not re-render the whole React scene, and the scene is not rebuilt when the story scene changes (HLD §12.1).
- Timing reads from the master clock, no `setTimeout` chains; `story-runtime` only emits events (CLAUDE.md §3 rules 7–8).
- Three.js objects, textures and listeners created by a component are disposed when it unmounts.

## Component tests

With the test tools in HLD §11 only; a new test library (for example Testing Library, jsdom) goes through a plan and the owner's approval.

- Assert what the user sees and does, not internal state.
- Edge cases and error states, not only the happy path; no test that passes with no real assertion.
- A custom hook is tested on its own, not only through a component that uses it.
