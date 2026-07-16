import {
  ApplicationSchema,
  DailyReportSchema,
  FollowUpDraftSchema,
  NormalizedJobSchema,
  RunRecordSchema,
  RunStatus,
  SourceConfigSchema,
  UserProfileSchema,
  WeeklyTrendInsightSchema,
  AiEvaluationSchema,
  type AiEvaluation,
  type Application,
  type DailyReport,
  type FollowUpDraft,
  type NormalizedJob,
  type RunRecord,
  type SourceConfig,
  type UserProfile,
  type WeeklyTrendInsight,
} from "@opportun-ai-t/core";
import { decideRunClaim } from "../pipeline/idempotency";
import type { CareerAgentStore } from "./store";

/** In-memory store for local dry-run and pipeline unit tests (no AWS). */
export class InMemoryRepository implements CareerAgentStore {
  profiles = new Map<string, UserProfile>();
  sources: SourceConfig[] = [];
  runs = new Map<string, RunRecord>();
  jobs = new Map<string, NormalizedJob>();
  evaluations: AiEvaluation[] = [];
  applications = new Map<string, Application>();
  followUps: FollowUpDraft[] = [];
  dailyReports = new Map<string, DailyReport>();
  weeklyTrends = new Map<string, WeeklyTrendInsight>();

  async getProfile(userId = "default"): Promise<UserProfile | null> {
    return this.profiles.get(userId) ?? null;
  }

  async putProfile(profile: UserProfile): Promise<void> {
    const parsed = UserProfileSchema.parse(profile);
    this.profiles.set(parsed.userId, parsed);
  }

  async listSources(_userId?: string): Promise<SourceConfig[]> {
    return this.sources.map((s) => SourceConfigSchema.parse(s));
  }

  async getRun(runDate: string): Promise<RunRecord | null> {
    return this.runs.get(runDate) ?? null;
  }

  async claimOrLoadRun(input: {
    runDate: string;
    requestId?: string;
    nowIso: string;
  }): Promise<{ claimed: boolean; run: RunRecord; skipReason?: string }> {
    const existing = await this.getRun(input.runDate);
    const decision = decideRunClaim(existing, input.nowIso);
    if (decision.action === "skip") {
      return {
        claimed: false,
        run: existing!,
        skipReason: decision.skipReason,
      };
    }

    const run = RunRecordSchema.parse({
      entityType: "RUN",
      runDate: input.runDate,
      status: RunStatus.RUNNING,
      startedAt: input.nowIso,
      metrics: existing?.metrics ?? {},
      requestId: input.requestId,
    });
    this.runs.set(input.runDate, run);
    return { claimed: true, run };
  }

  async finalizeRun(run: RunRecord): Promise<void> {
    const parsed = RunRecordSchema.parse(run);
    this.runs.set(parsed.runDate, parsed);
  }

  async putJobIfNew(job: NormalizedJob): Promise<boolean> {
    const parsed = NormalizedJobSchema.parse(job);
    const existing = this.jobs.get(parsed.fingerprint);
    if (existing) {
      this.jobs.set(parsed.fingerprint, {
        ...existing,
        lastSeenRunDate: parsed.lastSeenRunDate,
      });
      return false;
    }
    this.jobs.set(parsed.fingerprint, parsed);
    return true;
  }

  async listKnownFingerprints(): Promise<Set<string>> {
    return new Set(this.jobs.keys());
  }

  async putEvaluation(evaluation: AiEvaluation): Promise<void> {
    this.evaluations.push(AiEvaluationSchema.parse(evaluation));
  }

  async listApplications(): Promise<Application[]> {
    return [...this.applications.values()].map((a) =>
      ApplicationSchema.parse(a),
    );
  }

  async putApplication(app: Application): Promise<void> {
    const parsed = ApplicationSchema.parse(app);
    this.applications.set(parsed.fingerprint, parsed);
  }

  async putFollowUp(draft: FollowUpDraft): Promise<void> {
    this.followUps.push(FollowUpDraftSchema.parse(draft));
  }

  async listFollowUpsForApp(fingerprint: string): Promise<FollowUpDraft[]> {
    return this.followUps.filter((f) => f.fingerprint === fingerprint);
  }

  async putDailyReport(report: DailyReport): Promise<void> {
    const parsed = DailyReportSchema.parse(report);
    this.dailyReports.set(parsed.runDate, parsed);
  }

  async putWeeklyTrend(trend: WeeklyTrendInsight): Promise<void> {
    const parsed = WeeklyTrendInsightSchema.parse(trend);
    this.weeklyTrends.set(parsed.yearWeek, parsed);
  }

  async getWeeklyTrend(yearWeek: string): Promise<WeeklyTrendInsight | null> {
    return this.weeklyTrends.get(yearWeek) ?? null;
  }
}
