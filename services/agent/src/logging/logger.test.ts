import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitEmbeddedMetrics, METRICS_NAMESPACE } from "./logger";

describe("emitEmbeddedMetrics", () => {
  it("prints EMF JSON with OpportunAiT namespace and no dimensions", () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (msg?: unknown) => {
      lines.push(String(msg));
    };
    try {
      emitEmbeddedMetrics(
        {
          RunCompleted: 1,
          JobsFetched: 4,
          JobsNew: 2,
          DurationMs: 1200,
          EmailSent: 1,
        },
        { RunDate: "2026-07-16", RunStatus: "COMPLETED" },
      );
    } finally {
      console.log = original;
    }

    assert.equal(lines.length, 1);
    const payload = JSON.parse(lines[0]!) as {
      _aws: {
        CloudWatchMetrics: Array<{
          Namespace: string;
          Dimensions: string[][];
          Metrics: Array<{ Name: string; Unit: string }>;
        }>;
      };
      RunDate: string;
      JobsFetched: number;
    };
    assert.equal(payload._aws.CloudWatchMetrics[0]?.Namespace, METRICS_NAMESPACE);
    assert.deepEqual(payload._aws.CloudWatchMetrics[0]?.Dimensions, [[]]);
    assert.equal(payload.RunDate, "2026-07-16");
    assert.equal(payload.JobsFetched, 4);
    assert.ok(
      payload._aws.CloudWatchMetrics[0]?.Metrics.some(
        (m) => m.Name === "DurationMs" && m.Unit === "Milliseconds",
      ),
    );
  });
});
