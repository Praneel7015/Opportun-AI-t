import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RunStatus, type RunRecord } from "@opportun-ai-t/core";
import { decideRunClaim, STALE_RUNNING_MS } from "./idempotency";

function run(partial: Partial<RunRecord> & Pick<RunRecord, "status">): RunRecord {
  return {
    entityType: "RUN",
    runDate: "2026-07-16",
    metrics: {},
    startedAt: "2026-07-16T02:30:00.000Z",
    ...partial,
  };
}

describe("decideRunClaim (idempotency)", () => {
  const nowIso = "2026-07-16T02:35:00.000Z";

  it("claims when no prior run exists", () => {
    assert.deepEqual(decideRunClaim(null, nowIso), { action: "claim" });
  });

  it("skips completed runs so Scheduler retries are no-ops", () => {
    const decision = decideRunClaim(
      run({ status: RunStatus.COMPLETED, emailSentAt: nowIso }),
      nowIso,
    );
    assert.equal(decision.action, "skip");
    if (decision.action === "skip") {
      assert.equal(decision.skipReason, "run_already_completed");
    }
  });

  it("skips when email already sent even if status is not COMPLETED", () => {
    const decision = decideRunClaim(
      run({ status: RunStatus.RUNNING, emailSentAt: nowIso }),
      nowIso,
    );
    assert.equal(decision.action, "skip");
    if (decision.action === "skip") {
      assert.equal(decision.skipReason, "run_already_completed");
    }
  });

  it("skips a fresh RUNNING claim", () => {
    const decision = decideRunClaim(
      run({
        status: RunStatus.RUNNING,
        startedAt: "2026-07-16T02:30:00.000Z",
      }),
      nowIso,
    );
    assert.equal(decision.action, "skip");
    if (decision.action === "skip") {
      assert.equal(decision.skipReason, "run_already_running");
    }
  });

  it("reclaims a stale RUNNING claim after the timeout", () => {
    const startedAt = new Date(
      Date.parse(nowIso) - STALE_RUNNING_MS - 1000,
    ).toISOString();
    const decision = decideRunClaim(
      run({ status: RunStatus.RUNNING, startedAt }),
      nowIso,
    );
    assert.deepEqual(decision, { action: "claim" });
  });

  it("reclaims FAILED runs for retry", () => {
    assert.deepEqual(
      decideRunClaim(run({ status: RunStatus.FAILED }), nowIso),
      { action: "claim" },
    );
  });
});
