// Allowed: zod and contracts.
import { z } from "zod";
import type { Snapshot } from "../../contracts/src/snapshot.js";
export const rule = (s: Snapshot) => z.number().parse(s.snapshotVersion);
