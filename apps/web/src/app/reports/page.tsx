import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listReports } from "@/lib/db/repositories";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await listReports();

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1
          className="text-xl font-semibold tracking-tight sm:text-2xl"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          Daily Reports
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Historical digests produced by the autonomous agent
        </p>
      </div>

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
                <Card key={`daily-${report.runDate}`}>
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                    <div>
                      <CardTitle className="text-base">
                        <Link
                          href={`/reports/${report.runDate}`}
                          className="hover:text-[var(--accent)]"
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
                      {report.summaryMarkdown}
                    </p>
                  </CardContent>
                </Card>
              );
            }

            const report = item.report;
            return (
              <Card key={`weekly-${report.yearWeek}`}>
                <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      <Link
                        href={`/reports/week-${report.yearWeek}`}
                        className="hover:text-[var(--accent)]"
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
