/**
 * Seed demo data into DynamoDB (when TABLE_NAME + AWS credentials exist)
 * or refresh the in-memory store used for local offline demo.
 *
 * Usage (from repo root):
 *   npm run seed -w @opportun-ai-t/web
 *
 * Env:
 *   TABLE_NAME, AWS_REGION — write to DynamoDB
 *   DEMO_MODE=1 or missing TABLE_NAME — memory-only seed (prints confirmation)
 */

import { config } from "dotenv";
import { resolve } from "path";
import {
  applicationKeys,
  dailyReportKeys,
  evaluationKeys,
  followUpKeys,
  jobKeysWithDate,
  profileKeys,
  runKeys,
  sourceKeys,
  weeklyReportKeys,
} from "@opportun-ai-t/core";
import {
  DEMO_APPLICATIONS,
  DEMO_DAILY_REPORTS,
  DEMO_EVALUATIONS,
  DEMO_FOLLOWUPS,
  DEMO_JOBS,
  DEMO_PROFILE,
  DEMO_RUNS,
  DEMO_SOURCES,
  DEMO_WEEKLY_REPORTS,
} from "../src/lib/data/demo-seed";

config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../.env") });

async function main() {
  const tableName = process.env.TABLE_NAME?.trim();
  const forceMemory =
    process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";

  if (!tableName || forceMemory) {
    process.env.DEMO_MODE = "1";
    const { resetMemoryDb, memoryAllItems } = await import(
      "../src/lib/db/memory"
    );
    resetMemoryDb();
    const count = memoryAllItems().length;
    console.log(
      `[seed] In-memory demo store refreshed (${count} items). ` +
        `Set TABLE_NAME and unset DEMO_MODE to seed DynamoDB.`,
    );
    return;
  }

  process.env.DEMO_MODE = "0";
  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
  const { DynamoDBDocumentClient, PutCommand } = await import(
    "@aws-sdk/lib-dynamodb"
  );

  const region =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2";
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });

  const puts: Record<string, unknown>[] = [];

  puts.push({ ...profileKeys(), ...DEMO_PROFILE });

  for (const source of DEMO_SOURCES) {
    puts.push({
      ...sourceKeys(source.provider, source.boardOrSlug),
      ...source,
    });
  }

  for (const job of DEMO_JOBS) {
    puts.push({
      ...jobKeysWithDate(job.fingerprint, job.discoveredAt),
      ...job,
    });
  }

  for (const evaluation of DEMO_EVALUATIONS) {
    puts.push({
      ...evaluationKeys(evaluation.fingerprint, evaluation.runDate),
      ...evaluation,
    });
  }

  for (const application of DEMO_APPLICATIONS) {
    puts.push({
      ...applicationKeys(
        application.fingerprint,
        application.status,
        application.updatedAt,
      ),
      ...application,
    });
  }

  for (const followUp of DEMO_FOLLOWUPS) {
    puts.push({
      ...followUpKeys(followUp.fingerprint, followUp.createdAt),
      ...followUp,
    });
  }

  for (const run of DEMO_RUNS) {
    puts.push({ ...runKeys(run.runDate), ...run });
  }

  for (const report of DEMO_DAILY_REPORTS) {
    puts.push({ ...dailyReportKeys(report.runDate), ...report });
  }

  for (const report of DEMO_WEEKLY_REPORTS) {
    puts.push({ ...weeklyReportKeys(report.yearWeek), ...report });
  }

  console.log(
    `[seed] Writing ${puts.length} items to ${tableName} (${region})…`,
  );
  for (const item of puts) {
    await client.send(new PutCommand({ TableName: tableName, Item: item }));
  }
  console.log("[seed] Done.");
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
