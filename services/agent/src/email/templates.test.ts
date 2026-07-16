import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DailyReportSchema } from "@opportun-ai-t/core";
import { renderDigestHtml, renderDigestText } from "./templates";

const report = DailyReportSchema.parse({
  entityType: "REPORT",
  reportType: "DAILY",
  runDate: "2026-07-16",
  subject: "Opportun-AI-t briefing — 2026-07-16",
  summaryMarkdown: "## Daily briefing\n\n- Jobs fetched: **4**\n- New: **2**",
  topMatches: [
    {
      fingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      company: "Acme <Corp>",
      title: "Senior Engineer",
      matchScore: 88,
      recommendation: "yes",
    },
  ],
  followUpCount: 1,
  trendInsight: "More remote backend roles this week",
  createdAt: "2026-07-16T02:35:00.000Z",
});

describe("digest rendering", () => {
  it("renders plain-text digest with top matches and review-only follow-ups", () => {
    const text = renderDigestText({ report });
    assert.match(text, /Opportun-AI-t briefing/);
    assert.match(text, /Jobs fetched:\s*4/);
    assert.match(text, /\[88\] Acme <Corp> — Senior Engineer/);
    assert.match(text, /Follow-up drafts ready for review: 1/);
    assert.match(text, /not auto-sent/i);
    assert.match(text, /Trend: More remote backend/);
  });

  it("escapes HTML and marks follow-ups as not auto-sent", () => {
    const html = renderDigestHtml({ report });
    assert.match(html, /Acme &lt;Corp&gt;/);
    assert.doesNotMatch(html, /Acme <Corp>/);
    assert.match(html, /follow-up draft\(s\) stored/i);
    assert.match(html, /nothing was auto-sent/i);
    assert.match(html, /score 88/);
  });
});
