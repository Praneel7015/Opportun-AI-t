import "server-only";

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ApplicationSchema,
  ApplicationStatus,
  AiEvaluationSchema,
  DailyReportSchema,
  EntityKind,
  FollowUpDraftSchema,
  NormalizedJobSchema,
  QueryPrefixes,
  RunRecordSchema,
  SourceConfigSchema,
  UserProfileSchema,
  WeeklyTrendInsightSchema,
  applicationKeys,
  dailyReportKeys,
  evaluationKeys,
  followUpKeys,
  jobKeys,
  profileKeys,
  runKeys,
  sourceKeys,
  weeklyReportKeys,
  type AiEvaluation,
  type Application,
  type ApplicationStatus as AppStatus,
  type DailyReport,
  type FollowUpDraft,
  type NormalizedJob,
  type RunRecord,
  type SourceConfig,
  type UserProfile,
  type WeeklyTrendInsight,
} from "@opportun-ai-t/core";
import { getDocClient, getTableName, useMemoryStore } from "./client";
import {
  memoryDelete,
  memoryGet,
  memoryPut,
  memoryQueryByPk,
  memoryQueryGsi1,
  memoryQueryGsi2,
  type DynamoItem,
} from "./memory";
import type {
  OpportunityFilters,
  UpdateApplicationInput,
  UpdateProfileInput,
  UpsertSourceInput,
} from "../domain/mutations";

function tableOrThrow(): string {
  const name = getTableName();
  if (!name) {
    throw new Error("TABLE_NAME is required when DEMO_MODE is disabled");
  }
  return name;
}

async function putItem(item: DynamoItem): Promise<void> {
  if (useMemoryStore()) {
    memoryPut(item);
    return;
  }
  await getDocClient().send(
    new PutCommand({ TableName: tableOrThrow(), Item: item }),
  );
}

async function getItem(pk: string, sk: string): Promise<DynamoItem | undefined> {
  if (useMemoryStore()) {
    return memoryGet(pk, sk);
  }
  const res = await getDocClient().send(
    new GetCommand({
      TableName: tableOrThrow(),
      Key: { PK: pk, SK: sk },
    }),
  );
  return res.Item as DynamoItem | undefined;
}

async function queryPk(pk: string, skPrefix: string): Promise<DynamoItem[]> {
  if (useMemoryStore()) {
    return memoryQueryByPk(pk, skPrefix);
  }
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: tableOrThrow(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": pk, ":sk": skPrefix },
    }),
  );
  return (res.Items ?? []) as DynamoItem[];
}

async function queryGsi1(gsi1pk: string): Promise<DynamoItem[]> {
  if (useMemoryStore()) {
    return memoryQueryGsi1(gsi1pk);
  }
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: tableOrThrow(),
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": gsi1pk },
      ScanIndexForward: false,
    }),
  );
  return (res.Items ?? []) as DynamoItem[];
}

async function queryGsi2(gsi2pk: string): Promise<DynamoItem[]> {
  if (useMemoryStore()) {
    return memoryQueryGsi2(gsi2pk);
  }
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: tableOrThrow(),
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: { ":pk": gsi2pk },
      ScanIndexForward: false,
    }),
  );
  return (res.Items ?? []) as DynamoItem[];
}

async function deleteItem(pk: string, sk: string): Promise<void> {
  if (useMemoryStore()) {
    memoryDelete(pk, sk);
    return;
  }
  await getDocClient().send(
    new DeleteCommand({
      TableName: tableOrThrow(),
      Key: { PK: pk, SK: sk },
    }),
  );
}

function stripKeys<T extends Record<string, unknown>>(item: DynamoItem): T {
  const {
    PK: _pk,
    SK: _sk,
    GSI1PK: _g1,
    GSI1SK: _g1s,
    GSI2PK: _g2,
    GSI2SK: _g2s,
    ...rest
  } = item;
  return rest as unknown as T;
}

export function getDataMode(): "memory" | "dynamodb" {
  return useMemoryStore() ? "memory" : "dynamodb";
}

