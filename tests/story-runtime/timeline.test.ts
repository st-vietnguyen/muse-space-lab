import { describe, expect, test } from "vitest";
import { positionAt } from "../../packages/story-runtime/src/index.js";
import { referenceTiming, singleScene } from "./stories.js";

// Spec 003 US1 / FR-001, FR-002: the position in a story depends only on the story and the time (AC-13).
describe("positionAt for the reference timing (15 s, 25 s, 25 s)", () => {
  const rows = [
    { time: 0, index: 0, id: "focus", scene: 0, story: 0 },
    { time: 14_999, index: 0, id: "focus", scene: 14_999 / 15_000, story: 14_999 / 65_000 },
    { time: 15_000, index: 1, id: "memory", scene: 0, story: 15_000 / 65_000 },
    { time: 27_500, index: 1, id: "memory", scene: 0.5, story: 27_500 / 65_000 },
    { time: 39_999.5, index: 1, id: "memory", scene: 24_999.5 / 25_000, story: 39_999.5 / 65_000 },
    { time: 40_000, index: 2, id: "reveal", scene: 0, story: 40_000 / 65_000 },
    { time: 65_000, index: 2, id: "reveal", scene: 1, story: 1 },
  ];

  test.each(rows)("should give scene $id at $time ms with both progress values", (row) => {
    expect(positionAt(referenceTiming, row.time)).toEqual({
      timeMs: row.time,
      sceneIndex: row.index,
      sceneId: row.id,
      sceneProgress: row.scene,
      storyProgress: row.story,
    });
  });

  test.each([-1, -Infinity])("should give the position at 0 for the time %s", (time) => {
    expect(positionAt(referenceTiming, time)).toEqual({
      timeMs: 0,
      sceneIndex: 0,
      sceneId: "focus",
      sceneProgress: 0,
      storyProgress: 0,
    });
  });

  test.each([65_001, Infinity])("should give the position at the end for the time %s", (time) => {
    expect(positionAt(referenceTiming, time)).toEqual({
      timeMs: 65_000,
      sceneIndex: 2,
      sceneId: "reveal",
      sceneProgress: 1,
      storyProgress: 1,
    });
  });

  test("should give equal positions when the same story and time are asked twice", () => {
    expect(positionAt(referenceTiming, 31_234.5)).toEqual(positionAt(referenceTiming, 31_234.5));
  });

  test("should accept a deep-frozen story", () => {
    const freeze = <T>(value: T): T => {
      if (typeof value === "object" && value !== null) {
        Object.values(value).forEach(freeze);
        Object.freeze(value);
      }
      return value;
    };
    const frozen = freeze(structuredClone(referenceTiming));
    expect(positionAt(frozen, 27_500)).toEqual(positionAt(referenceTiming, 27_500));
  });
});

describe("positionAt for a single-scene story of 10 000 ms", () => {
  test.each([
    { time: 0, progress: 0 },
    { time: 5_000, progress: 0.5 },
    { time: 10_000, progress: 1 },
  ])("should stay in scene 1 at $time ms with progress $progress", ({ time, progress }) => {
    expect(positionAt(singleScene, time)).toEqual({
      timeMs: time,
      sceneIndex: 0,
      sceneId: "only",
      sceneProgress: progress,
      storyProgress: progress,
    });
  });
});
