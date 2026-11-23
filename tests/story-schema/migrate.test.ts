import { describe, expect, test } from "vitest";
import { migrate, type Step } from "../../packages/story-schema/src/migrate.js";
import { parseStory } from "../../packages/story-schema/src/story.js";
import { story } from "./sample-story.js";

// Spec 002 US3: older stories are upgraded one version at a time; unknown versions are rejected; the input never changes.
const schemaVersionError = {
  ok: false,
  errors: [{ rule: "schema-version", path: "schemaVersion", message: expect.any(String) }],
};

// A test-only format with versions 1, 2 and 3. Each step records the version it received, so the order and the
// version set after each step are visible. The first step changes its argument, so a missing copy breaks the input.
const steps: Step[] = [
  (old) => {
    (old.log as string[]).push(`${String(old.schemaVersion)}→2`);
    return old;
  },
  (old) => ({ ...old, log: [...(old.log as string[]), `${String(old.schemaVersion)}→3`] }),
];

const noVersion: Record<string, unknown> = { ...story };
delete noVersion.schemaVersion;

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe("the current format", () => {
  test("should return a current-version story as it is", () => {
    const result = migrate(story);
    expect(result).toEqual({ ok: true, story });
    expect(result.ok && result.story).toBe(story);
  });

  test.each([
    ["no version", noVersion],
    ['version "1"', { ...story, schemaVersion: "1" }],
    ["version 0", { ...story, schemaVersion: 0 }],
    ["version 1.5", { ...story, schemaVersion: 1.5 }],
    ["version 2", { ...story, schemaVersion: 2 }],
  ])("should reject a story with %s", (_, input) => {
    expect(migrate(input)).toEqual(schemaVersionError);
  });

  test("should report only schema-version from parseStory for an unknown version", () => {
    expect(parseStory({ ...story, schemaVersion: 2, scenes: [] })).toEqual(schemaVersionError);
  });
});

describe("a format with versions 1, 2 and 3", () => {
  test.each([
    [1, ["1→2", "2→3"]],
    [2, ["2→3"]],
    [3, []],
  ])("should upgrade a version %i story with the steps %j", (schemaVersion, log) => {
    expect(migrate({ schemaVersion, log: [] }, steps)).toEqual({ ok: true, story: { schemaVersion: 3, log } });
  });

  test("should reject version 4", () => {
    expect(migrate({ schemaVersion: 4, log: [] }, steps)).toEqual(schemaVersionError);
  });
});

describe("the input", () => {
  test("should not be changed by an upgrade", () => {
    const input = deepFreeze({ schemaVersion: 1, log: [] });
    expect(migrate(input, steps)).toEqual({ ok: true, story: { schemaVersion: 3, log: ["1→2", "2→3"] } });
    expect(input).toEqual({ schemaVersion: 1, log: [] });
  });

  test("should not be changed by parseStory", () => {
    const input = deepFreeze(structuredClone(story));
    expect(parseStory(input)).toEqual({ ok: true, story });
  });
});
