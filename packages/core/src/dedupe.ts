import type { NormalizedJob } from "./schemas";

/**
 * Within-run deduplication by fingerprint.
 * Keeps the first occurrence; later duplicates are counted as deduped.
 */
export function dedupeJobsWithinRun(
  jobs: NormalizedJob[],
): { unique: NormalizedJob[]; dedupedCount: number } {
  const seen = new Set<string>();
  const unique: NormalizedJob[] = [];
  let dedupedCount = 0;

  for (const job of jobs) {
    if (seen.has(job.fingerprint)) {
      dedupedCount += 1;
      continue;
    }
    seen.add(job.fingerprint);
    unique.push(job);
  }

  return { unique, dedupedCount };
}

/**
 * Detect jobs not present in the prior fingerprint set (cross-run dedupe).
 */
export function detectNewJobs(
  candidates: NormalizedJob[],
  priorFingerprints: ReadonlySet<string>,
): { newJobs: NormalizedJob[]; alreadyKnownCount: number } {
  const newJobs: NormalizedJob[] = [];
  let alreadyKnownCount = 0;

  for (const job of candidates) {
    if (priorFingerprints.has(job.fingerprint)) {
      alreadyKnownCount += 1;
      continue;
    }
    newJobs.push(job);
  }

  return { newJobs, alreadyKnownCount };
}

/**
 * Bound the analysis batch by ANALYSIS_CAP while preferring higher-signal titles
 * (simple heuristic: longer description / earlier in list after within-run dedupe).
 */
export function selectJobsForAnalysis(
  newJobs: NormalizedJob[],
  analysisCap: number,
): NormalizedJob[] {
  if (analysisCap <= 0) return [];
  if (newJobs.length <= analysisCap) return [...newJobs];

  const ranked = [...newJobs].sort((a, b) => {
    const lenA = a.descriptionText?.length ?? 0;
    const lenB = b.descriptionText?.length ?? 0;
    return lenB - lenA;
  });

  return ranked.slice(0, analysisCap);
}

export interface StaleApplicationInput {
  fingerprint: string;
  status: string;
  company: string;
  title: string;
  lastStatusAt: string;
  absoluteUrl?: string;
}

export interface StaleFollowUpCandidate extends StaleApplicationInput {
  staleDays: number;
}

const TERMINAL_STATUSES = new Set([
  "Offer",
  "Rejected",
  "Ghosted",
  "Withdrawn",
]);

/**
 * Applications that are non-terminal and older than the profile threshold.
 * Follow-up drafts are stored only — never auto-sent.
 */
export function findStaleApplications(
  applications: StaleApplicationInput[],
  staleFollowUpDays: number,
  now: Date = new Date(),
): StaleFollowUpCandidate[] {
  const thresholdMs = staleFollowUpDays * 24 * 60 * 60 * 1000;
  const results: StaleFollowUpCandidate[] = [];

  for (const app of applications) {
    if (TERMINAL_STATUSES.has(app.status)) continue;
    if (app.status === "Saved") continue;

    const last = Date.parse(app.lastStatusAt);
    if (Number.isNaN(last)) continue;

    const ageMs = now.getTime() - last;
    if (ageMs < thresholdMs) continue;

    const staleDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    results.push({ ...app, staleDays });
  }

  return results;
}

/** Build a review-only follow-up draft (no sending). */
export function buildFollowUpDraftContent(input: {
  company: string;
  title: string;
  status: string;
  staleDays: number;
  absoluteUrl?: string;
}): { reminder: string; suggestedAction: string; draftEmail: string } {
  const reminder = `${input.company} — "${input.title}" has been in status "${input.status}" for ${input.staleDays} day(s) with no update.`;
  const suggestedAction =
    input.status === "Applied" || input.status === "OA Received"
      ? "Send a polite follow-up email to the recruiter or hiring contact asking for a status update."
      : input.status === "Interview"
        ? "Confirm next steps with your interviewer or recruiter; share availability if waiting on scheduling."
        : "Review the opportunity and either advance the status or withdraw if no longer interested.";

  const linkLine = input.absoluteUrl
    ? `\nRole link: ${input.absoluteUrl}\n`
    : "\n";

  const draftEmail = `Subject: Following up — ${input.title} at ${input.company}

Hi,

I hope you're doing well. I wanted to follow up on my application for the ${input.title} role at ${input.company}. I remain very interested and would appreciate any update you can share on timing or next steps.
${linkLine}
Thank you for your time,
[Your Name]`;

  return { reminder, suggestedAction, draftEmail };
}
