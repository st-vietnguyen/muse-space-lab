// Uses domain by package name, the way workspace packages import each other (pnpm links it in node_modules).
import { rule } from "@musespace/domain";
export const engine = rule;
