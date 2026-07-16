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
      className={`border-b-2 px-2 py-2 text-xs font-bold uppercase tracking-[0.07em] transition-colors ${
        active
          ? "border-[var(--accent)] text-[var(--accent)]"
          : "border-transparent text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-8">
      <header className="animate-fade-up border-b border-[var(--border-strong)] pb-5">
        <p className="page-kicker">Role intelligence · Ranked ledger</p>
        <h1 className="page-title mt-4">Opportunities</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Ranked roles from your watchlist boards, with saved status and evidence.
        </p>
      </header>

      <div className="animate-fade-up-delay flex flex-wrap items-center gap-2 border-y border-[var(--border)]">
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

      <form className="animate-fade-up-delay flex gap-2 border-b border-[var(--border)] pb-6" action="/opportunities">
        {filters.saved ? <input type="hidden" name="saved" value="1" /> : null}
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search title or company…"
          className="h-10 min-w-0 flex-1 rounded-[3px] border border-[var(--border-strong)] bg-[#fbf8f0] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
        <button
          type="submit"
          className="h-10 rounded-[3px] border border-[var(--accent)] bg-[var(--accent)] px-4 text-sm font-bold text-[var(--accent-fg)] shadow-[2px_2px_0_var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Search
        </button>
      </form>

      <div className="animate-fade-up-delay-2">
        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-[var(--muted)]">
              No opportunities match these filters.
            </CardContent>
          </Card>
        ) : (
          rows.map(({ job, evaluation, saved }) => (
            <Card key={job.fingerprint} className="ledger-row rounded-none border-x-0 border-b-0 bg-transparent shadow-none first:border-t-2 first:border-t-[var(--ink)]">
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    <Link
                      href={`/opportunities/${job.fingerprint}`}
                      className="font-display text-xl hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
