import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  JobSourceProvider,
  RunStatus,
  SourceConfigSchema,
} from "@opportun-ai-t/core";
import type { AgentConfig } from "../config";
import { InMemoryRepository } from "../db";
import { GreenhouseAdapter } from "../providers/greenhouse";
import { LeverAdapter } from "../providers/lever";
import type { HttpFetcher } from "../providers/types";
import { runCareerAgentPipeline } from "./orchestrator";

const fixturesDir = path.join(__dirname, "../providers/fixtures");

function jsonFixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}

function mockFetcher(body: unknown): HttpFetcher {
  return {
    fetch: async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  };
}

function baseConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    tableName: "local-memory",
    region: "ap-south-1",
    bedrockModelId: "apac.amazon.nova-lite-v1:0",
    sesFromEmail: "test@example.com",
    sesToEmail: "test@example.com",
    scheduleTimezone: "Asia/Kolkata",
    analysisCap: 5,
    userId: "default",
    dryRun: true,
    ...overrides,
  };
}

function installFixtureFetch(): () => void {
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
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

describe("runCareerAgentPipeline (dry-run / fixtures)", () => {
  it("completes a dry run with fixture boards and skips on second invoke", async () => {
    const restoreFetch = installFixtureFetch();
    const repo = new InMemoryRepository();
    const nowIso = "2026-07-16T02:30:00.000Z";
    repo.sources = [
      SourceConfigSchema.parse({
        entityType: "SOURCE",
        userId: "default",
        provider: JobSourceProvider.GREENHOUSE,
        boardOrSlug: "acme",
        displayName: "Acme",
        enabled: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
      SourceConfigSchema.parse({
        entityType: "SOURCE",
        userId: "default",
        provider: JobSourceProvider.LEVER,
        boardOrSlug: "globex",
        displayName: "Globex",
        enabled: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
    ];

    try {
      const first = await runCareerAgentPipeline({
        config: baseConfig(),
        repo,
        now: () => new Date(nowIso),
      });

      assert.equal(first.skipped, false);
      assert.equal(first.run.status, RunStatus.COMPLETED);
      assert.ok(first.run.metrics.jobsFetched >= 3);
      assert.ok(first.run.metrics.jobsNew >= 1);
      assert.ok(first.run.metrics.jobsAnalyzed >= 1);
      assert.equal(first.run.metrics.emailSent, true);
      assert.ok(repo.dailyReports.has(first.runDate));

      const second = await runCareerAgentPipeline({
        config: baseConfig(),
        repo,
        now: () => new Date(nowIso),
      });
      assert.equal(second.skipped, true);
      assert.equal(second.skipReason, "run_already_completed");
    } finally {
      restoreFetch();
    }
  });

  it("adapter fixtures normalize independently for dry-run demos", async () => {
    const gh = new GreenhouseAdapter(
      mockFetcher(jsonFixture("greenhouse-board.json")),
    );
    const lv = new LeverAdapter(mockFetcher(jsonFixture("lever-postings.json")));
    const ctx = { runDate: "2026-07-16", nowIso: "2026-07-16T02:30:00.000Z" };
    const sourceGh = SourceConfigSchema.parse({
      entityType: "SOURCE",
      userId: "default",
      provider: JobSourceProvider.GREENHOUSE,
      boardOrSlug: "acme",
      displayName: "Acme",
      enabled: true,
      createdAt: ctx.nowIso,
      updatedAt: ctx.nowIso,
    });
    const sourceLv = SourceConfigSchema.parse({
      entityType: "SOURCE",
      userId: "default",
      provider: JobSourceProvider.LEVER,
      boardOrSlug: "globex",
      displayName: "Globex",
      enabled: true,
      createdAt: ctx.nowIso,
      updatedAt: ctx.nowIso,
    });
    const jobs = [
      ...(await gh.fetchJobs(sourceGh, ctx)),
      ...(await lv.fetchJobs(sourceLv, ctx)),
    ];
    assert.equal(jobs.length, 4);
  });
});
