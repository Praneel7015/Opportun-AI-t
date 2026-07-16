import type { SourceConfig } from "@opportun-ai-t/core";
import { JobSourceProvider } from "@opportun-ai-t/core";
import { GreenhouseAdapter } from "./greenhouse";
import { LeverAdapter } from "./lever";
import type {
  FetchJobsContext,
  HttpFetcher,
  JobSourceAdapter,
} from "./types";
import { defaultFetcher } from "./types";
import type { NormalizedJob } from "@opportun-ai-t/core";

export * from "./types";
export * from "./greenhouse";
export * from "./lever";

export function createAdapters(
  http: HttpFetcher = defaultFetcher,
): Record<SourceConfig["provider"], JobSourceAdapter> {
  return {
    [JobSourceProvider.GREENHOUSE]: new GreenhouseAdapter(http),
    [JobSourceProvider.LEVER]: new LeverAdapter(http),
  };
}

export async function collectJobsFromSources(
  sources: SourceConfig[],
  ctx: FetchJobsContext,
  adapters: Record<SourceConfig["provider"], JobSourceAdapter> = createAdapters(),
): Promise<{ jobs: NormalizedJob[]; errors: Array<{ source: string; error: string }> }> {
  const jobs: NormalizedJob[] = [];
  const errors: Array<{ source: string; error: string }> = [];

  for (const source of sources) {
    if (!source.enabled) continue;
    const adapter = adapters[source.provider];
    if (!adapter) {
      errors.push({
        source: `${source.provider}:${source.boardOrSlug}`,
        error: `No adapter for provider ${source.provider}`,
      });
      continue;
    }
    try {
      const batch = await adapter.fetchJobs(source, ctx);
      jobs.push(...batch);
    } catch (err) {
      errors.push({
        source: `${source.provider}:${source.boardOrSlug}`,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { jobs, errors };
}
