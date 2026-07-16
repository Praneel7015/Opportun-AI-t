import {
  computeJobFingerprint,
  JobSourceProvider,
  NormalizedJobSchema,
  normalizeJobDescription,
  type NormalizedJob,
  type SourceConfig,
} from "@opportun-ai-t/core";
import {
  defaultFetcher,
  withTimeoutRetry,
  type FetchJobsContext,
  type HttpFetcher,
  type JobSourceAdapter,
} from "./types";

/**
 * Lever public postings API:
 * GET https://api.lever.co/v0/postings/{company}?mode=json
 */
export class LeverAdapter implements JobSourceAdapter {
  readonly provider = JobSourceProvider.LEVER;

  constructor(private readonly http: HttpFetcher = defaultFetcher) {}

  async fetchJobs(
    source: SourceConfig,
    ctx: FetchJobsContext,
  ): Promise<NormalizedJob[]> {
    if (source.provider !== JobSourceProvider.LEVER) {
      throw new Error(`LeverAdapter received provider ${source.provider}`);
    }

    const slug = source.boardOrSlug;
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;

    const payload = await withTimeoutRetry(
      async (signal) => {
        const res = await this.http.fetch(url, {
          signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          throw new Error(`Lever HTTP ${res.status} for company ${slug}`);
        }
        return (await res.json()) as LeverPosting[];
      },
      { label: `lever:${slug}` },
    );

    const postings = Array.isArray(payload) ? payload : [];
    return postings
      .map((raw) => this.normalize(raw, source, ctx))
      .filter((j): j is NormalizedJob => j !== null);
  }

  normalize(
    raw: LeverPosting,
    source: SourceConfig,
    ctx: FetchJobsContext,
  ): NormalizedJob | null {
    const externalId = raw.id?.trim() || raw.id?.toString();
    const title = raw.text?.trim();
    const absoluteUrl = raw.hostedUrl?.trim() || raw.applyUrl?.trim();
    if (!title || !absoluteUrl) return null;

    const company =
      source.displayName?.trim() || source.boardOrSlug;
    const location =
      raw.categories?.location?.trim() ||
      raw.categories?.allLocations?.filter(Boolean).join(", ") ||
      undefined;

    const fingerprint = computeJobFingerprint({
      provider: JobSourceProvider.LEVER,
      boardOrSlug: source.boardOrSlug,
      externalId,
      company,
      title,
      location,
      absoluteUrl,
    });

    const description =
      raw.descriptionPlain ||
      raw.description ||
      (raw.lists
        ?.map((l) => `${l.text ?? ""}\n${l.content ?? ""}`)
        .join("\n") ?? undefined);

    const descriptionText = description
      ? normalizeJobDescription(description).slice(0, 12_000)
      : undefined;

    const departments = [
      raw.categories?.team,
      raw.categories?.department,
    ].filter((x): x is string => Boolean(x));

    const postedAt =
      typeof raw.createdAt === "number"
        ? new Date(raw.createdAt).toISOString()
        : undefined;

    return NormalizedJobSchema.parse({
      entityType: "JOB",
      fingerprint,
      provider: JobSourceProvider.LEVER,
      boardOrSlug: source.boardOrSlug,
      externalId,
      company,
      title,
      location,
      absoluteUrl,
      descriptionText,
      departments,
      employmentType: raw.categories?.commitment,
      postedAt,
      discoveredAt: ctx.nowIso,
      firstSeenRunDate: ctx.runDate,
      lastSeenRunDate: ctx.runDate,
      rawSnippet: descriptionText?.slice(0, 280),
    });
  }
}

export interface LeverPosting {
  id?: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  description?: string;
  descriptionPlain?: string;
  categories?: {
    location?: string;
    allLocations?: string[];
    team?: string;
    department?: string;
    commitment?: string;
  };
  lists?: Array<{ text?: string; content?: string }>;
}
