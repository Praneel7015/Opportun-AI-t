import type { NormalizedJob, SourceConfig } from "@opportun-ai-t/core";

export interface FetchJobsContext {
  runDate: string;
  nowIso: string;
  /** AbortSignal for overall timeout. */
  signal?: AbortSignal;
}

export interface JobSourceAdapter {
  readonly provider: SourceConfig["provider"];
  /**
   * Fetch and normalize jobs for a single configured source.
   * Implementations must apply timeout + limited retries.
   */
  fetchJobs(
    source: SourceConfig,
    ctx: FetchJobsContext,
  ): Promise<NormalizedJob[]>;
}

export interface HttpFetcher {
  fetch(url: string, init?: RequestInit): Promise<Response>;
}

export const defaultFetcher: HttpFetcher = {
  fetch: (url, init) => globalThis.fetch(url, init),
};

export async function withTimeoutRetry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: {
    timeoutMs?: number;
    retries?: number;
    baseDelayMs?: number;
    label?: string;
  } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 400;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await operation(controller.signal);
    } catch (err) {
      lastError = err;
      if (attempt >= retries) break;
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    } finally {
      clearTimeout(timer);
    }
  }

  const label = options.label ?? "request";
  throw new Error(
    `${label} failed after ${retries + 1} attempt(s): ${stringifyError(lastError)}`,
  );
}

export function stringifyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Strip HTML tags for a rough plain-text description. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
