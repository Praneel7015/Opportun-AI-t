/** Single-user MVP identity used in all PK prefixes. */
export const DEFAULT_USER_ID = "default";

export const EntityKind = {
  PROFILE: "PROFILE",
  SOURCE: "SOURCE",
  JOB: "JOB",
  EVALUATION: "EVALUATION",
  APPLICATION: "APPLICATION",
  FOLLOWUP: "FOLLOWUP",
  RUN: "RUN",
  REPORT: "REPORT",
} as const;

export type EntityKind = (typeof EntityKind)[keyof typeof EntityKind];

export const JobSourceProvider = {
  GREENHOUSE: "greenhouse",
  LEVER: "lever",
} as const;

export type JobSourceProvider =
  (typeof JobSourceProvider)[keyof typeof JobSourceProvider];

export const ApplicationStatus = {
  SAVED: "Saved",
  APPLIED: "Applied",
  OA_RECEIVED: "OA Received",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
  WITHDRAWN: "Withdrawn",
} as const;

export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const APPLICATION_STATUSES = Object.values(ApplicationStatus);

export const RunStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export const ApplyRecommendation = {
  STRONG_YES: "strong_yes",
  YES: "yes",
  MAYBE: "maybe",
  NO: "no",
} as const;

export type ApplyRecommendation =
  (typeof ApplyRecommendation)[keyof typeof ApplyRecommendation];

export const InterviewDifficulty = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  UNKNOWN: "unknown",
} as const;

export type InterviewDifficulty =
  (typeof InterviewDifficulty)[keyof typeof InterviewDifficulty];

/** Default days without update before a stale follow-up draft is created. */
export const DEFAULT_STALE_FOLLOWUP_DAYS = 7;

/** Default per-run Bedrock analysis cap (also overridable via ANALYSIS_CAP). */
export const DEFAULT_ANALYSIS_CAP = 10;
