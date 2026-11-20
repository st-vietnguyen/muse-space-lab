# MuseSpace

Online art exhibitions where each artwork tells its story in a cinematic way. Product and architecture: [`docs/`](docs/); rules for AI agents: [`CLAUDE.md`](CLAUDE.md).

## Setup

Requires the Node.js version in `.nvmrc` (or newer) and Corepack, which ships with Node.js.

```sh
corepack enable   # once per machine; provides the pnpm version pinned in package.json
pnpm install
```

## Checks

Run from the repo root; they cover every package under `packages/` and `apps/`. CI runs the same three on every push.

```sh
pnpm lint        # code style, common mistakes and architecture boundaries (.dependency-cruiser.mjs)
pnpm typecheck   # strict TypeScript
pnpm test        # unit tests
```
