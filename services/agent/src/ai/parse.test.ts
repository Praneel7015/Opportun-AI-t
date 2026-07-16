import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractJsonObject,
  parseDigestOutput,
  parseEvaluationOutput,
} from "./parse";

describe("AI parse", () => {
  it("parses evaluation JSON with markdown fence", () => {
    const text = `\`\`\`json
{
  "matchScore": 88,
  "reasons": ["Strong TypeScript overlap", "Remote-friendly"],
  "missingSkills": ["Kafka"],
  "recommendation": "yes",
  "interviewDifficulty": "medium",
  "companyInference": { "value": "B2B SaaS", "confidence": "low" },
  "stackInference": { "value": "Node/AWS", "confidence": "medium" },
  "summary": "Solid fit"
}
\`\`\``;
    const out = parseEvaluationOutput(text);
    assert.equal(out.matchScore, 88);
    assert.equal(out.recommendation, "yes");
    assert.equal(out.missingSkills[0], "Kafka");
  });

  it("coerces numeric confidence to low|medium|high", () => {
    const out = parseEvaluationOutput(
      JSON.stringify({
        matchScore: 70,
        reasons: ["Skill overlap"],
        missingSkills: [],
        recommendation: "maybe",
        interviewDifficulty: "medium",
        companyInference: { value: "Fintech", confidence: 0.8 },
        stackInference: { value: "Python", confidence: 40 },
      }),
    );
    assert.equal(out.companyInference?.confidence, "high");
    assert.equal(out.stackInference?.confidence, "medium");
  });

  it("rejects invalid evaluation payload", () => {
    assert.throws(() =>
      parseEvaluationOutput(
        JSON.stringify({ matchScore: 50, reasons: [], recommendation: "yes" }),
      ),
    );
  });

  it("parses digest output", () => {
    const out = parseDigestOutput(
      JSON.stringify({
        subject: "Briefing",
        summaryMarkdown: "## Hello",
        trendInsight: "More remote roles",
      }),
    );
    assert.equal(out.subject, "Briefing");
    assert.match(out.summaryMarkdown, /Hello/);
  });

  it("extractJsonObject finds embedded object", () => {
    const raw = extractJsonObject('Here you go:\n{"a":1}\nThanks');
    assert.deepEqual(raw, { a: 1 });
  });
});
