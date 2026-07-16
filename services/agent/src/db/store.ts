import type {
  AiEvaluation,
  Application,
  DailyReport,
  FollowUpDraft,
  NormalizedJob,
  RunRecord,
  SourceConfig,
  UserProfile,
  WeeklyTrendInsight,
} from "@opportun-ai-t/core";

/**
 * Persistence surface used by the career-agent pipeline.
 * DynamoDB in AWS; in-memory for local dry-run / unit tests.
 */
export interface CareerAgentStore {
  getProfile(userId?: string): Promise<UserProfile | null>;
  putProfile(profile: UserProfile): Promise<void>;
  listSources(userId?: string): Promise<SourceConfig[]>;
  getRun(runDate: string): Promise<RunRecord | null>;
  claimOrLoadRun(input: {
    runDate: string;
    requestId?: string;
    nowIso: string;
  }): Promise<{ claimed: boolean; run: RunRecord; skipReason?: string }>;
  finalizeRun(run: RunRecord): Promise<void>;
  putJobIfNew(job: NormalizedJob): Promise<boolean>;
  listKnownFingerprints(limit?: number): Promise<Set<string>>;
  putEvaluation(evaluation: AiEvaluation): Promise<void>;
  listApplications(): Promise<Application[]>;
  putApplication(app: Application): Promise<void>;
  putFollowUp(draft: FollowUpDraft): Promise<void>;
  listFollowUpsForApp(fingerprint: string): Promise<FollowUpDraft[]>;
  putDailyReport(report: DailyReport): Promise<void>;
  putWeeklyTrend(trend: WeeklyTrendInsight): Promise<void>;
  getWeeklyTrend(yearWeek: string): Promise<WeeklyTrendInsight | null>;
}
