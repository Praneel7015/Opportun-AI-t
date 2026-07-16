import {
  isoYearWeek,
  type AiEvaluation,
  type NormalizedJob,
  type WeeklyTrendInsight,
} from "@opportun-ai-t/core";

/**
 * Lightweight weekly trend derivation from this run's new jobs + evaluations.
 * Merges into any existing weekly item when provided.
 */
export function deriveWeeklyTrend(input: {
  runDate: string;
  nowIso: string;
  newJobs: NormalizedJob[];
  evaluations: AiEvaluation[];
  existing?: WeeklyTrendInsight | null;
}): WeeklyTrendInsight {
  const yearWeek = isoYearWeek(new Date(`${input.runDate}T12:00:00.000Z`));
  const jobsNewTotal =
    (input.existing?.jobsNewTotal ?? 0) + input.newJobs.length;

  const scores = input.evaluations.map((e) => e.matchScore);
  const avgFromRun =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : undefined;

  const avgMatchScore =
    avgFromRun !== undefined
      ? input.existing?.avgMatchScore !== undefined
        ? Math.round((input.existing.avgMatchScore + avgFromRun) / 2)
        : Math.round(avgFromRun)
      : input.existing?.avgMatchScore;

  const companyCounts = new Map<string, number>();
  for (const c of input.existing?.topCompanies ?? []) {
    companyCounts.set(c, (companyCounts.get(c) ?? 0) + 1);
  }
  for (const job of input.newJobs) {
    companyCounts.set(job.company, (companyCounts.get(job.company) ?? 0) + 1);
  }
  const topCompanies = [...companyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const strong = input.evaluations.filter(
    (e) => e.recommendation === "strong_yes" || e.recommendation === "yes",
  ).length;

  const insight = [
    `Week ${yearWeek}: ${input.newJobs.length} new role(s) this run`,
    avgFromRun !== undefined
      ? `avg match ${Math.round(avgFromRun)}`
      : null,
    strong > 0 ? `${strong} recommended apply` : null,
    topCompanies[0] ? `most active: ${topCompanies[0]}` : null,
  ]
    .filter(Boolean)
    .join("; ");

  return {
    entityType: "REPORT",
    reportType: "WEEKLY",
    yearWeek,
    insight:
      insight ||
      input.existing?.insight ||
      "Not enough data yet for a weekly trend.",
    jobsNewTotal,
    avgMatchScore,
    topCompanies,
    createdAt: input.existing?.createdAt ?? input.nowIso,
    updatedAt: input.nowIso,
  };
}
