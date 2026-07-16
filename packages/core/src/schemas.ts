import { z } from "zod";
import {
  ApplicationStatus,
  ApplyRecommendation,
  DEFAULT_STALE_FOLLOWUP_DAYS,
  DEFAULT_USER_ID,
  InterviewDifficulty,
  JobSourceProvider,
  RunStatus,
} from "./constants";

const IsoDateTimeSchema = z.string().min(1);
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const CareerPreferencesSchema = z.object({
  targetRoles: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  remoteOk: z.boolean().default(true),
  seniority: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  keywordsInclude: z.array(z.string()).default([]),
  keywordsExclude: z.array(z.string()).default([]),
  minMatchScore: z.number().min(0).max(100).default(50),
  staleFollowUpDays: z
    .number()
    .int()
    .positive()
    .default(DEFAULT_STALE_FOLLOWUP_DAYS),
  notes: z.string().optional(),
});

export type CareerPreferences = z.infer<typeof CareerPreferencesSchema>;

export const UserProfileSchema = z.object({
  entityType: z.literal("PROFILE"),
  userId: z.string().default(DEFAULT_USER_ID),
  displayName: z.string().min(1),
  email: z.string().email(),
  headline: z.string().optional(),
  preferences: CareerPreferencesSchema.default({}),
  timezone: z.string().default("America/Los_Angeles"),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const SourceConfigSchema = z.object({
  entityType: z.literal("SOURCE"),
  userId: z.string().default(DEFAULT_USER_ID),
  provider: z.enum([
    JobSourceProvider.GREENHOUSE,
    JobSourceProvider.LEVER,
  ]),
  /** Greenhouse board token or Lever company slug. */
  boardOrSlug: z.string().min(1),
  displayName: z.string().optional(),
  enabled: z.boolean().default(true),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type SourceConfig = z.infer<typeof SourceConfigSchema>;

export const NormalizedJobSchema = z.object({
  entityType: z.literal("JOB"),
  fingerprint: z.string().min(8),
  provider: z.enum([
    JobSourceProvider.GREENHOUSE,
    JobSourceProvider.LEVER,
  ]),
  boardOrSlug: z.string().min(1),
  externalId: z.string().optional(),
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  absoluteUrl: z.string().url(),
  descriptionText: z.string().optional(),
  departments: z.array(z.string()).default([]),
  employmentType: z.string().optional(),
  postedAt: IsoDateTimeSchema.optional(),
  discoveredAt: IsoDateTimeSchema,
  firstSeenRunDate: IsoDateSchema,
  lastSeenRunDate: IsoDateSchema,
  rawSnippet: z.string().optional(),
});

export type NormalizedJob = z.infer<typeof NormalizedJobSchema>;

/** Labeled estimate fields — UI should surface as estimates, not facts. */
export const InferredEstimateSchema = z.object({
  value: z.string(),
  isEstimate: z.literal(true),
  confidence: z.enum(["low", "medium", "high"]).default("low"),
  rationale: z.string().optional(),
});

export type InferredEstimate = z.infer<typeof InferredEstimateSchema>;

export const AiEvaluationSchema = z.object({
  entityType: z.literal("EVALUATION"),
  fingerprint: z.string().min(8),
  runDate: IsoDateSchema,
  modelId: z.string().min(1),
  matchScore: z.number().min(0).max(100),
  reasons: z.array(z.string()).min(1),
  missingSkills: z.array(z.string()).default([]),
  recommendation: z.enum([
    ApplyRecommendation.STRONG_YES,
    ApplyRecommendation.YES,
    ApplyRecommendation.MAYBE,
    ApplyRecommendation.NO,
  ]),
  interviewDifficulty: z.enum([
    InterviewDifficulty.LOW,
    InterviewDifficulty.MEDIUM,
    InterviewDifficulty.HIGH,
    InterviewDifficulty.UNKNOWN,
  ]),
  companyInference: InferredEstimateSchema.optional(),
  stackInference: InferredEstimateSchema.optional(),
  summary: z.string().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  createdAt: IsoDateTimeSchema,
});

export type AiEvaluation = z.infer<typeof AiEvaluationSchema>;

export const ApplicationStatusSchema = z.enum([
  ApplicationStatus.SAVED,
  ApplicationStatus.APPLIED,
  ApplicationStatus.OA_RECEIVED,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
  ApplicationStatus.GHOSTED,
  ApplicationStatus.WITHDRAWN,
]);

export const ApplicationSchema = z.object({
  entityType: z.literal("APPLICATION"),
  fingerprint: z.string().min(8),
  status: ApplicationStatusSchema,
  company: z.string().min(1),
  title: z.string().min(1),
  absoluteUrl: z.string().url().optional(),
  notes: z.string().optional(),
  appliedAt: IsoDateTimeSchema.optional(),
  lastStatusAt: IsoDateTimeSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type Application = z.infer<typeof ApplicationSchema>;

export const FollowUpDraftSchema = z.object({
  entityType: z.literal("FOLLOWUP"),
  fingerprint: z.string().min(8),
  applicationStatus: ApplicationStatusSchema,
  reminder: z.string().min(1),
  suggestedAction: z.string().min(1),
  /** Draft email body — never auto-sent; stored for user review only. */
  draftEmail: z.string().min(1),
  staleDays: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
  runDate: IsoDateSchema,
});

export type FollowUpDraft = z.infer<typeof FollowUpDraftSchema>;

export const RunMetricsSchema = z.object({
  jobsFetched: z.number().int().nonnegative().default(0),
  jobsDeduped: z.number().int().nonnegative().default(0),
  jobsNew: z.number().int().nonnegative().default(0),
  jobsAnalyzed: z.number().int().nonnegative().default(0),
  bedrockErrors: z.number().int().nonnegative().default(0),
  followUpsCreated: z.number().int().nonnegative().default(0),
  emailSent: z.boolean().default(false),
  emailError: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
});

export type RunMetrics = z.infer<typeof RunMetricsSchema>;

export const RunRecordSchema = z.object({
  entityType: z.literal("RUN"),
  runDate: IsoDateSchema,
  status: z.enum([
    RunStatus.PENDING,
    RunStatus.RUNNING,
    RunStatus.COMPLETED,
    RunStatus.FAILED,
  ]),
  startedAt: IsoDateTimeSchema.optional(),
  finishedAt: IsoDateTimeSchema.optional(),
  metrics: RunMetricsSchema.default({}),
  errorMessage: z.string().optional(),
  /** Idempotency: once true, repeated Scheduler delivery must not re-send SES. */
  emailSentAt: IsoDateTimeSchema.optional(),
  requestId: z.string().optional(),
});

export type RunRecord = z.infer<typeof RunRecordSchema>;

export const DailyReportSchema = z.object({
  entityType: z.literal("REPORT"),
  reportType: z.literal("DAILY"),
  runDate: IsoDateSchema,
  subject: z.string().min(1),
  summaryMarkdown: z.string().min(1),
  topMatches: z
    .array(
      z.object({
        fingerprint: z.string(),
        company: z.string(),
        title: z.string(),
        matchScore: z.number(),
        recommendation: z.string(),
      }),
    )
    .default([]),
  followUpCount: z.number().int().nonnegative().default(0),
  trendInsight: z.string().optional(),
  createdAt: IsoDateTimeSchema,
});

export type DailyReport = z.infer<typeof DailyReportSchema>;

export const WeeklyTrendInsightSchema = z.object({
  entityType: z.literal("REPORT"),
  reportType: z.literal("WEEKLY"),
  yearWeek: z.string().regex(/^\d{4}-W\d{2}$/),
  insight: z.string().min(1),
  jobsNewTotal: z.number().int().nonnegative().default(0),
  avgMatchScore: z.number().min(0).max(100).optional(),
  topCompanies: z.array(z.string()).default([]),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type WeeklyTrendInsight = z.infer<typeof WeeklyTrendInsightSchema>;

/** Structured JSON expected from Bedrock job evaluation (pre-persist). */
export const BedrockEvaluationOutputSchema = z.object({
  matchScore: z.number().min(0).max(100),
  reasons: z.array(z.string()).min(1).max(8),
  missingSkills: z.array(z.string()).max(12).default([]),
  recommendation: z.enum([
    ApplyRecommendation.STRONG_YES,
    ApplyRecommendation.YES,
    ApplyRecommendation.MAYBE,
    ApplyRecommendation.NO,
  ]),
  interviewDifficulty: z.enum([
    InterviewDifficulty.LOW,
    InterviewDifficulty.MEDIUM,
    InterviewDifficulty.HIGH,
    InterviewDifficulty.UNKNOWN,
  ]),
  companyInference: z
    .object({
      value: z.string(),
      confidence: z.enum(["low", "medium", "high"]).default("low"),
      rationale: z.string().optional(),
    })
    .optional(),
  stackInference: z
    .object({
      value: z.string(),
      confidence: z.enum(["low", "medium", "high"]).default("low"),
      rationale: z.string().optional(),
    })
    .optional(),
  summary: z.string().optional(),
});

export type BedrockEvaluationOutput = z.infer<
  typeof BedrockEvaluationOutputSchema
>;
