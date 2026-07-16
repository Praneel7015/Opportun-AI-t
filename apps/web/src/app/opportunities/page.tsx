import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScorePill } from "@/components/shared/meta";
import { listOpportunities } from "@/lib/db/repositories";
import { OpportunityFiltersSchema } from "@/lib/domain/mutations";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = OpportunityFiltersSchema.parse({
    saved: sp.saved === "1" || sp.saved === "true" ? true : undefined,
    minScore: sp.minScore ? Number(sp.minScore) : undefined,
    provider:
      sp.provider === "greenhouse" || sp.provider === "lever"
        ? sp.provider
        : undefined,
    q: typeof sp.q === "string" ? sp.q : undefined,
  });

  const rows = await listOpportunities(filters);

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1
          className="text-xl font-semibold tracking-tight sm:text-2xl"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          Opportunities
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          AI-ranked roles from your watchlist boards (Saved is a filter via
          Application status — not a separate page)
        </p>
      </div>

      <div className="animate-fade-up-delay flex flex-wrap items-center gap-2">
        {chip("/opportunities", "All", !filters.saved && !filters.minScore && !filters.provider)}
        {chip("/opportunities?saved=1", "Saved", !!filters.saved)}
        {chip(
          "/opportunities?minScore=80",
          "Score ≥ 80",
          filters.minScore === 80,
        )}
        {chip(
          "/opportunities?provider=greenhouse",
          "Greenhouse",
          filters.provider === "greenhouse",
        )}
        {chip(
          "/opportunities?provider=lever",
          "Lever",
          filters.provider === "lever",
        )}
      </div>

      <form className="animate-fade-up-delay flex gap-2" action="/opportunities">
        {filters.saved ? <input type="hidden" name="saved" value="1" /> : null}
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search title or company…"
          className="h-9 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm"
        />
        <button
          type="submit"
          className="h-9 rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)]"
        >
          Search
        </button>
      </form>

      <div className="animate-fade-up-delay-2 space-y-3">
        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-[var(--muted)]">
              No opportunities match these filters.
            </CardContent>
          </Card>
        ) : (
          rows.map(({ job, evaluation, saved }) => (
            <Card key={job.fingerprint}>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    <Link
                      href={`/opportunities/${job.fingerprint}`}
                      className="hover:text-[var(--accent)]"
                    >
                      {job.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {job.company} · {job.location || "Location n/a"} ·{" "}
                    {job.provider}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {saved ? <Badge variant="default">Saved</Badge> : null}
                  {evaluation ? (
                    <ScorePill score={evaluation.matchScore} />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-sm text-[var(--muted)]">
                  {job.descriptionText ?? job.rawSnippet ?? ""}
                </p>
                {evaluation?.recommendation ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Recommendation:{" "}
                    <span className="text-[var(--foreground)]">
                      {evaluation.recommendation.replace("_", " ")}
                    </span>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
