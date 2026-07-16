import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ApplicationSchema,
  DailyReportSchema,
  EntityKind,
  FollowUpDraftSchema,
  NormalizedJobSchema,
  QueryPrefixes,
  RunRecordSchema,
  RunStatus,
  SourceConfigSchema,
  UserProfileSchema,
  WeeklyTrendInsightSchema,
  AiEvaluationSchema,
  applicationKeys,
  dailyReportKeys,
  evaluationKeys,
  followUpKeys,
  jobKeys,
  jobKeysWithDate,
  profileKeys,
  runKeys,
  weeklyReportKeys,
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

export interface RepositoryOptions {
  tableName: string;
  region: string;
  client?: DynamoDBDocumentClient;
}

export class DynamoRepository implements CareerAgentStore {
  private readonly tableName: string;
  private readonly doc: DynamoDBDocumentClient;

  constructor(options: RepositoryOptions) {
    this.tableName = options.tableName;
    this.doc =
      options.client ??
      DynamoDBDocumentClient.from(
        new DynamoDBClient({ region: options.region }),
        {
          marshallOptions: { removeUndefinedValues: true },
        },
      );
  }

  async getProfile(userId?: string): Promise<UserProfile | null> {
    const keys = profileKeys(userId);
    const res = await this.doc.send(
      new GetCommand({ TableName: this.tableName, Key: keys }),
    );
    if (!res.Item) return null;
    return UserProfileSchema.parse(res.Item);
  }

