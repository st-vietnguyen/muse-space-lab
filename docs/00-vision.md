# Product Vision — MuseSpace

**Product:** MuseSpace — Cinematic Storytelling Art Gallery
**Version:** 1.0
**Status:** Draft

> This document answers **what** and **why**. Architecture and technology (**how**) live in [`HLD.md`](./HLD.md).
> Every spec in `specs/` refers to the sections and `AC-xx` codes of this document.
> `OQ-xx` decisions are tracked in [`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md).

---

## 1. Project Overview

### 1.1. Problem Statement

Online art platforms usually focus on displaying works as a gallery, an image list or a 3D exhibition room.

When viewers want to learn about a work, they are typically sent to a detail page or popup with the image, artist information and a description.

This approach has several limitations:

- It does not create the feeling of discovering the story behind the work.
- Images, text and audio are usually disconnected.
- Deep stories easily turn into long, unengaging articles.
- Creators who want a vivid experience must use extra video or animation tools.
- Connecting several works into an exhibition with a narrative thread is underexplored.

### 1.2. Product Vision

**MuseSpace is a platform for creating and experiencing online art exhibitions, where every artwork can tell its story in a cinematic way.**

Creators can organize exhibitions, arrange artworks in a 3D space and create cinematic stories without knowing how to code or edit video.

Visitors can tour an exhibition, choose an artwork and experience its story through camera movement, images, narration, sound and effects designed to highlight the work.

MuseSpace is not a game: no puzzles, no quests.

### 1.3. Users

| Role | Need | MVP |
|---|---|---|
| Creator / Artist | Publish works, organize exhibitions, tell the story of their creation | Yes (also acts as Curator) |
| Visitor | Explore artworks and experience stories, without signing in | Yes |
| Curator | Organize exhibitions from works by several creators | Post-MVP |
| Platform Admin | Manage users and infringing content | Post-MVP |

### 1.4. Differentiation

MuseSpace combines three capabilities:

**3D Gallery:** An exhibition space customizable from templates.

**Living Canvas:** Cinematic storytelling rendered live from the artwork image, instead of a slideshow or pre-rendered video.

**Story Director:** A visual timeline editor that lets creators control motion, content and sound without writing code.

### 1.5. Project Constraints

- MuseSpace is a lab project: a **public demo for a small audience**, run at **$0** on free tiers (HLD §9.6). Prefer the simplest option that works for a handful of viewers; defer anything only needed at scale.
- Still required for the demo: it must stay reachable (Supabase keep-alive, HLD §9.6), play correctly on the supported desktop browsers (OQ-10), and meet the "cinematic, not a slideshow" bar (AC-15).
- Desktop web only (§2.2); no mobile or touch work.
- The project also serves as practice for an AI-agent development workflow (`CLAUDE.md`) that will be reused on real projects.

---

## 2. Product Scope

### 2.1. MVP Scope

| Module | Key features |
|---|---|
| Exhibition Management | Create, edit, save draft, publish exhibitions |
| Artwork Management | Upload images, manage metadata and media |
| Gallery Customization (MVP-1) | Choose room, wall color, floor, lighting, frames |
| Gallery Layout | Place artworks via predefined hanging slots |
| Story Director | Timeline editing, effect configuration, preview |
| Living Canvas Player | Play stories with camera, overlays, audio |
| Visitor Experience | 3D tour, select artwork, watch/listen to the story |
| Publishing | Public URL, republish, unpublish |
| Accessibility | Playback controls, transcript, Reduced Motion, Static Mode (MVP-1), grid list of artworks |

### 2.2. Out of MVP Scope

- Custom-built 3D exhibition architecture.
- 3D modeling or animation modeling.
- AI video generation.
- AI story generation.
- Multiplayer and touring with friends.
- Social feed, comments, marketplace.
- Custom JavaScript or plugins in Story Director.
- Professional timeline editor with free keyframes.
- Exporting cinematic stories to video.
- Separate Curator role, Admin dashboard and moderation workflow. The MVP only has an email abuse-report link.
- Multiple people co-editing one exhibition.
- Rollback to a previous published version. Published versions are still kept, so it can be added later (OQ-14).
- 4:3 and 9:16 Story Director previews (16:9 only; the contain rule in HLD §6.6 handles other desktop window shapes).
- Mutation testing (test-first unit tests stay mandatory).
- Rate limits (invite-only sign-up plus quotas cover abuse, OQ-21).
- WAV audio uploads (MP3 and M4A only, OQ-11).
- Asset deletion and storage cleanup jobs; self-service account deletion (OQ-17).
- Open sign-up (OQ-21) and UI translation (OQ-22).
- A background job queue (ADR-012).
- Phones and tablets (mobile web, touch input, native apps). MuseSpace is a **desktop web app** for both Creators and Visitors; on a phone or tablet the page shows a "best viewed in a desktop browser" notice (decided by the owner, 2026-11-18).

These features will only be considered once the core experience is stable.

---

## 3. Core User Experience

### 3.1. Creator Journey

**Step 1 — Create Exhibition**

The creator creates an exhibition, enters title, description, cover image and picks a gallery template (MVP-0 has one template, `minimal@1`).

**Step 2 — Customize Gallery (MVP-1)**

The creator customizes wall color, floor material, lighting preset and frame style.

**Step 3 — Add Artworks**

The creator uploads artworks, enters metadata and arranges them into display slots. Images whose long edge is under 1200 px are rejected; under 2048 px they are accepted with a warning (OQ-02).

**Step 4 — Create Cinematic Story**

The creator opens Story Director for an artwork. "Start from template" builds the three MVP-0 scenes on the artwork's own image with default focus regions and an empty "add archival image" slot, so the story plays at once; an empty dashboard links to the public demo exhibition (OQ-19). The creator then chooses effects, defines focus regions, adds archival material and, optionally, narration audio. A story with captions and no narration is valid.

**Step 5 — Preview**

The creator previews the story with exactly the runtime Visitors use.

**Step 6 — Publish**

The creator publishes the exhibition. The system creates a public URL and a fixed content version.

### 3.2. Visitor Journey

**Step 1 — Enter Exhibition**

The Visitor opens the exhibition URL and enters a 3D space. A skippable, keyboard-accessible intro shows the exhibition title, a short description and a "click an artwork" hint (OQ-19). If the device does not support WebGL, the Visitor sees a grid of artworks.

**Step 2 — Explore Gallery**

The Visitor clicks an artwork and the camera moves to it. They can move between artworks without controlling a character.

**Step 3 — Start Story**

The Visitor selects Start Story. The room dims slightly, the camera focuses on the artwork and the cinematic experience begins.

**Step 4 — Experience Living Canvas**

The image pans/zooms with the content, archival material appears, narration plays and, from MVP-1, the space shifts subtly with the story's mood (Atmosphere Transition).

**Step 5 — Return to Gallery**

After the story ends or is closed, the Visitor returns to the exhibition room, at the artwork just viewed.

### 3.3. Experience Principles

The story must keep the artwork at the center.

Motion should be gentle, purposeful and support the content.

Visitors can always pause, seek, mute, skip or, from MVP-1, view the content in static mode.

---

## 4. Release Milestones

> The MVP is split into two milestones to fit a lab project (OQ-01, decided). **Scope frozen on 2026-11-18** after the Tech Lead × PM review; changes need the owner's approval and go through `OPEN-QUESTIONS.md`.

| Milestone | Includes | Deferred |
|---|---|---|
| **MVP-0** | Desktop web only, with a "best viewed on desktop" notice on phones/tablets · invite-only creator sign-in · exhibition CRUD with `lang`, autosave with revision · artwork and narration upload with inline variants (images JPEG/PNG/WebP, audio MP3/M4A) · 1 gallery template (`minimal@1`), assign artworks to slots · basic Story Director (add/remove/reorder scenes, effect parameters, focus region, attach media, 16:9 preview, "Start from template") · Living Canvas with 3 effects (Cinematic Focus, Memory Reveal, Final Reveal; OQ-09), captions, narration + transcript · player controls (play, pause, seek, skip, volume, close) on one master clock · Visitor 3D tour (mouse + keyboard), intro overlay, 3D↔2D transition, grid view, Reduced Motion · publish, republish, unpublish, "not found"/"unavailable" states, generic OG tags · seed script with the reference story and public demo exhibition, Supabase keep-alive, page-view analytics · abuse-report link and takedown script · performance measured and recorded | — |
| **MVP-1** | Second template (`dark@1`) and gallery customization · Detail Journey, Atmosphere Transition, ambient audio · Static Mode · undo/redo · per-exhibition OG stub · performance targets met on the reference device · creator usability test (AC-16) | Everything in §2.2 |

The acceptance criteria in §5 apply to MVP-1 (the full MVP). Each roadmap feature states its milestone.

---

## 5. MVP Acceptance Criteria

Each criterion has an `AC-xx` code so specs, tasks, issues and PRs can trace back to it.

The MVP is complete when:

1. **AC-01** — A creator can create an exhibition and add at least five artworks.
2. **AC-02** — A creator can choose a gallery template, customize wall color and lighting, and see the change in the 3D preview.
3. **AC-03** — A creator can assign artworks to template slots; the system prevents two artworks in one slot.
4. **AC-04** — A Visitor can open the published URL and move between artworks with mouse and keyboard.
5. **AC-05** — A creator can build a story with at least 3 scenes using at least 3 different effect templates.
6. **AC-06** — Stories support pan/zoom, image overlays and narration.
7. **AC-07** — Playback meets:
   - After pause, playback position drifts no more than 50 ms.
   - After seek, animation/narration offset is no more than 100 ms.
   - After close, all audio stops within 200 ms and no animation keeps running.
8. **AC-08** — Visitors can read the transcript; in Reduced Motion there is no pan, zoom or camera movement.
9. **AC-09** — Creators preview stories with the same runtime as Visitors.
10. **AC-10** — Editing the draft does not change what Visitors see until republished; after unpublish, the URL shows an "exhibition unavailable" notice; a slug that was never published shows "exhibition not found". Changes reach Visitors within the snapshot cache time (60 s, OQ-07).
11. **AC-11** — The Visitor page sends no requests to the Backend API.
12. **AC-12** — The performance targets in HLD §12.1 are met on the reference device (HLD §12.1; MVP-0 only measures and records, OQ-08).
13. **AC-13** — `domain`, `story-schema`, `gallery-layout` and timeline logic have automated tests.
14. **AC-14** — The workflows in HLD §13.3 run via Playwright in CI.
15. **AC-15** — The reference story *The Chair by the Window* (HLD §8.2) is created by the seed script and plays end to end on the reference device (HLD §12.1). It is the quality bar for "cinematic, not a slideshow" and must be playable from MVP-0, so it uses only MVP-0 effects (OQ-09). It includes narration, so it also proves the audio clock (OQ-23).
16. **AC-16** — A first-time creator builds a 3-scene story without help within 15 minutes; tested at MVP-1 with 3 people (OQ-12).

---

## 6. Summary

The MVP prioritizes completing the full **Create Exhibition → Add Artwork → Direct Story → Preview → Publish → Experience** flow before expanding into community or AI features.
