/**
 * Web-only mutation / filter schemas. Entity shapes come from `@opportun-ai-t/core`.
 */
import { z } from "zod";
import {
  ApplicationStatusSchema,
  JobSourceProvider,
} from "@opportun-ai-t/core";

export const UpdateApplicationInputSchema = z.object({
  fingerprint: z.string().min(8),
  status: ApplicationStatusSchema.optional(),
  notes: z.string().max(5000).optional(),
});
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationInputSchema>;

export const UpdateProfileInputSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  headline: z.string().max(200).optional(),
  targetRoles: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  remoteOk: z.boolean().optional(),
  staleFollowUpDays: z.number().int().min(1).max(90).optional(),
  timezone: z.string().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const UpsertSourceInputSchema = z.object({
  provider: z.enum([
    JobSourceProvider.GREENHOUSE,
    JobSourceProvider.LEVER,
  ]),
  boardOrSlug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/i, "Use letters, numbers, and hyphens only"),
  displayName: z.string().min(1).max(120),
  enabled: z.boolean().default(true),
});
export type UpsertSourceInput = z.infer<typeof UpsertSourceInputSchema>;

export const OpportunityFiltersSchema = z.object({
  /** Filter to jobs with an Application in Saved status. */
  saved: z.boolean().optional(),
  minScore: z.number().min(0).max(100).optional(),
  provider: z
    .enum([JobSourceProvider.GREENHOUSE, JobSourceProvider.LEVER])
    .optional(),
  q: z.string().optional(),
});
export type OpportunityFilters = z.infer<typeof OpportunityFiltersSchema>;
