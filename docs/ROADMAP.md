# Roadmap — MuseSpace

**Version:** 1.1 · **Status:** Draft

> Feature order for the MVP. Scope per milestone: [`00-vision.md`](./00-vision.md) §4 (OQ-01). Architecture: [`HLD.md`](./HLD.md). Each feature becomes `specs/00X-<name>/` and one pull request.
>
> OQ-01 to OQ-23 are decided; "Related OQs" lists the decisions each feature must follow (see [`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md)).

## Current status

Updated by the agent at each workflow step (CLAUDE.md §2.1).

- **2026-11-18:** Docs done (all OQs decided, scope frozen). Private repository created (moved to `st-vietnguyen/muse-space-lab` on 2026-11-20) with labels `needs-review` and `ready`. No code yet.
- **2026-11-20:** Issue template added (`.github/ISSUE_TEMPLATE/feature.md`). Feature 000 `workspace` is issue #1, label `needs-review`. Relabeled `ready`.
- **2026-11-20:** Feature 000: spec, plan and tasks approved; T001–T006 done on branch `000-workspace`, CI green; merged in PR #2 (issue #1 closed).
- **2026-11-20:** Process updates from the feature 000 retro merged (PR #3).
- **2026-11-20:** Review pipeline (PR labels, Claude review, dependency audit, secret scan, Dependabot, SHA-pinned actions) merged (PR #4). Dependabot alerts enabled.
- **2026-11-20:** Next: remove and re-add the `claude-review` label on PR #4 for the first real Claude review (the workflow could not run on the PR that added it); then phase A continues with feature 001 `boundary-rules`. Open owner decision: remove the old collaborator account `vietnguyen1404` from the repository.
- **2026-11-20:** Feature 001 `boundary-rules` is issue #6 (relabeled `ready`); spec, plan and tasks approved (incl. dependency-cruiser); T001–T006 done on branch `001-boundary-rules`, CI green; draft PR open.

## Sequencing principle

The biggest risks are the cinematic experience itself: the 3D↔2D handoff (HLD §6.4) and the audio clock across desktop browsers (HLD §6.5). They are proven first, with a vertical slice that plays a hand-written snapshot, before auth, uploads or publishing are built. Everything after that replaces hand-written data with data created by the product.

## Feature size

Each feature is one pull request that a reviewer can read in one sitting:

- About **6 tasks or fewer**, about **15 changed files or fewer**, and about **400 hand-written lines or fewer** (lockfiles and generated files excluded).
- A package or app is created by the first feature that needs it; no empty scaffolding "for later".
- Each feature that adds a user-visible flow adds its Playwright scenario (HLD §13.3), so AC-14 grows with the product instead of arriving at the end.
- If `plan.md`/`tasks.md` exceed the size above, split the feature (and update this roadmap) before implementing.

## Phases and process

Features are grouped into phases. After each phase there is a short retro; lessons go into `CLAUDE.md`, skills or CI before the next phase starts. Early phases are deliberately small so the workflow is tested on low-risk work first.

| Phase | Features | Process focus |
|---|---|---|
| A — Tooling | 000–001 | Run the manual workflow end to end (000: per-task approval; from 001: owner approves the plan and reviews the PR) |
| B — Living Canvas | 002–005 | Test-first on pure packages; first skills from the phase A retro |
| C — Visitor gallery | 006–007 | First 3D work; Playwright scenarios in CI |
| D — Creator backend | 008–013 | Local Supabase in CI, integration tests |
| E — Director and launch | 014–017 | Public demo |
| MVP-1 | 018–021 | Features re-split to the size rule when planned |

## MVP-0

| # | Phase | Feature | Scope | AC | Depends on | Related OQs |
|---|---|---|---|---|---|---|
| 000 | A | `workspace` | pnpm workspace, Node.js version in `.nvmrc`, strict TypeScript, ESLint, Vitest, root `lint`/`typecheck`/`test` scripts, GitHub Actions CI running them | — | — | — |
| 001 | A | `boundary-rules` | Choose dependency-cruiser or `eslint-plugin-boundaries` (HLD §10); encode CLAUDE.md §3 rules 3–7 by path; a fixture per rule proves CI fails on a violation | AC-11 (setup) | 000 | — |
| 002 | B | `story-schema` | Story types + Zod schema with the MVP-0 effects, `narration.durationMs`, `startMs`/total duration, validation and limits, `migrate()`; the reference story (HLD §8.2) as a valid fixture | AC-13 | 001 | OQ-09, OQ-11, OQ-23 |
| 003 | B | `story-clock` | Pure timeline and master clock in `story-runtime` (HLD §6.5): scene at time, seek, pause/resume, lead-in, re-anchoring, buffering, drift, completion; fake-clock tests with the AC-07 thresholds | AC-07, AC-13 | 002 | — |
| 004 | B | `canvas-player` | `apps/web` (Vite) with `/e/{slug}` playing a **hand-written snapshot fixture**: GSAP driven by the clock, the 3 MVP-0 effects with focus fit (HLD §6.6), Memory Reveal overlay, captions, play/pause/seek/skip/close; first Playwright scenario | AC-06 (part), AC-09 (setup) | 003 | OQ-09, OQ-22 |
| 005 | B | `player-audio` | Narration via `<audio>` anchored to the clock, volume/mute, transcript, Reduced Motion in the player; **clock spike on the supported desktop browsers (go/no-go for ADR-010)** | AC-06, AC-07, AC-08 | 004 | OQ-10, OQ-22, OQ-23 |
| 006 | C | `gallery-3d` | `gallery-layout`, `gallery-engine` with template `minimal@1` (≥ 5 slots), Visitor 3D tour with mouse and keyboard, from the fixture | AC-04 | 004 | — |
| 007 | C | `visitor-flow` | 3D↔2D transition (HLD §6.4), Reduced Motion for 3D, grid view, intro overlay, "desktop only" notice (HLD §12.1), not-found / unavailable states | AC-08, AC-11 | 005, 006 | OQ-10, OQ-19, OQ-22 |
| 008 | D | `db-foundation` | `apps/api` (Fastify) with a health route, local Supabase in dev and CI, Drizzle + first migration, Data API lockdown + its integration test (HLD §9.1) | — | 001 | — |
| 009 | D | `creator-auth` | Invite-only sign-in, `/me` with the email allowlist, `users` table | — | 004, 008 | OQ-21 |
| 010 | D | `exhibitions-crud` | Creator dashboard, exhibition CRUD with `revision` and `lang`, deletion rules | AC-01 (part) | 009 | OQ-17 |
| 011 | D | `image-upload` | Presigned upload, inline processing (ADR-012) with caps, mutex, timeout and retry, image variants, quota, bucket CORS/cache headers; memory spike for the 50 MP cap | AC-01 (part) | 010 | OQ-02, OQ-03, OQ-11 |
| 012 | D | `audio-upload` | MP3/M4A upload stored as uploaded, duration from music-metadata, audio limits | — | 011 | OQ-11 |
| 013 | D | `artworks-slots` | Artwork management, assigning artworks to `minimal@1` slots (unique slot constraint) | AC-01, AC-03 | 006, 011 | — |
| 014 | E | `story-director` | Stories API with `revision` autosave; editor: add/remove/reorder scenes, choose effect, parameters, duration; 16:9 preview with the same runtime | AC-05 (MVP-0 effects), AC-09 | 005, 013 | OQ-06, OQ-09, OQ-22 |
| 015 | E | `director-media` | Focus region picker, attaching images and narration, "Start from template" on the artwork's own image, empty-dashboard link to the demo exhibition | AC-05 | 012, 014 | OQ-19 |
| 016 | E | `publishing` | Snapshot building in `domain` (`snapshotVersion`, `assets` map, `lang`), slug rules, publish/unpublish in the order of HLD §9.4, resync script, `/e/{slug}` switches from fixture to real snapshots | AC-10, AC-11, AC-13 | 007, 015 | OQ-05, OQ-07, OQ-14, OQ-17 |
| 017 | E | `demo-launch` | `pnpm seed` with the reference story and demo exhibition, deploy (Cloudflare Pages + Render), generic OG tags, Web Analytics beacon, Supabase keep-alive (HLD §9.6), abuse-report link and takedown script, performance measured and recorded | AC-14, AC-15 | 016 | OQ-08, OQ-15, OQ-16, OQ-18, OQ-20, OQ-23 |

MVP-0 exit: AC-15 passes at MVP-0 scope; performance is measured and recorded (OQ-08).

## MVP-1

| # | Feature | Scope | AC | Depends on | Related OQs |
|---|---|---|---|---|---|
| 018 | `gallery-customization` | Second template (`dark@1`), wall color, floor, lighting, frames, live 3D preview | AC-02 | 017 | — |
| 019 | `story-effects-extended` | Detail Journey (OQ-09), Atmosphere Transition + `atmosphere` event, ambient audio, Static Mode | AC-05, AC-06, AC-08 | 017 | OQ-09 |
| 020 | `director-plus` | Undo/redo | — | 015 | — |
| 021 | `quality-gate` | Meet performance targets on the reference device, creator usability test + playtest (one 3-person session, 15 min), per-exhibition OG stub | AC-12, AC-16 | 018–020 | OQ-12, OQ-15 |

MVP-1 exit: every AC in vision §5 passes; the reviewer decides completion.