  async putProfile(profile: UserProfile): Promise<void> {
    const parsed = UserProfileSchema.parse(profile);
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...profileKeys(parsed.userId), ...parsed },
      }),
    );
  }

  async listSources(userId?: string): Promise<SourceConfig[]> {
    const prefix = QueryPrefixes.userSources(userId);
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": prefix.PK,
          ":sk": prefix.SKBeginsWith,
        },
      }),
    );
    return (res.Items ?? []).map((item) => SourceConfigSchema.parse(item));
  }

  async getRun(runDate: string): Promise<RunRecord | null> {
    const keys = runKeys(runDate);
    const res = await this.doc.send(
      new GetCommand({ TableName: this.tableName, Key: { PK: keys.PK, SK: keys.SK } }),
    );
    if (!res.Item) return null;
    return RunRecordSchema.parse(res.Item);
  }

  /**
   * Idempotent run claim: creates RUNNING run if absent.
   * Returns { claimed: false } when an existing COMPLETED run already finished
   * (or email already sent) so Scheduler retries are no-ops.
   * Stale RUNNING claims (older than 10 minutes) may be reclaimed after a crash.
   */
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

    const run: RunRecord = RunRecordSchema.parse({
      entityType: "RUN",
      runDate: input.runDate,
      status: RunStatus.RUNNING,
      startedAt: input.nowIso,
      metrics: existing?.metrics ?? {},
      requestId: input.requestId,
    });

    const keys = runKeys(input.runDate);
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...keys, ...run },
      }),
    );

    return { claimed: true, run };
  }

  async finalizeRun(run: RunRecord): Promise<void> {
    const parsed = RunRecordSchema.parse(run);
    const keys = runKeys(parsed.runDate);
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...keys, ...parsed },
      }),
    );
  }

  async getJob(fingerprint: string): Promise<NormalizedJob | null> {
    const keys = jobKeys(fingerprint);
    const res = await this.doc.send(
      new GetCommand({ TableName: this.tableName, Key: keys }),
    );
    if (!res.Item) return null;
    return NormalizedJobSchema.parse(res.Item);
  }

  /** Conditional put — skips if fingerprint already exists. Returns true if inserted. */
  async putJobIfNew(job: NormalizedJob): Promise<boolean> {
    const parsed = NormalizedJobSchema.parse(job);
    const keys = jobKeysWithDate(parsed.fingerprint, parsed.discoveredAt);
    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.tableName,
          Item: { ...keys, ...parsed },
          ConditionExpression: "attribute_not_exists(PK)",
        }),
      );
      return true;
    } catch (err) {
      if (isConditionalCheckFailed(err)) {
        // Touch lastSeenRunDate on existing job
        await this.doc.send(
          new UpdateCommand({
            TableName: this.tableName,
            Key: jobKeys(parsed.fingerprint),
            UpdateExpression: "SET lastSeenRunDate = :d",
            ExpressionAttributeValues: { ":d": parsed.lastSeenRunDate },
          }),
        );
        return false;
      }
      throw err;
    }
  }

  async listKnownFingerprints(limit = 2000): Promise<Set<string>> {
    const prefix = QueryPrefixes.entitiesByType(EntityKind.JOB);
    const fingerprints = new Set<string>();
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const res = await this.doc.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: prefix.indexName,
          KeyConditionExpression: "GSI2PK = :pk",
          ExpressionAttributeValues: { ":pk": prefix.GSI2PK },
          ProjectionExpression: "fingerprint",
          ExclusiveStartKey: exclusiveStartKey,
          Limit: Math.min(500, limit - fingerprints.size),
        }),
      );
      for (const item of res.Items ?? []) {
        if (typeof item.fingerprint === "string") {
          fingerprints.add(item.fingerprint);
        }
      }
      exclusiveStartKey = res.LastEvaluatedKey as
        | Record<string, unknown>
        | undefined;
    } while (exclusiveStartKey && fingerprints.size < limit);

    return fingerprints;
  }

  async putEvaluation(evaluation: AiEvaluation): Promise<void> {
    const parsed = AiEvaluationSchema.parse(evaluation);
    const keys = evaluationKeys(parsed.fingerprint, parsed.runDate);
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...keys, ...parsed },
      }),
    );
  }

  async listApplications(): Promise<Application[]> {
    const prefix = QueryPrefixes.entitiesByType(EntityKind.APPLICATION);
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: prefix.indexName,
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": prefix.GSI2PK },
      }),
    );
    return (res.Items ?? []).map((item) => ApplicationSchema.parse(item));
  }

  async putApplication(app: Application): Promise<void> {
    const parsed = ApplicationSchema.parse(app);
    const keys = applicationKeys(
      parsed.fingerprint,
      parsed.status,
      parsed.updatedAt,
    );
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...keys, ...parsed },
      }),
    );
  }

  async putFollowUp(draft: FollowUpDraft): Promise<void> {
    const parsed = FollowUpDraftSchema.parse(draft);
    const keys = followUpKeys(parsed.fingerprint, parsed.createdAt);
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...keys, ...parsed },
      }),
    );
  }

  async listFollowUpsForApp(fingerprint: string): Promise<FollowUpDraft[]> {
    const prefix = QueryPrefixes.followUpsForApp(fingerprint);
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": prefix.PK,
          ":sk": prefix.SKBeginsWith,
        },
      }),
    );
    return (res.Items ?? []).map((item) => FollowUpDraftSchema.parse(item));
  }

  async putDailyReport(report: DailyReport): Promise<void> {
    const parsed = DailyReportSchema.parse(report);
    const keys = dailyReportKeys(parsed.runDate);
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...keys, ...parsed },
      }),
    );
  }

  async putWeeklyTrend(trend: WeeklyTrendInsight): Promise<void> {
    const parsed = WeeklyTrendInsightSchema.parse(trend);
    const keys = weeklyReportKeys(parsed.yearWeek);
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...keys, ...parsed },
      }),
    );
  }

  async getWeeklyTrend(yearWeek: string): Promise<WeeklyTrendInsight | null> {
    const keys = weeklyReportKeys(yearWeek);
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: keys.PK, SK: keys.SK },
      }),
    );
    if (!res.Item) return null;
    return WeeklyTrendInsightSchema.parse(res.Item);
  }
}

function isConditionalCheckFailed(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: string }).name === "ConditionalCheckFailedException"
  );
}
