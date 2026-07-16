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
import { EstimateCallout, ScorePill } from "@/components/shared/meta";
import { SaveToggle } from "@/components/opportunities/save-toggle";
import { CopyUrlButton } from "@/components/opportunities/copy-url-button";
import {
  getApplication,
  getJob,
  getLatestEvaluation,
} from "@/lib/db/repositories";
import { ApplicationStatus, normalizeJobDescription } from "@opportun-ai-t/core";
import { safeExternalHref } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: fingerprint } = await params;
  const [job, evaluation, application] = await Promise.all([
    getJob(fingerprint),
    getLatestEvaluation(fingerprint),
    getApplication(fingerprint),
  ]);
  if (!job) notFound();

  const href = safeExternalHref(job.absoluteUrl);
  const saved = application?.status === ApplicationStatus.SAVED;
  const description =
    normalizeJobDescription(job.descriptionText ?? job.rawSnippet) ||
    "No description stored.";

  return (
    <div className="space-y-8">
      <header className="animate-fade-up border-b border-[var(--border-strong)] pb-5">
        <Link
          href="/opportunities"
          className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
        >
          ← Opportunities
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="page-kicker mb-3">Role dossier · {job.provider}</p>
            <h1 className="page-title max-w-3xl">
              {job.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {job.company} · {job.location ?? "Location n/a"} · {job.provider}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {evaluation ? <ScorePill score={evaluation.matchScore} /> : null}
            <SaveToggle fingerprint={job.fingerprint} saved={!!saved} />
            {href && <CopyUrlButton url={href} />}
          </div>
        </div>
      </header>

      <div className="animate-fade-up-delay grid gap-4 lg:grid-cols-3">
        <Card className="rounded-none border-x-0 border-b-0 border-t-2 border-t-[var(--ink)] bg-transparent shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle>Role snapshot</CardTitle>
            <CardDescription>
              Normalized from public board posting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-4 leading-relaxed text-[var(--foreground)]/90">
              {description.split(/\n{2,}/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[3px] border-2 border-[var(--ink)] bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent-fg)] shadow-[2px_2px_0_var(--ink)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Apply now →
            </a>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-[var(--accent)]">
          <CardHeader>
            <CardTitle>AI recommendation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {evaluation ? (
              <>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Apply</span>
                  <Badge variant="default">
                    {evaluation.recommendation.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Interview difficulty</span>
                  <span>{evaluation.interviewDifficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Evaluated</span>
                  <span>{evaluation.runDate}</span>
                </div>
              </>
            ) : (
              <p className="text-[var(--muted)]">Not evaluated yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {evaluation ? (
        <div className="animate-fade-up-delay-2 grid gap-4 lg:grid-cols-2">
          <Card className="rounded-none border-x-0 border-b-0 border-t-2 border-t-[var(--ink)] bg-transparent shadow-none">
            <CardHeader>
              <CardTitle>Why it matches</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {evaluation.reasons.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="text-[var(--accent)]">▸</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="rounded-none border-x-0 border-b-0 border-t-2 border-t-[var(--ink)] bg-transparent shadow-none">
            <CardHeader>
              <CardTitle>Missing skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {evaluation.missingSkills.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">None flagged.</p>
              ) : (
                evaluation.missingSkills.map((s) => (
                  <Badge key={s} variant="warning">
                    {s}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {(evaluation?.companyInference || evaluation?.stackInference) && (
        <div className="space-y-3">
          {evaluation.companyInference ? (
            <EstimateCallout>
              <p className="mb-1 text-[var(--foreground)]/90">
                {evaluation.companyInference.value}
              </p>
              <p className="text-xs">
                Confidence: {evaluation.companyInference.confidence}
                {evaluation.companyInference.rationale
                  ? ` · ${evaluation.companyInference.rationale}`
                  : ""}
              </p>
            </EstimateCallout>
          ) : null}
          {evaluation.stackInference ? (
            <EstimateCallout>
              <p className="mb-1 text-[var(--foreground)]/90">
                Stack: {evaluation.stackInference.value}
              </p>
              <p className="text-xs">
                Confidence: {evaluation.stackInference.confidence}
              </p>
            </EstimateCallout>
          ) : null}
        </div>
      )}
    </div>
  );
}
