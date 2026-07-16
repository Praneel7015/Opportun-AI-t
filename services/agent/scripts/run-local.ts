/**
 * Local dry-run of the career agent against fixture boards (no Bedrock / SES / DynamoDB).
 *
 * Usage (from repo root):
 *   npm run agent:dry-run
 *
 * Or:
 *   npm run dry-run -w @opportun-ai-t/agent
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { JobSourceProvider, SourceConfigSchema } from "@opportun-ai-t/core";
import { loadConfig } from "../src/config";
import { InMemoryRepository } from "../src/db";
import { log } from "../src/logging";
import { runCareerAgentPipeline } from "../src/pipeline";

const fixturesDir = path.join(
  __dirname,
  "../src/providers/fixtures",
);

function jsonFixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}

async function main(): Promise<void> {
  const greenhouse = jsonFixture("greenhouse-board.json");
  const lever = jsonFixture("lever-postings.json");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("greenhouse")) {
      return new Response(JSON.stringify(greenhouse), { status: 200 });
    }
    if (url.includes("lever")) {
      return new Response(JSON.stringify(lever), { status: 200 });
    }
    return new Response(JSON.stringify({ error: "not mocked" }), {
      status: 404,
    });
  }) as typeof fetch;

  const now = new Date();
  const nowIso = now.toISOString();
  const repo = new InMemoryRepository();
  repo.sources = [
    SourceConfigSchema.parse({
      entityType: "SOURCE",
      userId: "default",
      provider: JobSourceProvider.GREENHOUSE,
      boardOrSlug: "acme",
      displayName: "Acme (fixture)",
      enabled: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
    SourceConfigSchema.parse({
      entityType: "SOURCE",
      userId: "default",
      provider: JobSourceProvider.LEVER,
      boardOrSlug: "globex",
      displayName: "Globex (fixture)",
      enabled: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
  ];

  const config = {
    ...loadConfig({
      ...process.env,
      AGENT_DRY_RUN: "true",
      TABLE_NAME: "local-memory",
      AWS_REGION: process.env.AWS_REGION ?? "ap-south-1",
      SCHEDULE_TIMEZONE: process.env.SCHEDULE_TIMEZONE ?? "Asia/Kolkata",
      BEDROCK_MODEL_ID:
        process.env.BEDROCK_MODEL_ID ?? "apac.amazon.nova-lite-v1:0",
    }),
    dryRun: true,
  };

  try {
    log("info", "local_dry_run_start", {
      timezone: config.scheduleTimezone,
      analysisCap: config.analysisCap,
    });

    const result = await runCareerAgentPipeline(
      { config, repo, now: () => now },
      "local-dry-run",
    );

    const report = repo.dailyReports.get(result.runDate);
    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: result.skipped,
          skipReason: result.skipReason,
          runDate: result.runDate,
          status: result.run.status,
          metrics: result.run.metrics,
          subject: report?.subject,
          topMatches: report?.topMatches,
          jobsStored: repo.jobs.size,
          evaluations: repo.evaluations.length,
        },
        null,
        2,
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
