import {
  BedrockEvaluationOutputSchema,
  type BedrockEvaluationOutput,
} from "@opportun-ai-t/core";

/**
 * Extract JSON object from model text (handles optional markdown fences).
 */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1]!.trim() : trimmed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output");
  }

  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

/** Nova sometimes returns confidence as 0–1 or 0–100; coerce to enum. */
function coerceConfidence(value: unknown): "low" | "medium" | "high" {
  if (value === "low" || value === "medium" || value === "high") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = value > 1 ? value / 100 : value;
    if (n >= 0.67) return "high";
    if (n >= 0.34) return "medium";
    return "low";
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return coerceConfidence(n);
  }
  return "low";
}

function normalizeEvaluationPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  for (const key of ["companyInference", "stackInference"] as const) {
    const inf = obj[key];
    if (inf && typeof inf === "object") {
      const copy = { ...(inf as Record<string, unknown>) };
      copy.confidence = coerceConfidence(copy.confidence);
      obj[key] = copy;
    }
  }
  return obj;
}

export function parseEvaluationOutput(
  text: string,
): BedrockEvaluationOutput {
  const raw = normalizeEvaluationPayload(extractJsonObject(text));
  return BedrockEvaluationOutputSchema.parse(raw);
}

export interface DigestAiOutput {
  subject: string;
  summaryMarkdown: string;
  trendInsight?: string;
}

export function parseDigestOutput(text: string): DigestAiOutput {
  const raw = extractJsonObject(text) as Record<string, unknown>;
  const subject =
    typeof raw.subject === "string" && raw.subject.trim()
      ? raw.subject.trim()
      : "Your daily career briefing";
  const summaryMarkdown =
    typeof raw.summaryMarkdown === "string" && raw.summaryMarkdown.trim()
      ? raw.summaryMarkdown.trim()
      : typeof raw.summary === "string"
        ? raw.summary.trim()
        : "";
  if (!summaryMarkdown) {
    throw new Error("Digest output missing summaryMarkdown");
  }
  const trendInsight =
    typeof raw.trendInsight === "string" ? raw.trendInsight.trim() : undefined;
  return { subject, summaryMarkdown, trendInsight };
}

export function parseFollowUpOutput(text: string): {
  reminder: string;
  suggestedAction: string;
  draftEmail: string;
} {
  const raw = extractJsonObject(text) as Record<string, unknown>;
  const reminder = String(raw.reminder ?? "").trim();
  const suggestedAction = String(raw.suggestedAction ?? "").trim();
  const draftEmail = String(raw.draftEmail ?? "").trim();
  if (!reminder || !suggestedAction || !draftEmail) {
    throw new Error("Follow-up output missing required fields");
  }
  return { reminder, suggestedAction, draftEmail };
}
