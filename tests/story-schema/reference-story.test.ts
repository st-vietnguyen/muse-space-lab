import { describe, expect, test } from "vitest";
import { parseStory, sceneStartsMs, totalDurationMs } from "../../packages/story-schema/src/story.js";
import reference from "../fixtures/stories/the-chair-by-the-window.json" with { type: "json" };

// Spec 002 US4 / FR-015: the reference story "The Chair by the Window" passes every rule (AC-15, data only).
describe("the reference story", () => {
  const result = parseStory(reference);

  test("should be accepted unchanged", () => {
    expect(result).toEqual({ ok: true, story: reference });
  });

  test("should play Cinematic Focus 15 s, Memory Reveal 25 s, Final Reveal 25 s, 65 s in total", () => {
    expect(reference.scenes.map(({ effect, durationMs }) => [effect.type, durationMs])).toEqual([
      ["cinematic-focus", 15_000],
      ["memory-reveal", 25_000],
      ["final-reveal", 25_000],
    ]);
    expect(sceneStartsMs(reference)).toEqual([0, 15_000, 40_000]);
    expect(totalDurationMs(reference)).toBe(65_000);
  });

  test("should have narration from 5 s lasting 55 s and a transcript", () => {
    expect(reference.narration).toMatchObject({ startAtMs: 5_000, durationMs: 55_000 });
    expect(reference.transcript).toMatch(/\S/);
  });
});
