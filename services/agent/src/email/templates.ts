import type { AiEvaluation, DailyReport, NormalizedJob } from "@opportun-ai-t/core";

export interface DigestRenderInput {
  report: DailyReport;
  evaluations?: AiEvaluation[];
  jobsByFingerprint?: Map<string, NormalizedJob>;
}

export function renderDigestText(input: DigestRenderInput): string {
  const { report } = input;
  const lines: string[] = [
    report.subject,
    "",
    stripMd(report.summaryMarkdown),
    "",
  ];

  if (report.topMatches.length) {
    lines.push("Top matches:");
    for (const m of report.topMatches) {
      lines.push(
        `- [${m.matchScore}] ${m.company} — ${m.title} (${m.recommendation})`,
      );
    }
    lines.push("");
  }

  if (report.followUpCount > 0) {
    lines.push(
      `Follow-up drafts ready for review: ${report.followUpCount} (not auto-sent).`,
    );
    lines.push("");
  }

  if (report.trendInsight) {
    lines.push(`Trend: ${report.trendInsight}`);
    lines.push("");
  }

  lines.push("— Opportun-AI-t career agent");
  return lines.join("\n");
}

export function renderDigestHtml(input: DigestRenderInput): string {
  const { report } = input;
  const matches = report.topMatches
    .map(
      (m) =>
        `<li><strong>${escapeHtml(m.company)}</strong> — ${escapeHtml(m.title)} ` +
        `(score ${m.matchScore}, ${escapeHtml(m.recommendation)})</li>`,
    )
    .join("");

  const followUp =
    report.followUpCount > 0
      ? `<p><em>${report.followUpCount} follow-up draft(s) stored for your review — nothing was auto-sent.</em></p>`
      : "";

  const trend = report.trendInsight
    ? `<p><strong>Trend:</strong> ${escapeHtml(report.trendInsight)}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(report.subject)}</title></head>
<body style="font-family:Segoe UI,Helvetica,Arial,sans-serif;line-height:1.5;color:#111;max-width:640px;margin:0 auto;padding:24px;">
  <h1 style="font-size:1.25rem;">${escapeHtml(report.subject)}</h1>
  <div>${markdownLiteToHtml(report.summaryMarkdown)}</div>
  ${matches ? `<h2 style="font-size:1rem;">Top matches</h2><ul>${matches}</ul>` : ""}
  ${followUp}
  ${trend}
  <p style="color:#666;font-size:0.85rem;margin-top:2rem;">Opportun-AI-t · autonomous daily briefing</p>
</body>
</html>`;
}

function stripMd(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function markdownLiteToHtml(md: string): string {
  const escaped = escapeHtml(md);
  const withBreaks = escaped
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  return `<p>${withBreaks}</p>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
