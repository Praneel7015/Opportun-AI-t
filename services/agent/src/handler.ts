import type { Handler } from "aws-lambda";
import { coreHealth } from "@opportun-ai-t/core";
import { loadConfig } from "./config";
import { DynamoRepository } from "./db";
import { log } from "./logging";
import { runCareerAgentPipeline } from "./pipeline";

/**
 * Career agent Lambda entry (CDK NodejsFunction handler: "handler").
 *
 * Pipeline (idempotent by local run date in SCHEDULE_TIMEZONE):
 * claim/load run → profile+sources → collect/normalize/dedupe → detect new →
 * Bedrock evaluate (ANALYSIS_CAP) → stale follow-up drafts (store only) →
 * trends → persist → SES daily digest → finalize metrics.
 */
export const handler: Handler = async (event, context) => {
  const health = coreHealth();
  const config = loadConfig();

  log("info", "career_agent_invoke", {
    requestId: context.awsRequestId,
    health,
    eventType: typeof event,
    env: {
      TABLE_NAME: config.tableName ? "[set]" : "[missing]",
      BEDROCK_MODEL_ID: config.bedrockModelId,
      SCHEDULE_TIMEZONE: config.scheduleTimezone,
      ANALYSIS_CAP: config.analysisCap,
      dryRun: config.dryRun,
    },
  });

  if (!config.tableName) {
    log("error", "missing_table_name", {});
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "TABLE_NAME is required" }),
    };
  }

  const repo = new DynamoRepository({
    tableName: config.tableName,
    region: config.region,
  });

  try {
    const result = await runCareerAgentPipeline(
      { config, repo },
      context.awsRequestId,
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        skipped: result.skipped,
        skipReason: result.skipReason,
        runDate: result.runDate,
        status: result.run.status,
        metrics: result.run.metrics,
      }),
    };
  } catch (err) {
    log("error", "handler_unhandled", {
      requestId: context.awsRequestId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
};
