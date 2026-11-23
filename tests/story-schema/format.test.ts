import { describe, expect, test } from "vitest";
import { parseStory, sceneStartsMs, totalDurationMs } from "../../packages/story-schema/src/story.js";

// Spec 002 US1: a story is data with the three launch effects; timing is computed, never stored.
const story = {
  schemaVersion: 1,
  scenes: [
    {
      id: "focus",
      durationMs: 15_000,
      caption: "Morning light on the chair.",
      effect: { type: "cinematic-focus", params: { region: { x: 0.4, y: 0.35, width: 0.3, height: 0.4 } } },
    },
    {
      id: "memory",
      durationMs: 25_000,
      effect: { type: "memory-reveal", params: { assetId: "archival-photo", placement: "beside" } },
    },
    { id: "reveal", durationMs: 25_000, caption: "The whole room.", effect: { type: "final-reveal", params: {} } },
  ],
};

const narrated = {
  ...story,
  narration: { assetId: "narration", startAtMs: 5_000, durationMs: 55_000 },
  transcript: "She sat here every morning.",
};

describe("a story with the three launch effects", () => {
  test.each([
    ["with captions only", story],
    ["with narration and a transcript", narrated],
  ])("should accept a story %s and return it unchanged", (_, input) => {
    expect(parseStory(input)).toEqual({ ok: true, story: input });
  });

  test("should reject a stored start time on a scene", () => {
    const withStart = { ...story, scenes: story.scenes.map((scene) => ({ ...scene, startMs: 0 })) };
    expect(parseStory(withStart).ok).toBe(false);
  });

  test("should reject a stored total length", () => {
    expect(parseStory({ ...story, totalDurationMs: 65_000 }).ok).toBe(false);
  });
});

describe("timing is computed from the scene durations", () => {
  test("should start scenes of 15, 25 and 25 s at 0, 15 and 40 s and last 65 s", () => {
    expect(sceneStartsMs(story)).toEqual([0, 15_000, 40_000]);
    expect(totalDurationMs(story)).toBe(65_000);
  });

  test("should start a single scene at 0 and last its duration", () => {
    const single = { ...story, scenes: story.scenes.slice(2) };
    expect(sceneStartsMs(single)).toEqual([0]);
    expect(totalDurationMs(single)).toBe(25_000);
  });
});
