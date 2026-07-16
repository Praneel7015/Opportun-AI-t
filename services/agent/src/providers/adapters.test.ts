import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  JobSourceProvider,
  SourceConfigSchema,
} from "@opportun-ai-t/core";
import { GreenhouseAdapter } from "./greenhouse";
import { LeverAdapter } from "./lever";
import type { HttpFetcher } from "./types";

const fixturesDir = path.join(__dirname, "fixtures");

function jsonFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(path.join(fixturesDir, name), "utf8"),
  ) as unknown;
}

function mockFetcher(body: unknown, status = 200): HttpFetcher {
  return {
    fetch: async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  };
}

const baseSource = {
  entityType: "SOURCE" as const,
  userId: "default",
  enabled: true,
  createdAt: "2026-07-16T00:00:00.000Z",
  updatedAt: "2026-07-16T00:00:00.000Z",
};

describe("GreenhouseAdapter", () => {
  it("normalizes fixture board jobs", async () => {
    const payload = jsonFixture("greenhouse-board.json");
    const adapter = new GreenhouseAdapter(mockFetcher(payload));
    const source = SourceConfigSchema.parse({
      ...baseSource,
      provider: JobSourceProvider.GREENHOUSE,
      boardOrSlug: "acme",
      displayName: "Acme Corp",
    });
    const jobs = await adapter.fetchJobs(source, {
      runDate: "2026-07-16",
      nowIso: "2026-07-16T12:00:00.000Z",
    });
    assert.equal(jobs.length, 2);
    assert.equal(jobs[0]?.provider, "greenhouse");
    assert.equal(jobs[0]?.title, "Senior Software Engineer");
    assert.ok(jobs[0]?.fingerprint.length === 32);
    assert.match(jobs[0]?.descriptionText ?? "", /TypeScript/);
  });
});

describe("LeverAdapter", () => {
  it("normalizes fixture postings", async () => {
    const payload = jsonFixture("lever-postings.json");
    const adapter = new LeverAdapter(mockFetcher(payload));
    const source = SourceConfigSchema.parse({
      ...baseSource,
      provider: JobSourceProvider.LEVER,
      boardOrSlug: "globex",
      displayName: "Globex",
    });
    const jobs = await adapter.fetchJobs(source, {
      runDate: "2026-07-16",
      nowIso: "2026-07-16T12:00:00.000Z",
    });
    assert.equal(jobs.length, 2);
    assert.equal(jobs[0]?.provider, "lever");
    assert.equal(jobs[0]?.title, "Backend Engineer");
    assert.equal(jobs[0]?.company, "Globex");
  });
});