export async function getProfile(): Promise<UserProfile | null> {
  const keys = profileKeys();
  const item = await getItem(keys.PK, keys.SK);
  if (!item) return null;
  return UserProfileSchema.parse(stripKeys(item));
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<UserProfile> {
  const now = new Date().toISOString();
  const existing = (await getProfile()) ?? {
    entityType: "PROFILE" as const,
    userId: "default",
    displayName: "User",
    email: "you@example.com",
    headline: "",
    preferences: {
      targetRoles: [],
      skills: [],
      locations: [],
      remoteOk: true,
      seniority: [],
      industries: [],
      keywordsInclude: [],
      keywordsExclude: [],
      minMatchScore: 50,
      staleFollowUpDays: 7,
    },
    timezone: process.env.SCHEDULE_TIMEZONE ?? "America/Los_Angeles",
    createdAt: now,
    updatedAt: now,
  };

  const next = UserProfileSchema.parse({
    ...existing,
    displayName: input.displayName ?? existing.displayName,
    email: input.email ?? existing.email,
    headline: input.headline ?? existing.headline,
    timezone: input.timezone ?? existing.timezone,
    preferences: {
      ...existing.preferences,
      ...(input.targetRoles ? { targetRoles: input.targetRoles } : {}),
      ...(input.skills ? { skills: input.skills } : {}),
      ...(input.locations ? { locations: input.locations } : {}),
      ...(input.remoteOk !== undefined ? { remoteOk: input.remoteOk } : {}),
      ...(input.staleFollowUpDays !== undefined
        ? { staleFollowUpDays: input.staleFollowUpDays }
        : {}),
    },
    updatedAt: now,
  });

  await putItem({ ...profileKeys(), ...next });
  return next;
}

export async function listSources(): Promise<SourceConfig[]> {
  const q = QueryPrefixes.userSources();
  const items = await queryPk(q.PK, q.SKBeginsWith);
  return items
    .map((item) => SourceConfigSchema.parse(stripKeys(item)))
    .sort((a, b) =>
      (a.displayName ?? a.boardOrSlug).localeCompare(
        b.displayName ?? b.boardOrSlug,
      ),
    );
}

export async function upsertSource(
  input: UpsertSourceInput,
): Promise<SourceConfig> {
  const now = new Date().toISOString();
  const existingItems = await queryPk(
    QueryPrefixes.userSources().PK,
    `SOURCE#${input.provider}#${input.boardOrSlug.toLowerCase()}`,
  );
  const existing = existingItems[0]
    ? SourceConfigSchema.parse(stripKeys(existingItems[0]))
    : null;

  const source = SourceConfigSchema.parse({
    entityType: "SOURCE",
    userId: "default",
    provider: input.provider,
    boardOrSlug: input.boardOrSlug.toLowerCase(),
    displayName: input.displayName,
    enabled: input.enabled,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  await putItem({
    ...sourceKeys(source.provider, source.boardOrSlug),
    ...source,
  });
  return source;
}

export async function deleteSource(
  provider: SourceConfig["provider"],
  boardOrSlug: string,
): Promise<void> {
  const keys = sourceKeys(provider, boardOrSlug);
  await deleteItem(keys.PK, keys.SK);
}

export async function listJobs(): Promise<NormalizedJob[]> {
  const items = await queryGsi2(QueryPrefixes.entitiesByType(EntityKind.JOB).GSI2PK);
  return items
    .map((item) => NormalizedJobSchema.parse(stripKeys(item)))
    .sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt));
}

export async function getJob(fingerprint: string): Promise<NormalizedJob | null> {
  const keys = jobKeys(fingerprint);
  const item = await getItem(keys.PK, keys.SK);
  if (!item) return null;
  return NormalizedJobSchema.parse(stripKeys(item));
}

export async function getLatestEvaluation(
  fingerprint: string,
): Promise<AiEvaluation | null> {
  const q = QueryPrefixes.evaluationsForJob(fingerprint);
  const items = await queryPk(q.PK, q.SKBeginsWith);
  if (items.length === 0) return null;
  const parsed = items.map((item) =>
    AiEvaluationSchema.parse(stripKeys(item)),
  );
  parsed.sort((a, b) => b.runDate.localeCompare(a.runDate));
  return parsed[0] ?? null;
}

export async function listLatestEvaluations(): Promise<AiEvaluation[]> {
  const items = await queryGsi2(
    QueryPrefixes.entitiesByType(EntityKind.EVALUATION).GSI2PK,
  );
  const all = items.map((item) => AiEvaluationSchema.parse(stripKeys(item)));
  const byFp = new Map<string, AiEvaluation>();
  for (const ev of all) {
    const prev = byFp.get(ev.fingerprint);
    if (!prev || ev.runDate > prev.runDate) {
      byFp.set(ev.fingerprint, ev);
    }
  }
  return [...byFp.values()].sort((a, b) => b.matchScore - a.matchScore);
}

export type OpportunityRow = {
  job: NormalizedJob;
  evaluation: AiEvaluation | null;
  saved: boolean;
};

export async function listOpportunities(
  filters: OpportunityFilters = {},
): Promise<OpportunityRow[]> {
  const [jobs, evaluations, applications] = await Promise.all([
    listJobs(),
    listLatestEvaluations(),
    listApplications(),
  ]);
  const evalByFp = new Map(evaluations.map((e) => [e.fingerprint, e]));
  const savedSet = new Set(
    applications
      .filter((a) => a.status === ApplicationStatus.SAVED)
      .map((a) => a.fingerprint),
  );

  let rows: OpportunityRow[] = jobs.map((job) => ({
    job,
    evaluation: evalByFp.get(job.fingerprint) ?? null,
    saved: savedSet.has(job.fingerprint),
  }));

  if (filters.saved) {
    rows = rows.filter((r) => r.saved);
  }
  if (filters.provider) {
    rows = rows.filter((r) => r.job.provider === filters.provider);
  }
  if (filters.minScore != null) {
    rows = rows.filter(
      (r) => (r.evaluation?.matchScore ?? 0) >= filters.minScore!,
    );
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.job.title.toLowerCase().includes(q) ||
        r.job.company.toLowerCase().includes(q),
    );
  }

  rows.sort((a, b) => {
    const sa = b.evaluation?.matchScore ?? -1;
    const sb = a.evaluation?.matchScore ?? -1;
    if (sa !== sb) return sa - sb;
    return b.job.discoveredAt.localeCompare(a.job.discoveredAt);
  });

  return rows;
}

