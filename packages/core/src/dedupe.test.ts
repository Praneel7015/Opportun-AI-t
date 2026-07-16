import { createHash } from "crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFollowUpDraftContent,
  computeJobFingerprint,
  dedupeJobsWithinRun,
  detectNewJobs,
  findStaleApplications,
  JobSourceProvider,
  selectJobsForAnalysis,
  type NormalizedJob,
} from "../src/index";

function job(partial: Partial<NormalizedJob> & Pick<NormalizedJob, "fingerprint" | "title">): NormalizedJob {
  return {
    entityType: "JOB",
    provider: JobSourceProvider.GREENHOUSE,
    boardOrSlug: "acme",
    company: "Acme",
    absoluteUrl: "https://boards.greenhouse.io/acme/jobs/1",
    discoveredAt: "2026-07-16T12:00:00.000Z",
    firstSeenRunDate: "2026-07-16",
    lastSeenRunDate: "2026-07-16",
    departments: [],
    ...partial,
  };
}

describe("computeJobFingerprint", () => {
  it("is stable for the same external id", () => {
    const a = computeJobFingerprint({
      provider: "greenhouse",
      boardOrSlug: "Acme",
      externalId: "12345",
      company: "Acme",
      title: "Engineer",
    });
    const b = computeJobFingerprint({
      provider: "greenhouse",
      boardOrSlug: "acme",
      externalId: "12345",
      company: "Other Name",
      title: "Different",
    });
    assert.equal(a, b);
    assert.equal(a.length, 32);
  });

  it("changes when title changes without external id", () => {
    const a = computeJobFingerprint({
      provider: "lever",
      boardOrSlug: "acme",
      company: "Acme",
      title: "Engineer",
      location: "Remote",
    });
    const b = computeJobFingerprint({
      provider: "lever",
      boardOrSlug: "acme",
      company: "Acme",
      title: "Senior Engineer",
      location: "Remote",
    });
    assert.notEqual(a, b);
  });
});

describe("dedupeJobsWithinRun", () => {
  it("keeps first and counts duplicates", () => {
    const fp = createHash("sha256").update("x").digest("hex").slice(0, 32);
    const { unique, dedupedCount } = dedupeJobsWithinRun([
      job({ fingerprint: fp, title: "A" }),
      job({ fingerprint: fp, title: "A duplicate" }),
      job({ fingerprint: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", title: "B" }),
    ]);
    assert.equal(unique.length, 2);
    assert.equal(dedupedCount, 1);
    assert.equal(unique[0]?.title, "A");
  });
});

describe("detectNewJobs", () => {
  it("filters known fingerprints", () => {
    const prior = new Set(["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]);
    const { newJobs, alreadyKnownCount } = detectNewJobs(
      [
        job({ fingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", title: "Old" }),
        job({ fingerprint: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", title: "New" }),
      ],
      prior,
    );
    assert.equal(newJobs.length, 1);
    assert.equal(newJobs[0]?.title, "New");
    assert.equal(alreadyKnownCount, 1);
  });
});

describe("selectJobsForAnalysis", () => {
  it("respects analysis cap preferring longer descriptions", () => {
    const selected = selectJobsForAnalysis(
      [
        job({
          fingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          title: "Short",
          descriptionText: "x",
        }),
        job({
          fingerprint: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          title: "Long",
          descriptionText: "x".repeat(500),
        }),
        job({
          fingerprint: "cccccccccccccccccccccccccccccccc",
          title: "Mid",
          descriptionText: "x".repeat(50),
        }),
      ],
      2,
    );
    assert.equal(selected.length, 2);
    assert.equal(selected[0]?.title, "Long");
  });
});

describe("findStaleApplications / follow-up draft", () => {
  it("flags non-terminal stale apps and builds review-only draft", () => {
    const now = new Date("2026-07-16T12:00:00.000Z");
    const stale = findStaleApplications(
      [
        {
          fingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          status: "Applied",
          company: "Acme",
          title: "Engineer",
          lastStatusAt: "2026-07-01T12:00:00.000Z",
        },
        {
          fingerprint: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          status: "Rejected",
          company: "Beta",
          title: "PM",
          lastStatusAt: "2026-06-01T12:00:00.000Z",
        },
        {
          fingerprint: "cccccccccccccccccccccccccccccccc",
          status: "Saved",
          company: "Gamma",
          title: "SWE",
          lastStatusAt: "2026-06-01T12:00:00.000Z",
        },
      ],
      7,
      now,
    );
    assert.equal(stale.length, 1);
    assert.equal(stale[0]?.company, "Acme");
    assert.ok(stale[0]!.staleDays >= 7);

    const draft = buildFollowUpDraftContent({
      company: "Acme",
      title: "Engineer",
      status: "Applied",
      staleDays: 15,
    });
    assert.match(draft.reminder, /Acme/);
    assert.match(draft.draftEmail, /Following up/);
    assert.match(draft.suggestedAction, /follow-up/i);
  });
});
