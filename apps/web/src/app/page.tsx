import Link from "next/link";
import { RunStatus } from "@opportun-ai-t/core";
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
    <div className="space-y-10">
      <header className="animate-fade-up border-b border-[var(--border-strong)] pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="page-kicker">Morning edition · Career operations</p>
          <DataModeBadge mode={mode} />
        </div>
        <h1 className="page-title mt-5 max-w-4xl">
          {briefing?.subject ?? "Your daily career briefing"}
        </h1>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
          <span>{briefing ? formatWhen(briefing.createdAt) : "Awaiting first edition"}</span>
          <span>Desk / default</span>
          {run ? <span>Run {run.runDate}</span> : null}
        </div>
      </header>

      <section className="animate-fade-up-delay grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(240px,.65fr)]">
        <article>
          <p className="font-display text-xl leading-relaxed text-[var(--ink)] sm:text-2xl">
            {briefing?.summaryMarkdown ??
              "Your scheduled career agent has not issued a briefing yet. Once a run completes, its digest and ranked recommendations will appear on this desk."}
          </p>
          {briefing ? (
            <Link
              href={`/reports/${briefing.runDate}`}
              className="mt-6 inline-block border-b border-[var(--accent)] pb-0.5 text-sm font-bold text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Read the issued brief →
            </Link>
          ) : null}
        </article>

        <aside className="border-l-2 border-[var(--ink)] pl-5">
          <p className="page-kicker">Run desk</p>
          {run ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-[var(--border)] pb-2">
                <dt className="text-[var(--muted)]">Status</dt>
                <dd>
                  <Badge variant={run.status === RunStatus.COMPLETED ? "success" : run.status === RunStatus.FAILED ? "danger" : "warning"}>
                    {run.status}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-[var(--border)] pb-2">
                <dt className="text-[var(--muted)]">Started</dt>
                <dd className="tabular-nums text-right">{formatWhen(run.startedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Delivery</dt>
                <dd>{run.metrics.emailSent ? "Sent" : "Not sent"}</dd>
              </div>
            </dl>
          ) : <p className="mt-4 text-sm text-[var(--muted)]">No runs recorded yet.</p>}
        </aside>
      </section>

      <section aria-label="Latest metrics" className="animate-fade-up-delay-2 grid border-y-2 border-[var(--ink)] sm:grid-cols-2 lg:grid-cols-4">
        {trendCards.map((t) => (
          <div key={t.label} className="border-b border-[var(--border)] p-4 sm:border-r lg:border-b-0 lg:last:border-r-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                {t.label}
              </p>
              <p className="font-display mt-1 text-4xl font-semibold tabular-nums text-[var(--ink)]">
                {t.value}
              </p>
              {t.delta ? (
                <p className={`mt-1 truncate text-xs ${t.tone === "up" ? "text-[var(--success)]" : t.tone === "down" ? "text-[var(--warning)]" : "text-[var(--muted)]"}`}>
                  {t.delta}
                </p>
              ) : null}
          </div>
        ))}
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
        <section>
          <div className="section-rule flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">Ranked opportunities</h2>
            <Link href="/opportunities" className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--accent)]">View ledger →</Link>
          </div>
          <div>
            {topMatches.length === 0 ? (
              <p className="border-b border-[var(--border)] py-6 text-sm text-[var(--muted)]">No scored opportunities yet.</p>
            ) : (
              topMatches.map(({ job, evaluation }, index) => (
                <Link
                  key={job.fingerprint}
                  href={`/opportunities/${job.fingerprint}`}
                  className="ledger-row grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span className="font-display text-xl text-[var(--muted)]">0{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--ink)]">{job.title}</p>
                    <p className="mt-0.5 truncate text-xs uppercase tracking-[0.06em] text-[var(--muted)]">
                      {job.company} · {job.provider}
                    </p>
                  </div>
                  {evaluation ? <ScorePill score={evaluation.matchScore} /> : null}
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="section-rule">
            <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">Action queue</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Drafts are copy-only and never sent automatically.</p>
          </div>
          <div>
            {followUps.length === 0 ? (
              <p className="border-b border-[var(--border)] py-6 text-sm text-[var(--muted)]">Nothing pending.</p>
            ) : (
              followUps.map((fu) => (
                <Link
                  key={`${fu.fingerprint}-${fu.createdAt}`}
                  href="/applications"
                  className="ledger-row block py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <p className="text-sm font-semibold text-[var(--ink)]">{fu.reminder}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{fu.suggestedAction}</p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
