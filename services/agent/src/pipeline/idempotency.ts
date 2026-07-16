import { RunStatus, type RunRecord } from "@opportun-ai-t/core";

/** Default window before a stuck RUNNING run may be reclaimed. */
export const STALE_RUNNING_MS = 10 * 60 * 1000;

export type ClaimDecision =
  | { action: "claim" }
  | { action: "skip"; skipReason: string };

/**
 * Pure idempotency decision for Scheduler retries / overlapping invokes.
 * - COMPLETED (or email already sent) → skip
 * - fresh RUNNING → skip
 * - FAILED or stale RUNNING → reclaim
 * - absent → claim
 */
export function decideRunClaim(
  existing: RunRecord | null | undefined,
  nowIso: string,
  staleRunningMs: number = STALE_RUNNING_MS,
): ClaimDecision {
  if (!existing) {
    return { action: "claim" };
  }

  if (
    existing.status === RunStatus.COMPLETED ||
    Boolean(existing.emailSentAt)
  ) {
    return { action: "skip", skipReason: "run_already_completed" };
  }

  if (existing.status === RunStatus.RUNNING) {
    const startedMs = existing.startedAt
      ? Date.parse(existing.startedAt)
      : NaN;
    const ageMs = Number.isNaN(startedMs)
      ? 0
      : Date.parse(nowIso) - startedMs;
    if (ageMs < staleRunningMs) {
      return { action: "skip", skipReason: "run_already_running" };
    }
  }

  return { action: "claim" };
}
