import Link from "next/link";
import { RunStatus } from "@opportun-ai-t/core";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataModeBadge, ScorePill } from "@/components/shared/meta";
import {
  getDataMode,
  getLatestDailyReport,
  getLatestRun,
  listFollowUps,
  listOpportunities,
} from "@/lib/db/repositories";

export const dynamic = "force-dynamic";

function formatWhen(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const [mode, briefing, run, followUps, opportunities] = await Promise.all([
    Promise.resolve(getDataMode()),
    getLatestDailyReport(),
    getLatestRun(),
    listFollowUps(10),
    listOpportunities({ minScore: 70 }),
  ]);

  const topMatches = opportunities.slice(0, 4);
  const trendCards = [
    {
      label: "Top match score",
      value: topMatches[0]?.evaluation
        ? String(topMatches[0].evaluation.matchScore)
        : "—",
      delta: topMatches[0]
        ? `${topMatches[0].job.company} · ${topMatches[0].job.title}`
        : undefined,
      tone: "up" as const,
    },
    {
      label: "Open follow-ups",
      value: String(followUps.length),
      delta: followUps.length ? "Needs review" : "Clear",
      tone: followUps.length ? ("down" as const) : ("neutral" as const),
    },
    {
      label: "New jobs (last run)",
      value: run ? String(run.metrics.jobsNew) : "—",
      delta: run ? `Analyzed ${run.metrics.jobsAnalyzed}` : undefined,
      tone: "neutral" as const,
    },
    {
      label: "Briefing follow-ups",
      value: briefing ? String(briefing.followUpCount) : "—",
      delta: briefing?.trendInsight?.slice(0, 48),
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Control center
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Latest autonomous work at a glance
          </p>
        </div>
        <DataModeBadge mode={mode} />
      </div>

      <div className="animate-fade-up-delay grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Latest briefing</CardTitle>
            <CardDescription>
              {briefing
                ? `${briefing.subject} · ${formatWhen(briefing.createdAt)}`
                : "No briefing yet — seed demo data or wait for the first scheduled run"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]/90">
              {briefing?.summaryMarkdown ??
                "When the career agent finishes a run, the SES digest summary appears here."}
            </p>
            {briefing?.topMatches?.length ? (
              <ul className="space-y-1.5 text-sm text-[var(--muted)]">
                {briefing.topMatches.map((m) => (
                  <li key={m.fingerprint} className="flex gap-2">
                    <span className="text-[var(--accent)]">▸</span>
                    <span>
                      {m.company} — {m.title} ({m.matchScore})
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {briefing ? (
              <Link
                href={`/reports/${briefing.runDate}`}
                className="inline-block text-sm text-[var(--accent)] hover:underline"
              >
                Open full report →
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span
                className="signal-dot inline-block h-2 w-2 rounded-full bg-[var(--accent)]"
                aria-hidden
              />
              Recent run
            </CardTitle>
            <CardDescription>Read-only status from the agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {run ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Status</span>
                  <Badge
                    variant={
                      run.status === RunStatus.COMPLETED
                        ? "success"
                        : run.status === RunStatus.FAILED
                          ? "danger"
                          : "warning"
                    }
                  >
                    {run.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Run date</span>
                  <span>{run.runDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Started</span>
                  <span>{formatWhen(run.startedAt)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-[var(--muted)]">
                  <div className="rounded-md bg-[var(--surface-2)] p-2">
                    <div className="text-[var(--foreground)]">
                      {run.metrics.jobsNew}
                    </div>
                    New jobs
                  </div>
                  <div className="rounded-md bg-[var(--surface-2)] p-2">
                    <div className="text-[var(--foreground)]">
                      {run.metrics.jobsAnalyzed}
                    </div>
                    Analyzed
                  </div>
                  <div className="rounded-md bg-[var(--surface-2)] p-2">
                    <div className="text-[var(--foreground)]">
                      {run.metrics.followUpsCreated}
                    </div>
                    Follow-ups
                  </div>
                  <div className="rounded-md bg-[var(--surface-2)] p-2">
                    <div className="text-[var(--foreground)]">
                      {run.metrics.emailSent ? "Yes" : "No"}
                    </div>
                    SES sent
                  </div>
                </div>
              </>
            ) : (
              <p className="text-[var(--muted)]">No runs recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-up-delay-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {trendCards.map((t) => (
          <Card key={t.label}>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                {t.label}
              </p>
              <p
                className="mt-1 text-2xl font-semibold"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                {t.value}
              </p>
              {t.delta ? (
                <p
                  className={`mt-1 truncate text-xs ${
                    t.tone === "up"
                      ? "text-[var(--success)]"
                      : t.tone === "down"
                        ? "text-[var(--warning)]"
                        : "text-[var(--muted)]"
                  }`}
                >
                  {t.delta}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top matches</CardTitle>
            <CardDescription>Highest AI scores from recent analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topMatches.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No scored opportunities yet.
              </p>
            ) : (
              topMatches.map(({ job, evaluation }) => (
                <Link
                  key={job.fingerprint}
                  href={`/opportunities/${job.fingerprint}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.title}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {job.company} · {job.provider}
                    </p>
                  </div>
                  {evaluation ? (
                    <ScorePill score={evaluation.matchScore} />
                  ) : null}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-ups needing attention</CardTitle>
            <CardDescription>
              Drafts only — the agent never sends follow-up email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {followUps.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Nothing pending.</p>
            ) : (
              followUps.map((fu) => (
                <Link
                  key={`${fu.fingerprint}-${fu.createdAt}`}
                  href="/applications"
                  className="block rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
                >
                  <p className="text-sm font-medium">{fu.reminder}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {fu.suggestedAction}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
