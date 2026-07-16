import { createHash } from "crypto";
import { JobSourceProvider } from "./constants";

/** Inputs used to compute a deterministic job fingerprint. */
export interface JobFingerprintInput {
  provider: JobSourceProvider | string;
  /** Board token (Greenhouse) or company slug (Lever). */
  boardOrSlug: string;
  /**
   * Provider-native posting id when available (preferred for stability).
   * Greenhouse: numeric id; Lever: posting id/slug.
   */
  externalId?: string | null;
  company: string;
  title: string;
  location?: string | null;
  /** Absolute apply URL — used as fallback when externalId is missing. */
  absoluteUrl?: string | null;
}

function normalizePart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Deterministic fingerprint for cross-run deduplication.
 * Prefer provider + board + externalId; otherwise fall back to
 * provider + board + company + title + location (+ url when present).
 */
export function computeJobFingerprint(input: JobFingerprintInput): string {
  const provider = normalizePart(String(input.provider));
  const board = normalizePart(input.boardOrSlug);
  const externalId = input.externalId?.trim();

  let raw: string;
  if (externalId) {
    raw = `${provider}|${board}|id:${normalizePart(externalId)}`;
  } else {
    const parts = [
      provider,
      board,
      normalizePart(input.company),
      normalizePart(input.title),
      normalizePart(input.location ?? ""),
    ];
    const url = input.absoluteUrl?.trim();
    if (url) {
      parts.push(normalizePart(url));
    }
    raw = parts.join("|");
  }

  return createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 32);
}
