import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { markdownToPlainText } from "@/components/shared/markdown-lite";
import { listReports } from "@/lib/db/repositories";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await listReports();

  return (
    <div className="space-y-8">
      <header className="animate-fade-up border-b border-[var(--border-strong)] pb-5">
        <p className="page-kicker">Research archive · Issued briefs</p>
        <h1 className="page-title mt-4">Reports</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Historical daily digests and weekly market notes.
        </p>
      </header>

      <div className="animate-fade-up-delay space-y-3">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-[var(--muted)]">
              No reports yet.
            </CardContent>
          </Card>
        ) : (
          reports.map((item) => {
            if (item.kind === "daily") {
              const report = item.report;
              return (
                <Card key={`daily-${report.runDate}`} className="ledger-row rounded-none border-x-0 border-b-0 bg-transparent shadow-none first:border-t-2 first:border-t-[var(--ink)]">
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                    <div>
                      <CardTitle className="text-base">
                        <Link
                          href={`/reports/${report.runDate}`}
                          className="font-display text-xl hover:text-[var(--accent)]"
                        >
                          {report.subject}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        {report.runDate} ·{" "}
                        {new Date(report.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">daily</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-[var(--muted)]">
                      {markdownToPlainText(report.summaryMarkdown)}
                    </p>
                  </CardContent>
                </Card>
              );
            }

            const report = item.report;
            return (
              <Card key={`weekly-${report.yearWeek}`} className="ledger-row rounded-none border-x-0 border-b-0 bg-transparent shadow-none first:border-t-2 first:border-t-[var(--ink)]">
                <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      <Link
                        href={`/reports/week-${report.yearWeek}`}
                        className="font-display text-xl hover:text-[var(--accent)]"
                      >
                        Weekly insight — {report.yearWeek}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {new Date(report.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant="default">weekly</Badge>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-[var(--muted)]">
                    {report.insight}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
