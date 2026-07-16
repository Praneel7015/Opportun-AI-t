import type { CareerPreferences, NormalizedJob, UserProfile } from "@opportun-ai-t/core";

export function buildEvaluationSystemPrompt(): string {
  return [
    "You are an expert technical recruiter and career coach.",
    "Evaluate how well a job posting matches the candidate profile.",
    "Reason like a recruiter: weigh role fit, skills evidence, seniority, location/remote, and red flags.",
    "Do NOT merely summarize the job description.",
    "Company culture/stack fields are INFERENCES (estimates), not verified facts.",
    "Respond with a single JSON object only — no markdown fences, no commentary.",
  ].join(" ");
}

export function buildEvaluationUserPrompt(input: {
  profile: UserProfile;
  job: NormalizedJob;
}): string {
  const prefs: CareerPreferences = input.profile.preferences;
  const job = input.job;

  return JSON.stringify(
    {
      instruction:
        "Return JSON with keys: matchScore (0-100), reasons (string[] evidence-based), missingSkills (string[]), recommendation (strong_yes|yes|maybe|no), interviewDifficulty (low|medium|high|unknown), companyInference optional {value, confidence (MUST be string 'low'|'medium'|'high' — never a number), rationale}, stackInference optional {value, confidence (MUST be string 'low'|'medium'|'high' — never a number), rationale}, summary optional string.",
      candidate: {
        displayName: input.profile.displayName,
        headline: input.profile.headline,
        preferences: prefs,
      },
      job: {
        company: job.company,
        title: job.title,
        location: job.location,
        provider: job.provider,
        departments: job.departments,
        employmentType: job.employmentType,
        url: job.absoluteUrl,
        description: (job.descriptionText ?? job.rawSnippet ?? "").slice(0, 8000),
      },
    },
    null,
    2,
  );
}

export function buildDigestSystemPrompt(): string {
  return [
    "You are a career agent writing a concise daily briefing email.",
    "Highlight top matches with recruiter-style rationale, note follow-ups needing human review,",
    "and include one short weekly trend insight when data is provided.",
    "Never claim you sent follow-up emails — drafts are for the user only.",
    "Respond with JSON: { subject, summaryMarkdown, trendInsight }.",
  ].join(" ");
}

export function buildDigestUserPrompt(input: {
  runDate: string;
  topMatches: Array<{
    company: string;
    title: string;
    matchScore: number;
    recommendation: string;
    reasons: string[];
  }>;
  followUpCount: number;
  jobsFetched: number;
  jobsNew: number;
  trendHint?: string;
}): string {
  return JSON.stringify(input, null, 2);
}

export function buildFollowUpSystemPrompt(): string {
  return [
    "You draft polite follow-up reminders for job applications.",
    "Output JSON: { reminder, suggestedAction, draftEmail }.",
    "Drafts are for the candidate to review and send manually — never imply auto-send.",
  ].join(" ");
}
