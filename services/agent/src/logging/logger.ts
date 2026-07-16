export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  [key: string]: unknown;
}

/** Matches IAM condition cloudwatch:namespace = OpportunAiT and CDK dashboard widgets. */
export const METRICS_NAMESPACE = "OpportunAiT";

export function log(
  level: LogLevel,
  message: string,
  fields: LogFields = {},
): void {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export type AgentMetricValues = {
  JobsFetched?: number;
  JobsNew?: number;
  JobsDeduped?: number;
  JobsAnalyzed?: number;
  BedrockErrors?: number;
  FollowUpsCreated?: number;
  EmailSent?: number;
  DurationMs?: number;
  RunSkipped?: number;
  RunFailed?: number;
  RunCompleted?: number;
};

/**
 * CloudWatch Embedded Metric Format (EMF) for the OpportunAiT namespace.
 *
 * Metrics are emitted without CloudWatch dimensions so dashboard Sum aggregates
 * work without SEARCH expressions. `context` fields (e.g. RunDate) stay in the
 * JSON line for Logs Insights correlation.
 */
export function emitEmbeddedMetrics(
  metrics: AgentMetricValues,
  context: { RunDate?: string; RunStatus?: string } = {},
): void {
  const metricDefinitions = Object.keys(metrics).map((name) => ({
    Name: name,
    Unit: name === "DurationMs" ? "Milliseconds" : "Count",
  }));

  if (metricDefinitions.length === 0) return;

  const emf = {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: METRICS_NAMESPACE,
          Dimensions: [[] as string[]],
          Metrics: metricDefinitions,
        },
      ],
    },
    ...context,
    ...metrics,
  };

  console.log(JSON.stringify(emf));
}
