import { describe, expect, test } from "vitest";
import { parseStory, sceneStartsMs, totalDurationMs } from "../../packages/story-schema/src/story.js";
import { narration, story, transcript } from "./sample-story.js";

// Spec 002 US1: a story is data with the three launch effects; timing is computed, never stored.
const narrated = { ...story, narration, transcript };

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
