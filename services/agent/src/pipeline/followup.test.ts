import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFollowUpDraftContent,
  findStaleApplications,
} from "@opportun-ai-t/core";

describe("stale follow-up policy", () => {
  it("creates review-only drafts for stale non-terminal apps", () => {
    const now = new Date("2026-07-16T12:00:00.000Z");
    const stale = findStaleApplications(
      [
        {
          fingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          status: "Interview",
          company: "Acme",
          title: "SWE",
          lastStatusAt: "2026-06-20T12:00:00.000Z",
          absoluteUrl: "https://example.com/jobs/1",
        },
      ],
      7,
      now,
    );
    assert.equal(stale.length, 1);
    const draft = buildFollowUpDraftContent(stale[0]!);
    assert.match(draft.draftEmail, /Following up/);
    assert.match(draft.suggestedAction, /next steps/i);
  });
});
