import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScorePill } from "@/components/shared/meta";
import { getDailyReport, getWeeklyReport } from "@/lib/db/repositories";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id.startsWith("week-")) {
    const yearWeek = id.slice("week-".length);
    const report = await getWeeklyReport(yearWeek);
    if (!report) notFound();

    return (
      <div className="space-y-6">
        <div className="animate-fade-up">
          <Link
            href="/reports"
            className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
          >
            ← Daily Reports
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1
              className="text-xl font-semibold tracking-tight sm:text-2xl"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Weekly insight — {report.yearWeek}
            </h1>
            <Badge variant="default">weekly</Badge>
          </div>
        </div>

        <Card className="animate-fade-up-delay">
          <CardHeader>
            <CardTitle>Trend insight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="leading-relaxed">{report.insight}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-[var(--surface-2)] p-3">
                <p className="text-xs text-[var(--muted)]">New jobs</p>
                <p className="text-lg font-semibold">{report.jobsNewTotal}</p>
              </div>
              <div className="rounded-md bg-[var(--surface-2)] p-3">
                <p className="text-xs text-[var(--muted)]">Avg match</p>
                <p className="text-lg font-semibold">
                  {report.avgMatchScore ?? "—"}
                </p>
              </div>
              <div className="rounded-md bg-[var(--surface-2)] p-3">
                <p className="text-xs text-[var(--muted)]">Top companies</p>
                <p className="text-sm font-medium">
                  {report.topCompanies.join(", ") || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const report = await getDailyReport(id);
  if (!report) notFound();

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <Link
          href="/reports"
          className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
        >
          ← Daily Reports
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1
            className="text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {report.subject}
          </h1>
          <Badge variant="secondary">daily</Badge>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {report.runDate} · generated{" "}
          {new Date(report.createdAt).toLocaleString()}
        </p>
      </div>

      <Card className="animate-fade-up-delay">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {report.summaryMarkdown}
          </p>
          {report.trendInsight ? (
            <p className="rounded-md bg-[var(--surface-2)] p-3 text-sm text-[var(--muted)]">
              {report.trendInsight}
            </p>
          ) : null}
          <p className="text-xs text-[var(--muted)]">
            Follow-ups in digest: {report.followUpCount}
          </p>
        </CardContent>
      </Card>

      {report.topMatches.length > 0 ? (
        <Card className="animate-fade-up-delay-2">
          <CardHeader>
            <CardTitle>Top matches referenced</CardTitle>
            <CardDescription>From this digest</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.topMatches.map((m) => (
              <Link
                key={m.fingerprint}
                href={`/opportunities/${m.fingerprint}`}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-[var(--surface-2)]"
              >
                <div>
                  <p className="text-sm font-medium">
                    {m.company} — {m.title}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {m.recommendation.replace("_", " ")}
                  </p>
                </div>
                <ScorePill score={m.matchScore} />
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
