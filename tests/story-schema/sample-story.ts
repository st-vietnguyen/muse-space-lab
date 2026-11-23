// A small valid story shared by the story-schema tests: the three launch effects, 15 + 25 + 25 s.
export const memory = { type: "memory-reveal", params: { assetId: "archival-photo", placement: "beside" } };
export const reveal = { type: "final-reveal", params: {} };

export const story = {
  schemaVersion: 1,
  scenes: [
    {
      id: "focus",
      durationMs: 15_000,
      caption: "Morning light on the chair.",
      effect: { type: "cinematic-focus", params: { region: { x: 0.4, y: 0.35, width: 0.3, height: 0.4 } } },
    },
    { id: "memory", durationMs: 25_000, effect: memory },
    { id: "reveal", durationMs: 25_000, caption: "The whole room.", effect: reveal },
  ],
};

export const narration = { assetId: "narration", startAtMs: 5_000, durationMs: 55_000 };
export const transcript = "She sat here every morning.";
