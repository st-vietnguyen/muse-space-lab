import { z } from "zod";
import { migrate } from "./migrate.js";

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
    when: (payload) => payload.issues.length === 0, // one bad field gives one error, not two
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
  transcript: z.string().regex(/\S/, "Transcript must not be blank").optional(),
  scenes: z.array(scene).min(1).max(12),
});

export type Story = z.infer<typeof storySchema>;
export type Scene = Story["scenes"][number];
export type Effect = Scene["effect"];

const MAX_STORY_MS = 5 * 60_000;

export type StoryRule =
  | "schema-version"
  | "scene-count"
  | "story-length"
  | "scene-id"
  | "scene-duration"
  | "effect-unknown"
  | "effect-params"
  | "focus-region"
  | "narration"
  | "transcript"
  | "format";

export type StoryError = { rule: StoryRule; path: string; scene?: { index: number; id?: string }; message: string };

// Upgrades the story to the current format, then validates it. Input that is not an object is left to the schema.
export function parseStory(input: unknown): { ok: true; story: Story } | { ok: false; errors: StoryError[] } {
  const upgraded =
    typeof input === "object" && input !== null && !Array.isArray(input)
      ? migrate(input as Record<string, unknown>)
      : { ok: true as const, story: input };
  if (!upgraded.ok) return upgraded;
  const result = storySchema.safeParse(upgraded.story);
  const errors = result.success
    ? crossFieldErrors(result.data)
    : result.error.issues.map((issue) => ({ rule: ruleOf(issue), path: issue.path, message: issue.message }));
  if (errors.length === 0 && result.success) return { ok: true, story: result.data };
  return { ok: false, errors: errors.map((error) => toStoryError(error, upgraded.story)) };
}

type RawError = { rule: StoryRule; path: PropertyKey[]; message: string };

// Rules across fields (FR-003, FR-006, FR-007, FR-009), run only once every field is valid.
function crossFieldErrors(story: Story): RawError[] {
  const errors: RawError[] = [];
  const seen = new Set<string>();
  story.scenes.forEach(({ id }, index) => {
    if (seen.has(id)) errors.push({ rule: "scene-id", path: ["scenes", index, "id"], message: "Scene id is repeated" });
    seen.add(id);
  });
  const total = totalDurationMs(story);
  if (total > MAX_STORY_MS)
    errors.push({
      rule: "story-length",
      path: ["scenes"],
      message: `Story lasts ${total} ms, more than ${MAX_STORY_MS} ms`,
    });
  const { narration } = story;
  if (narration && narration.startAtMs + narration.durationMs > total)
    errors.push({ rule: "narration", path: ["narration"], message: "Narration ends after the story" });
  if (narration && story.transcript === undefined)
    errors.push({ rule: "transcript", path: ["transcript"], message: "A story with narration needs a transcript" });
  return errors;
}

// The rule follows from where Zod found the issue (plan "Error rules").
function ruleOf(issue: z.core.$ZodIssue): StoryRule {
  const [top, , field, sub, param] = issue.path;
  // migrate checks the version first; this catches a new step added without updating the schema's version.
  if (top === "schemaVersion") return "schema-version";
  if (top === "narration") return "narration";
  if (top === "transcript") return "transcript";
  if (top !== "scenes") return "format";
  if (issue.path.length === 1) return issue.code === "too_small" || issue.code === "too_big" ? "scene-count" : "format";
  if (field === "id") return "scene-id";
  if (field === "durationMs") return "scene-duration";
  if (field !== "effect") return "format";
  if (sub === undefined || sub === "type") return issue.code === "unrecognized_keys" ? "format" : "effect-unknown";
  return param === "region" ? "focus-region" : "effect-params";
}

function toStoryError({ rule, path, message }: RawError, input: unknown): StoryError {
  const error: StoryError = { rule, path: formatPath(path), message };
  const [top, index] = path;
  if (top === "scenes" && typeof index === "number") {
    // Check the type again on this second read: a getter may return something else the second time.
    const scenes: unknown = (input as { scenes?: unknown }).scenes;
    const scene: unknown = Array.isArray(scenes) ? scenes[index] : undefined;
    const id = typeof scene === "object" && scene !== null ? (scene as { id?: unknown }).id : undefined;
    error.scene = typeof id === "string" ? { index, id } : { index };
  }
  return error;
}

function formatPath(path: PropertyKey[]): string {
  return path.map((key, i) => (typeof key === "number" ? `[${key}]` : `${i === 0 ? "" : "."}${String(key)}`)).join("");
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
