// Upgrades a stored story to the current format, one version at a time (FR-012–FR-014, HLD §8.5).

export type Step = (story: Record<string, unknown>) => Record<string, unknown>;

export type VersionError = { rule: "schema-version"; path: "schemaVersion"; message: string };

// STEPS[n] turns a version n+1 story into version n+2. Empty today, so the current version is 1.
const STEPS: readonly Step[] = [];

export function migrate(
  input: Record<string, unknown>,
  steps: readonly Step[] = STEPS,
): { ok: true; story: Record<string, unknown> } | { ok: false; errors: VersionError[] } {
  const current = steps.length + 1;
  const version = input.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1 || version > current) {
    const message = `Format version must be a whole number from 1 to ${current}`;
    return { ok: false, errors: [{ rule: "schema-version", path: "schemaVersion", message }] };
  }
  if (version === current) return { ok: true, story: input };

  // One copy, so the steps never change the caller's input.
  let story = structuredClone(input);
  steps.slice(version - 1).forEach((step, i) => {
    story = { ...step(story), schemaVersion: version + i + 1 };
  });
  return { ok: true, story };
}
