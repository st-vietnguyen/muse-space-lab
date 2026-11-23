import { describe, expect, test } from "vitest";
import { parseStory } from "../../packages/story-schema/src/story.js";
import { memory, narration, reveal, story, transcript } from "./sample-story.js";

// Spec 002 US2: an invalid story is rejected under exactly its rule, naming the scene; boundary values are accepted.

// Returns the story with scene `index` changed; `undefined` in the patch removes that field.
function withScene(index: number, patch: Record<string, unknown>) {
  const scenes = story.scenes.map((scene, i) => {
    if (i !== index) return scene;
    const changed: Record<string, unknown> = { ...scene, ...patch };
    for (const key of Object.keys(patch)) if (patch[key] === undefined) delete changed[key];
    return changed;
  });
  return { ...story, scenes };
}

function withRegion(region: Record<string, number>) {
  return withScene(0, { effect: { type: "cinematic-focus", params: { region } } });
}

function scenesOf(count: number, durationMs: number) {
  return Array.from({ length: count }, (_, i) => ({ id: `scene-${i}`, durationMs, effect: reveal }));
}

function failuresOf(input: unknown) {
  const result = parseStory(input);
  return result.ok ? [] : result.errors.map(({ rule, scene }) => ({ rule, scene }));
}

const memoryScene = { index: 1, id: "memory" };
const focusScene = { index: 0, id: "focus" };

describe("a story that breaks a rule", () => {
  test.each([
    ["no scenes", { ...story, scenes: [] }, { rule: "scene-count" }],
    ["13 scenes", { ...story, scenes: scenesOf(13, 1_000) }, { rule: "scene-count" }],
    [
      "5 min + 1 ms in total",
      { ...story, scenes: [...scenesOf(11, 25_000), { id: "last", durationMs: 25_001, effect: reveal }] },
      { rule: "story-length" },
    ],
    [
      "a scene with no duration",
      withScene(1, { durationMs: undefined }),
      { rule: "scene-duration", scene: memoryScene },
    ],
    ["a scene lasting 0 ms", withScene(1, { durationMs: 0 }), { rule: "scene-duration", scene: memoryScene }],
    ["a scene lasting -1 ms", withScene(1, { durationMs: -1 }), { rule: "scene-duration", scene: memoryScene }],
    ["a scene lasting 1.5 ms", withScene(1, { durationMs: 1.5 }), { rule: "scene-duration", scene: memoryScene }],
    [
      "narration ending 1 ms after the story",
      { ...story, narration: { ...narration, durationMs: 60_001 }, transcript },
      { rule: "narration" },
    ],
    ["narration with no transcript", { ...story, narration }, { rule: "transcript" }],
    ["narration with a blank transcript", { ...story, narration, transcript: "  \n" }, { rule: "transcript" }],
    [
      "a region with x + width > 1",
      withRegion({ x: 0.8, y: 0, width: 0.3, height: 0.5 }),
      { rule: "focus-region", scene: focusScene },
    ],
    [
      "a region with a negative x",
      withRegion({ x: -0.1, y: 0, width: 0.3, height: 0.5 }),
      { rule: "focus-region", scene: focusScene },
    ],
    [
      "a region with zero width",
      withRegion({ x: 0.4, y: 0, width: 0, height: 0.5 }),
      { rule: "focus-region", scene: focusScene },
    ],
    [
      "an unknown effect",
      withScene(1, { effect: { type: "detail-journey", params: {} } }),
      { rule: "effect-unknown", scene: memoryScene },
    ],
    ["a scene with no effect", withScene(1, { effect: undefined }), { rule: "effect-unknown", scene: memoryScene }],
    [
      "Final Reveal with params",
      withScene(2, { effect: { type: "final-reveal", params: { zoom: 2 } } }),
      { rule: "effect-params", scene: { index: 2, id: "reveal" } },
    ],
    [
      "Memory Reveal without an asset",
      withScene(1, { effect: { type: "memory-reveal", params: { placement: "over" } } }),
      { rule: "effect-params", scene: memoryScene },
    ],
    [
      "Memory Reveal with an unknown placement",
      withScene(1, { effect: { ...memory, params: { ...memory.params, placement: "under" } } }),
      { rule: "effect-params", scene: memoryScene },
    ],
    ["an empty caption", withScene(1, { caption: "" }), { rule: "format", scene: memoryScene }],
    ["a repeated scene id", withScene(2, { id: "memory" }), { rule: "scene-id", scene: { index: 2, id: "memory" } }],
    ["an unknown field on the story", { ...story, captoin: "typo" }, { rule: "format" }],
  ])("should reject %s", (_, input, expected) => {
    expect(failuresOf(input)).toEqual([expected]);
  });

  test.each([
    ["nothing", undefined],
    ["a list", []],
    ["text", "story"],
  ])("should reject %s as input", (_, input) => {
    expect(failuresOf(input)).toEqual([{ rule: "format" }]);
  });

  test("should name the rule, the place and the scene in each error", () => {
    const result = parseStory(withScene(1, { durationMs: -1 }));
    expect(result).toEqual({
      ok: false,
      errors: [
        { rule: "scene-duration", path: "scenes[1].durationMs", scene: memoryScene, message: expect.any(String) },
      ],
    });
  });

  test("should report every single-field error together and check rules across fields only once they pass", () => {
    const input = {
      ...story,
      narration: { ...narration, durationMs: 600_000 },
      scenes: [
        { ...story.scenes[0], durationMs: 0 },
        story.scenes[1],
        { ...story.scenes[2], durationMs: 300_000 },
        { ...story.scenes[2], id: "x", caption: "" },
      ],
    };
    expect(failuresOf(input)).toEqual([
      { rule: "scene-duration", scene: focusScene },
      { rule: "format", scene: { index: 3, id: "x" } },
    ]);
  });
});

describe("a story at the limits", () => {
  test.each([
    ["12 scenes", { ...story, scenes: scenesOf(12, 1_000) }],
    ["exactly 5 min", { ...story, scenes: scenesOf(12, 25_000) }],
    [
      "narration ending exactly when the story ends",
      { ...story, narration: { ...narration, durationMs: 60_000 }, transcript },
    ],
    ["narration from 0", { ...story, narration: { ...narration, startAtMs: 0, durationMs: 65_000 }, transcript }],
    ["a region touching the edge", withRegion({ x: 0, y: 0.5, width: 1, height: 0.5 })],
    [
      "a region reaching the edge through rounding",
      withRegion({ x: 0.123456789, y: 0.7, width: 1 - 0.123456789, height: 1 - 0.7 }),
    ],
    ["captions and no narration", story],
    ["a transcript and no narration", { ...story, transcript }],
    ["narration from 5 s lasting 55 s in 65 s", { ...story, narration, transcript }],
  ])("should accept %s", (_, input) => {
    expect(parseStory(input)).toEqual({ ok: true, story: input });
  });
});
