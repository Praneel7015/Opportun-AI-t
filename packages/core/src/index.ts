/**
 * Shared domain for Opportun-AI-t — Zod schemas, DynamoDB keys, fingerprints, dedupe.
 *
 * The Next.js control center and Lambda agent MUST import types from this package
 * so both sides read/write the same single-table items.
 */

export * from "./constants";
export * from "./fingerprint";
export * from "./keys";
export * from "./schemas";
export * from "./dedupe";

import { z } from "zod";

export const HealthSchema = z.object({
  ok: z.literal(true),
  package: z.literal("@opportun-ai-t/core"),
});

export type Health = z.infer<typeof HealthSchema>;

export function coreHealth(): Health {
  return HealthSchema.parse({
    ok: true,
    package: "@opportun-ai-t/core",
  });
}
