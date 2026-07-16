import {
  computeJobFingerprint,
  JobSourceProvider,
  NormalizedJobSchema,
  type NormalizedJob,
  type SourceConfig,
} from "@opportun-ai-t/core";
import {
  defaultFetcher,
  stripHtml,
  withTimeoutRetry,
  type FetchJobsContext,
  type HttpFetcher,
  type JobSourceAdapter,
} from "./types";

/**
 * Greenhouse public Job Board API:
 * GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
 */
export class GreenhouseAdapter implements JobSourceAdapter {
  readonly provider = JobSourceProvider.GREENHOUSE;

  constructor(private readonly http: HttpFetcher = defaultFetcher) {}

  async fetchJobs(
    source: SourceConfig,
    ctx: FetchJobsContext,
  ): Promise<NormalizedJob[]> {
    if (source.provider !== JobSourceProvider.GREENHOUSE) {
      throw new Error(`GreenhouseAdapter received provider ${source.provider}`);
    }

    const token = source.boardOrSlug;
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;

    const payload = await withTimeoutRetry(
      async (signal) => {
        const res = await this.http.fetch(url, {
          signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          throw new Error(`Greenhouse HTTP ${res.status} for board ${token}`);
        }
        return (await res.json()) as GreenhouseBoardResponse;
      },
      { label: `greenhouse:${token}` },
    );

    const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
    return jobs
      .map((raw) => this.normalize(raw, source, ctx))
      .filter((j): j is NormalizedJob => j !== null);
  }

  normalize(
    raw: GreenhouseJob,
    source: SourceConfig,
    ctx: FetchJobsContext,
  ): NormalizedJob | null {
    const externalId = raw.id != null ? String(raw.id) : undefined;
    const title = raw.title?.trim();
    const absoluteUrl = raw.absolute_url?.trim();
    if (!title || !absoluteUrl) return null;

    const company =
      raw.company_name?.trim() ||
      source.displayName?.trim() ||
      source.boardOrSlug;
    const location =
      raw.location?.name?.trim() ||
      raw.offices?.map((o) => o.name).filter(Boolean).join(", ") ||
      undefined;

    const fingerprint = computeJobFingerprint({
      provider: JobSourceProvider.GREENHOUSE,
      boardOrSlug: source.boardOrSlug,
      externalId,
      company,
      title,
      location,
      absoluteUrl,
    });

    const descriptionText = raw.content
      ? stripHtml(raw.content).slice(0, 12_000)
      : undefined;

    const departments =
      raw.departments?.map((d) => d.name).filter(Boolean) ?? [];

    return NormalizedJobSchema.parse({
      entityType: "JOB",
      fingerprint,
      provider: JobSourceProvider.GREENHOUSE,
      boardOrSlug: source.boardOrSlug,
      externalId,
      company,
      title,
      location,
      absoluteUrl,
      descriptionText,
      departments,
      employmentType: undefined,
      postedAt: raw.updated_at ?? raw.first_published ?? undefined,
      discoveredAt: ctx.nowIso,
      firstSeenRunDate: ctx.runDate,
      lastSeenRunDate: ctx.runDate,
      rawSnippet: descriptionText?.slice(0, 280),
    });
  }
}

export interface GreenhouseBoardResponse {
  jobs?: GreenhouseJob[];
}

export interface GreenhouseJob {
  id?: number | string;
  title?: string;
  absolute_url?: string;
  company_name?: string;
  content?: string;
  updated_at?: string;
  first_published?: string;
  location?: { name?: string };
  offices?: Array<{ name?: string }>;
  departments?: Array<{ name?: string }>;
}
