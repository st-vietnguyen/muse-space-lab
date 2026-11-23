import { z } from "zod";

// Story format, version 1 (spec 002, plan "Format"). Every object is strict: unknown fields are rejected (FR-010).

// x + (1 - x) can round above 1 in floating point.
const EDGE_TOLERANCE = 1e-9;

const region = z
  .strictObject({
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().positive(),
    height: z.number().positive(),
  })
  .refine((r) => r.x + r.width <= 1 + EDGE_TOLERANCE && r.y + r.height <= 1 + EDGE_TOLERANCE, {
    message: "Focus region must stay inside the image",
  });

const effect = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("cinematic-focus"), params: z.strictObject({ region }) }),
  z.strictObject({
    type: z.literal("memory-reveal"),
    params: z.strictObject({ assetId: z.string().min(1), placement: z.enum(["over", "beside"]) }),
  }),
  z.strictObject({ type: z.literal("final-reveal"), params: z.strictObject({}) }),
]);

const scene = z.strictObject({
  id: z.string().min(1),
  durationMs: z.int().positive(),
  caption: z.string().min(1).optional(),
  effect,
});

const storySchema = z.strictObject({
  schemaVersion: z.literal(1),
  narration: z
    .strictObject({ assetId: z.string().min(1), startAtMs: z.int().min(0), durationMs: z.int().positive() })
    .optional(),
  transcript: z.string().optional(),
  scenes: z.array(scene).min(1).max(12),
});

export type Story = z.infer<typeof storySchema>;
export type Scene = Story["scenes"][number];
export type Effect = Scene["effect"];

// ponytail: raw Zod issues until T002 maps them to StoryError { rule, path, scene, message }.
export function parseStory(input: unknown): { ok: true; story: Story } | { ok: false; errors: z.core.$ZodIssue[] } {
  const result = storySchema.safeParse(input);
  return result.success ? { ok: true, story: result.data } : { ok: false, errors: result.error.issues };
}

// FR-008: start times and total are computed from durations, never stored.
type Timed = { scenes: readonly { durationMs: number }[] };

export function sceneStartsMs(story: Timed): number[] {
  let start = 0;
  return story.scenes.map(({ durationMs }) => {
    const at = start;
    start += durationMs;
    return at;
  });
}

export function totalDurationMs(story: Timed): number {
  return story.scenes.reduce((sum, { durationMs }) => sum + durationMs, 0);
}