/** Toggle Saved application status for a job fingerprint. */
export async function setJobSaved(
  fingerprint: string,
  saved: boolean,
): Promise<void> {
  const job = await getJob(fingerprint);
  if (!job) throw new Error(`Job not found: ${fingerprint}`);

  const existing = await getApplication(fingerprint);
  const now = new Date().toISOString();

  if (!saved) {
    if (existing?.status === ApplicationStatus.SAVED) {
      const keys = applicationKeys(
        fingerprint,
        existing.status,
        existing.updatedAt,
      );
      await deleteItem(keys.PK, keys.SK);
    }
    return;
  }

  if (existing && existing.status !== ApplicationStatus.SAVED) {
    // Already tracking as a real application — don't overwrite to Saved
    return;
  }

  const app = ApplicationSchema.parse({
    entityType: "APPLICATION",
    fingerprint,
    status: ApplicationStatus.SAVED,
    company: job.company,
    title: job.title,
    absoluteUrl: job.absoluteUrl,
    notes: existing?.notes ?? "",
    lastStatusAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  await putItem({
    ...applicationKeys(fingerprint, app.status, app.updatedAt),
    ...app,
  });
}

export async function listApplications(): Promise<Application[]> {
  const items = await queryGsi2(
    QueryPrefixes.entitiesByType(EntityKind.APPLICATION).GSI2PK,
  );
  return items
    .map((item) => ApplicationSchema.parse(stripKeys(item)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getApplication(
  fingerprint: string,
): Promise<Application | null> {
  const item = await getItem(`APP#${fingerprint}`, "META");
  if (!item) return null;
  return ApplicationSchema.parse(stripKeys(item));
}

export async function updateApplication(
  input: UpdateApplicationInput,
): Promise<Application> {
  const existing = await getApplication(input.fingerprint);
  if (!existing) {
    throw new Error(`Application not found: ${input.fingerprint}`);
  }

  const status: AppStatus = input.status ?? existing.status;
  const now = new Date().toISOString();
  const next = ApplicationSchema.parse({
    ...existing,
    status,
    notes: input.notes ?? existing.notes,
    lastStatusAt: input.status ? now : existing.lastStatusAt,
    updatedAt: now,
  });

  // Replace item so GSI1 status key updates (same PK/SK)
  await putItem({
    ...applicationKeys(next.fingerprint, next.status, next.updatedAt),
    ...next,
  });
  return next;
}

export async function listFollowUps(limit = 50): Promise<FollowUpDraft[]> {
  const items = await queryGsi2(
    QueryPrefixes.entitiesByType(EntityKind.FOLLOWUP).GSI2PK,
  );
  return items
    .map((item) => FollowUpDraftSchema.parse(stripKeys(item)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function listFollowUpsForApp(
  fingerprint: string,
): Promise<FollowUpDraft[]> {
  const q = QueryPrefixes.followUpsForApp(fingerprint);
  const items = await queryPk(q.PK, q.SKBeginsWith);
  return items
    .map((item) => FollowUpDraftSchema.parse(stripKeys(item)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listRuns(limit = 10): Promise<RunRecord[]> {
  const items = await queryGsi2(
    QueryPrefixes.entitiesByType(EntityKind.RUN).GSI2PK,
  );
  return items
    .map((item) => RunRecordSchema.parse(stripKeys(item)))
    .sort((a, b) => b.runDate.localeCompare(a.runDate))
    .slice(0, limit);
}

export async function getLatestRun(): Promise<RunRecord | null> {
  const runs = await listRuns(1);
  return runs[0] ?? null;
}

export type ReportListItem =
  | { kind: "daily"; report: DailyReport; id: string }
  | { kind: "weekly"; report: WeeklyTrendInsight; id: string };

export async function listReports(limit = 20): Promise<ReportListItem[]> {
  const items = await queryGsi2(
    QueryPrefixes.entitiesByType(EntityKind.REPORT).GSI2PK,
  );

  const out: ReportListItem[] = [];
  for (const item of items) {
    if (item.SK === "DAILY" || item.reportType === "DAILY") {
      const report = DailyReportSchema.parse(stripKeys(item));
      out.push({ kind: "daily", report, id: report.runDate });
    } else if (item.SK === "WEEKLY" || item.reportType === "WEEKLY") {
      const report = WeeklyTrendInsightSchema.parse(stripKeys(item));
      out.push({ kind: "weekly", report, id: report.yearWeek });
    }
  }

  out.sort((a, b) => {
    const da =
      a.kind === "daily" ? a.report.runDate : a.report.yearWeek;
    const db =
      b.kind === "daily" ? b.report.runDate : b.report.yearWeek;
    return db.localeCompare(da);
  });

  return out.slice(0, limit);
}

export async function getDailyReport(
  runDate: string,
): Promise<DailyReport | null> {
  const keys = dailyReportKeys(runDate);
  const item = await getItem(keys.PK, keys.SK);
  if (!item) return null;
  return DailyReportSchema.parse(stripKeys(item));
}

export async function getWeeklyReport(
  yearWeek: string,
): Promise<WeeklyTrendInsight | null> {
  const keys = weeklyReportKeys(yearWeek);
  const item = await getItem(keys.PK, keys.SK);
  if (!item) return null;
  return WeeklyTrendInsightSchema.parse(stripKeys(item));
}

export async function getLatestDailyReport(): Promise<DailyReport | null> {
  const reports = await listReports(50);
  const daily = reports.find((r) => r.kind === "daily");
  return daily && daily.kind === "daily" ? daily.report : null;
}

/** Exported for seed script DynamoDB writes that need evaluation keys. */
export { evaluationKeys, followUpKeys, jobKeys, runKeys };
