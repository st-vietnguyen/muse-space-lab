// Stories shared by the story-runtime tests. Each one is read through parseStory, so the tests use real Story values.
import { parseStory, type Story } from "../../packages/story-schema/src/story.js";

const focus = { type: "cinematic-focus", params: { region: { x: 0.4, y: 0.35, width: 0.3, height: 0.4 } } };
const memory = { type: "memory-reveal", params: { assetId: "archival-photo", placement: "beside" } };
const reveal = { type: "final-reveal", params: {} };

const threeScenes = [
  { id: "focus", durationMs: 15_000, effect: focus },
  { id: "memory", durationMs: 25_000, effect: memory },
  { id: "reveal", durationMs: 25_000, effect: reveal },
];

function read(input: object): Story {
  const result = parseStory(input);
  if (!result.ok) throw new Error(`Test story is invalid: ${JSON.stringify(result.errors)}`);
  return result.story;
}

const narrated = (startAtMs: number, durationMs: number) => ({
  narration: { assetId: "narration", startAtMs, durationMs },
  transcript: "She sat here every morning.",
});

// Reference timing: scenes of 15 s, 25 s and 25 s (65 000 ms), narration from 5 000 ms lasting 55 000 ms.
export const referenceTiming: Story = read({ schemaVersion: 1, ...narrated(5_000, 55_000), scenes: threeScenes });

// The same scenes without narration.
export const withoutNarration: Story = read({ schemaVersion: 1, scenes: threeScenes });

// Narration from 0 (no lead-in), lasting 30 000 ms.
export const narrationFromZero: Story = read({ schemaVersion: 1, ...narrated(0, 30_000), scenes: threeScenes });

// Narration that ends exactly at the story's end: 5 000 + 60 000 = 65 000 ms.
export const narrationToEnd: Story = read({ schemaVersion: 1, ...narrated(5_000, 60_000), scenes: threeScenes });

// One scene of 10 000 ms, no narration.
export const singleScene: Story = read({
  schemaVersion: 1,
  scenes: [{ id: "only", durationMs: 10_000, effect: reveal }],
});
