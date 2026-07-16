import "server-only";

import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";

import { getAwsRegion, getTableName } from "@/lib/db/client";
import {
  getDataMode,
  getLatestDailyReport,
  getLatestRun,
  getProfile,
  listSources,
} from "@/lib/db/repositories";

export type CheckStatus = "pass" | "fail" | "skip" | "warn";

export interface HealthCheck {
  name: string;
  status: CheckStatus;
  detail: string;
  latencyMs?: number;
}

export interface HealthReport {
  status: "ok" | "degraded" | "error";
  service: "opportun-ai-t-web";
  timestamp: string;
  mode: "memory" | "dynamodb";
  region: string;
  env: {
    DEMO_MODE: string | null;
    TABLE_NAME_set: boolean;
    TABLE_NAME: string | null;
    APP_REGION: string | null;
    SCHEDULE_TIMEZONE: string | null;
  };
  checks: HealthCheck[];
  summary: {
    profilePresent: boolean;
    sourceCount: number;
    latestRunDate: string | null;
    latestRunStatus: string | null;
    latestReportDate: string | null;
  };
  diagnosis: string[];
}

function envFlag(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; latencyMs: number }> {
  const start = Date.now();
  const value = await fn();
  return { value, latencyMs: Date.now() - start };
}

export async function runHealthCheck(): Promise<HealthReport> {
  const checks: HealthCheck[] = [];
  const diagnosis: string[] = [];
  const mode = getDataMode();
  const region = getAwsRegion();
  const tableName = getTableName() ?? null;
  const demoMode = envFlag("DEMO_MODE");

  checks.push({
    name: "config",
    status:
      mode === "dynamodb" && tableName
        ? "pass"
        : mode === "memory"
          ? "warn"
          : "fail",
    detail:
      mode === "memory"
        ? "Running on in-memory demo store (not live DynamoDB)."
        : tableName
          ? `Configured for DynamoDB table ${tableName}.`
          : "DEMO_MODE=0 but TABLE_NAME is missing.",
  });

  if (mode === "memory") {
    if (demoMode === "1" || demoMode === "true") {
      diagnosis.push(
        "DEMO_MODE is explicitly enabled. Set DEMO_MODE=0 in Amplify env vars (or local .env) and redeploy/restart.",
      );
    } else if (!tableName) {
      diagnosis.push(
        "TABLE_NAME is not set, so the app fell back to demo memory mode. Set TABLE_NAME to the CDK stack table output.",
      );
    }
  }

  let profilePresent = false;
  let sourceCount = 0;
  let latestRunDate: string | null = null;
  let latestRunStatus: string | null = null;
  let latestReportDate: string | null = null;
  let dynamoOk = mode === "memory";

  if (mode === "dynamodb") {
    if (!tableName) {
      checks.push({
        name: "dynamodb.describeTable",
        status: "fail",
        detail: "Cannot probe DynamoDB without TABLE_NAME.",
      });
      diagnosis.push("Set TABLE_NAME and APP_REGION, then restart the app.");
    } else {
      try {
        const client = new DynamoDBClient({ region });
        const { latencyMs } = await timed(() =>
          client.send(new DescribeTableCommand({ TableName: tableName })),
        );
        checks.push({
          name: "dynamodb.describeTable",
          status: "pass",
          detail: `Table reachable in ${region}.`,
          latencyMs,
        });
        dynamoOk = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        checks.push({
          name: "dynamodb.describeTable",
          status: "fail",
          detail: message,
        });
        dynamoOk = false;
        if (/AccessDenied|not authorized|UnrecognizedClient/i.test(message)) {
          diagnosis.push(
            "IAM credentials used by this web runtime cannot access DynamoDB. Attach DynamoDB read/write on the Amplify SSR/compute role (or use local AWS CLI credentials).",
          );
        } else if (
          /ResourceNotFound|Requested resource not found/i.test(message)
        ) {
          diagnosis.push(
            `DynamoDB table "${tableName}" was not found in ${region}. Confirm the CDK stack region and TABLE_NAME.`,
          );
        } else {
          diagnosis.push(`DynamoDB probe failed: ${message}`);
        }
      }
    }
  } else {
    checks.push({
      name: "dynamodb.describeTable",
      status: "skip",
      detail: "Skipped while demo/memory mode is active.",
    });
  }

  try {
    const { value: profile, latencyMs } = await timed(() => getProfile());
    profilePresent = Boolean(profile);
    checks.push({
      name: "data.profile",
      status: profilePresent ? "pass" : "warn",
      detail: profilePresent
        ? `Profile loaded for ${profile?.email ?? profile?.displayName ?? "user"}.`
        : "No user profile found. Seed profile/sources before expecting agent matches.",
      latencyMs,
    });
    if (!profilePresent) {
      diagnosis.push(
        "No profile in the active store. Run `npm run seed -w @opportun-ai-t/web` with DEMO_MODE=0 and TABLE_NAME set, or save Settings in the UI.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({
      name: "data.profile",
      status: "fail",
      detail: message,
    });
    diagnosis.push(`Profile read failed: ${message}`);
  }

  try {
    const { value: sources, latencyMs } = await timed(() => listSources());
    sourceCount = sources.length;
    checks.push({
      name: "data.sources",
      status: sourceCount > 0 ? "pass" : "warn",
      detail:
        sourceCount > 0
          ? `${sourceCount} job source(s) configured.`
          : "No Greenhouse/Lever sources configured.",
      latencyMs,
    });
    if (sourceCount === 0) {
      diagnosis.push(
        "Add Greenhouse board tokens and/or Lever company slugs under Settings so the Lambda agent has boards to scrape.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({
      name: "data.sources",
      status: "fail",
      detail: message,
    });
  }

  try {
    const { value: run, latencyMs } = await timed(() => getLatestRun());
    latestRunDate = run?.runDate ?? null;
    latestRunStatus = run?.status ?? null;
    const fetched = run?.metrics?.jobsFetched;
    const analyzed = run?.metrics?.jobsAnalyzed;
    checks.push({
      name: "agent.latestRun",
      status: run ? "pass" : "warn",
      detail: run
        ? `Latest run ${run.runDate} status=${run.status}` +
          (fetched !== undefined || analyzed !== undefined
            ? ` (fetched=${fetched ?? "?"}, analyzed=${analyzed ?? "?"})`
            : "")
        : "No agent run records yet. Wait for the 08:00 IST schedule or invoke the Lambda manually.",
      latencyMs,
    });
    if (!run && mode === "dynamodb" && dynamoOk) {
      diagnosis.push(
        "DynamoDB is reachable but no agent runs exist yet. Invoke `opportun-ai-t-career-agent` or wait for EventBridge schedule `opportun-ai-t-daily-8am`.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({
      name: "agent.latestRun",
      status: "fail",
      detail: message,
    });
  }

  try {
    const { value: report, latencyMs } = await timed(() =>
      getLatestDailyReport(),
    );
    latestReportDate = report?.runDate ?? null;
    checks.push({
      name: "agent.latestDailyReport",
      status: report ? "pass" : "warn",
      detail: report
        ? `Latest daily briefing ${report.runDate}.`
        : "No daily briefing stored yet.",
      latencyMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({
      name: "agent.latestDailyReport",
      status: "fail",
      detail: message,
    });
  }

  const failed = checks.some((c) => c.status === "fail");
  const warned = checks.some((c) => c.status === "warn");
  const status: HealthReport["status"] = failed
    ? "error"
    : warned || mode === "memory"
      ? "degraded"
      : "ok";

  if (status === "ok" && diagnosis.length === 0) {
    diagnosis.push(
      "Control center is live on DynamoDB with profile/sources and agent activity visible.",
    );
  }

  return {
    status,
    service: "opportun-ai-t-web",
    timestamp: new Date().toISOString(),
    mode,
    region,
    env: {
      DEMO_MODE: demoMode,
      TABLE_NAME_set: Boolean(tableName),
      TABLE_NAME: tableName,
      APP_REGION: envFlag("APP_REGION"),
      SCHEDULE_TIMEZONE: envFlag("SCHEDULE_TIMEZONE"),
    },
    checks,
    summary: {
      profilePresent,
      sourceCount,
      latestRunDate,
      latestRunStatus,
      latestReportDate,
    },
    diagnosis,
  };
}
