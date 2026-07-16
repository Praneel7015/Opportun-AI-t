import {
  ApplicationStatus,
  AiEvaluationSchema,
  DailyReportSchema,
  FollowUpDraftSchema,
  RunStatus,
  buildFollowUpDraftContent,
  dedupeJobsWithinRun,
  detectNewJobs,
  findStaleApplications,
  isoYearWeek,
  runDateInTimezone,
  selectJobsForAnalysis,
  type AiEvaluation,
  type DailyReport,
  type FollowUpDraft,
  type NormalizedJob,
  type RunMetrics,
  type RunRecord,
  type UserProfile,
} from "@opportun-ai-t/core";
import { BedrockEvaluator } from "../ai";
import type { AgentConfig } from "../config";
import type { CareerAgentStore } from "../db";
import { SesEmailSender } from "../email";
import { emitEmbeddedMetrics, log } from "../logging";
import { collectJobsFromSources, createAdapters } from "../providers";
import { deriveWeeklyTrend } from "./trends";

export interface PipelineDeps {
  config: AgentConfig;
  repo: CareerAgentStore;
  bedrock?: BedrockEvaluator;
  ses?: SesEmailSender;
  now?: () => Date;
}

export interface PipelineResult {
  runDate: string;
  skipped: boolean;
  skipReason?: string;
  run: RunRecord;
}

export async function runCareerAgentPipeline(
  deps: PipelineDeps,
  requestId?: string,
): Promise<PipelineResult> {
  const started = Date.now();
  const now = deps.now ?? (() => new Date());
  const nowDate = now();
  const nowIso = nowDate.toISOString();
  const runDate = runDateInTimezone(nowDate, deps.config.scheduleTimezone);
  const { config, repo } = deps;

  log("info", "pipeline_start", { runDate, requestId, dryRun: config.dryRun });

  const claim = await repo.claimOrLoadRun({ runDate, requestId, nowIso });
  if (!claim.claimed) {
    log("info", "pipeline_skipped", {
      runDate,
      reason: claim.skipReason,
    });
    emitEmbeddedMetrics(
      { RunSkipped: 1, DurationMs: Date.now() - started },
      { RunDate: runDate, RunStatus: "skipped" },
    );
    return {
      runDate,
      skipped: true,
      skipReason: claim.skipReason,
      run: claim.run,
    };
  }

  let run = claim.run;
  const metrics: RunMetrics = {
    jobsFetched: 0,
    jobsDeduped: 0,
    jobsNew: 0,
    jobsAnalyzed: 0,
    bedrockErrors: 0,
    followUpsCreated: 0,
    emailSent: false,
  };

  try {
    const profile = await loadOrDefaultProfile(repo, config, nowIso);
    const sources = await repo.listSources(config.userId);

    if (sources.length === 0) {
      log("warn", "no_sources_configured", { userId: config.userId });
    }

    const { jobs: fetched, errors: sourceErrors } = await collectJobsFromSources(
      sources,
      { runDate, nowIso },
      createAdapters(),
    );
    metrics.jobsFetched = fetched.length;
    if (sourceErrors.length) {
      log("warn", "source_fetch_errors", { sourceErrors });
    }

    const { unique, dedupedCount } = dedupeJobsWithinRun(fetched);
    metrics.jobsDeduped = dedupedCount;

    const prior = await repo.listKnownFingerprints();
    const { newJobs, alreadyKnownCount } = detectNewJobs(unique, prior);
    metrics.jobsDeduped += alreadyKnownCount;

    // Persist new jobs (conditional); count true inserts
    const inserted: NormalizedJob[] = [];
    for (const job of newJobs) {
      const ok = await repo.putJobIfNew(job);
      if (ok) inserted.push(job);
    }
    // Also update lastSeen for within-run unique that were already known
    for (const job of unique) {
      if (!newJobs.includes(job)) {
        await repo.putJobIfNew({ ...job, lastSeenRunDate: runDate });
      }
    }
    metrics.jobsNew = inserted.length;

    const toAnalyze = selectJobsForAnalysis(inserted, config.analysisCap);
    const evaluations: AiEvaluation[] = [];
    const bedrock =
      deps.bedrock ??
      (config.dryRun
        ? undefined
        : new BedrockEvaluator({
            region: config.region,
            modelId: config.bedrockModelId,
          }));

    for (const job of toAnalyze) {
      try {
        const evaluation = await evaluateOne({
          bedrock,
          profile,
          job,
          runDate,
          nowIso,
          dryRun: config.dryRun,
        });
        await repo.putEvaluation(evaluation);
        evaluations.push(evaluation);
        metrics.jobsAnalyzed += 1;

        // Auto-save high matches as Saved applications for the dashboard
        if (
          evaluation.matchScore >= profile.preferences.minMatchScore &&
          (evaluation.recommendation === "strong_yes" ||
            evaluation.recommendation === "yes")
        ) {
          await repo.putApplication({
            entityType: "APPLICATION",
            fingerprint: job.fingerprint,
            status: ApplicationStatus.SAVED,
            company: job.company,
            title: job.title,
            absoluteUrl: job.absoluteUrl,
            lastStatusAt: nowIso,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      } catch (err) {
        metrics.bedrockErrors += 1;
        log("error", "bedrock_evaluation_failed", {
          fingerprint: job.fingerprint,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Stale application follow-up drafts (store only)
    const applications = await repo.listApplications();
    const stale = findStaleApplications(
      applications.map((a) => ({
        fingerprint: a.fingerprint,
        status: a.status,
        company: a.company,
        title: a.title,
        lastStatusAt: a.lastStatusAt,
        absoluteUrl: a.absoluteUrl,
      })),
      profile.preferences.staleFollowUpDays,
      nowDate,
    );

    const followUps: FollowUpDraft[] = [];
    for (const candidate of stale) {
      const existing = await repo.listFollowUpsForApp(candidate.fingerprint);
      const alreadyThisRun = existing.some((f) => f.runDate === runDate);
      if (alreadyThisRun) continue;

      let content = buildFollowUpDraftContent(candidate);
      if (bedrock && !config.dryRun) {
        try {
          content = await bedrock.draftFollowUp(candidate);
        } catch {
          // keep deterministic draft
        }
      }

      const draft = FollowUpDraftSchema.parse({
        entityType: "FOLLOWUP",
        fingerprint: candidate.fingerprint,
        applicationStatus: candidate.status,
        reminder: content.reminder,
        suggestedAction: content.suggestedAction,
        draftEmail: content.draftEmail,
        staleDays: candidate.staleDays,
        createdAt: nowIso,
        runDate,
      });
      await repo.putFollowUp(draft);
      followUps.push(draft);
      metrics.followUpsCreated += 1;
    }

    const yearWeek = isoYearWeek(new Date(`${runDate}T12:00:00.000Z`));
    const weekly = deriveWeeklyTrend({
      runDate,
      nowIso,
      newJobs: inserted,
      evaluations,
      existing: await repo.getWeeklyTrend(yearWeek),
    });
    await repo.putWeeklyTrend(weekly);

    const report = await buildDailyReport({
      bedrock,
      dryRun: config.dryRun,
      runDate,
      nowIso,
      displayName: profile.displayName,
      evaluations,
      inserted,
      followUpCount: followUps.length,
      metrics,
      trendInsight: weekly.insight,
    });
    await repo.putDailyReport(report);

    // Resolve recipient email: prefer verified profile email, fall back to env var.
    const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    const toEmail =
      profile.email && isValidEmail(profile.email)
        ? profile.email
        : config.sesToEmail;

    // SES briefing only (never follow-up drafts)
    const ses =
      deps.ses ??
      (config.dryRun
        ? undefined
        : new SesEmailSender({
            region: config.region,
            fromEmail: config.sesFromEmail,
            toEmail,
          }));

    if (ses) {
      const emailResult = await ses.sendDailyDigest(report);
      if (emailResult.messageId) {
        metrics.emailSent = true;
        run = {
          ...run,
          emailSentAt: nowIso,
        };
      } else if (emailResult.error) {
        metrics.emailError = emailResult.error;
        log("error", "ses_send_failed", { error: emailResult.error });
      }
    } else if (config.dryRun) {
      metrics.emailSent = true;
      run = { ...run, emailSentAt: nowIso };
      log("info", "ses_dry_run_skip", { subject: report.subject });
    }

    metrics.durationMs = Date.now() - started;
    run = {
      ...run,
      status: RunStatus.COMPLETED,
      finishedAt: nowIso,
      metrics,
    };
    await repo.finalizeRun(run);

    emitEmbeddedMetrics(
      {
        RunCompleted: 1,
        JobsFetched: metrics.jobsFetched,
        JobsNew: metrics.jobsNew,
        JobsDeduped: metrics.jobsDeduped,
        JobsAnalyzed: metrics.jobsAnalyzed,
        BedrockErrors: metrics.bedrockErrors,
        FollowUpsCreated: metrics.followUpsCreated,
        EmailSent: metrics.emailSent ? 1 : 0,
        DurationMs: metrics.durationMs,
      },
      { RunDate: runDate, RunStatus: RunStatus.COMPLETED },
    );

    log("info", "pipeline_completed", { runDate, metrics });
    return { runDate, skipped: false, run };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    metrics.durationMs = Date.now() - started;
    run = {
      ...run,
      status: RunStatus.FAILED,
      finishedAt: nowIso,
      errorMessage: message,
      metrics,
    };
    await repo.finalizeRun(run);
    emitEmbeddedMetrics(
      {
        RunFailed: 1,
        DurationMs: metrics.durationMs,
        BedrockErrors: metrics.bedrockErrors,
        EmailSent: metrics.emailSent ? 1 : 0,
      },
      { RunDate: runDate, RunStatus: RunStatus.FAILED },
    );
    log("error", "pipeline_failed", { runDate, error: message });
    throw err;
  }
}

async function loadOrDefaultProfile(
  repo: CareerAgentStore,
  config: AgentConfig,
  nowIso: string,
): Promise<UserProfile> {
  const existing = await repo.getProfile(config.userId);
  if (existing) return existing;

  const fallback: UserProfile = {
    entityType: "PROFILE",
    userId: config.userId,
    displayName: "Career Seeker",
    email: config.sesToEmail || "user@example.com",
    headline: "Software engineer exploring new roles",
    preferences: {
      targetRoles: ["Software Engineer", "Backend Engineer"],
      skills: ["TypeScript", "AWS", "Node.js"],
      locations: ["Remote"],
      remoteOk: true,
      seniority: ["mid", "senior"],
      industries: [],
      keywordsInclude: [],
      keywordsExclude: [],
      minMatchScore: 50,
      staleFollowUpDays: 7,
    },
    timezone: config.scheduleTimezone,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await repo.putProfile(fallback);
  log("info", "default_profile_seeded", { userId: config.userId });
  return fallback;
}

async function evaluateOne(input: {
  bedrock?: BedrockEvaluator;
  profile: UserProfile;
  job: NormalizedJob;
  runDate: string;
  nowIso: string;
  dryRun: boolean;
}): Promise<AiEvaluation> {
  if (!input.bedrock || input.dryRun) {
    return AiEvaluationSchema.parse({
      entityType: "EVALUATION",
      fingerprint: input.job.fingerprint,
      runDate: input.runDate,
      modelId: "dry-run",
      matchScore: 72,
      reasons: [
        `Title "${input.job.title}" aligns with target roles`,
        "Dry-run evaluation — replace with Bedrock in production",
      ],
      missingSkills: [],
      recommendation: "yes",
      interviewDifficulty: "medium",
      companyInference: {
        value: `${input.job.company} (estimate)`,
        isEstimate: true,
        confidence: "low",
        rationale: "Inferred from posting only",
      },
      stackInference: {
        value: "Unknown stack (estimate)",
        isEstimate: true,
        confidence: "low",
      },
      summary: `Dry-run match for ${input.job.title}`,
      createdAt: input.nowIso,
    });
  }

  const result = await input.bedrock.evaluateJob(input.profile, input.job);
  const out = result.output;
  return AiEvaluationSchema.parse({
    entityType: "EVALUATION",
    fingerprint: input.job.fingerprint,
    runDate: input.runDate,
    modelId: result.modelId,
    matchScore: out.matchScore,
    reasons: out.reasons,
    missingSkills: out.missingSkills,
    recommendation: out.recommendation,
    interviewDifficulty: out.interviewDifficulty,
    companyInference: out.companyInference
      ? {
          value: out.companyInference.value,
          isEstimate: true as const,
          confidence: out.companyInference.confidence,
          rationale: out.companyInference.rationale,
        }
      : undefined,
    stackInference: out.stackInference
      ? {
          value: out.stackInference.value,
          isEstimate: true as const,
          confidence: out.stackInference.confidence,
          rationale: out.stackInference.rationale,
        }
      : undefined,
    summary: out.summary,
    latencyMs: result.latencyMs,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    createdAt: input.nowIso,
  });
}

async function buildDailyReport(input: {
  bedrock?: BedrockEvaluator;
  dryRun: boolean;
  runDate: string;
  nowIso: string;
  displayName?: string;
  evaluations: AiEvaluation[];
  inserted: NormalizedJob[];
  followUpCount: number;
  metrics: RunMetrics;
  trendInsight: string;
}): Promise<DailyReport> {
  const byFp = new Map(input.inserted.map((j) => [j.fingerprint, j]));
  const topMatches = [...input.evaluations]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5)
    .map((e) => {
      const job = byFp.get(e.fingerprint);
      return {
        fingerprint: e.fingerprint,
        company: job?.company ?? "Unknown",
        title: job?.title ?? "Unknown",
        matchScore: e.matchScore,
        recommendation: e.recommendation,
      };
    });

  let subject = `Opportun-AI-t briefing — ${input.runDate}`;
  let summaryMarkdown = [
    `## Daily briefing (${input.runDate})`,
    "",
    `- Jobs fetched: **${input.metrics.jobsFetched}**`,
    `- New: **${input.metrics.jobsNew}** · Analyzed: **${input.metrics.jobsAnalyzed}**`,
    `- Follow-up drafts: **${input.followUpCount}** (review only — not sent)`,
    "",
    input.trendInsight ? `### Trend\n${input.trendInsight}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (input.bedrock && !input.dryRun && input.evaluations.length > 0) {
    try {
      const digest = await input.bedrock.writeDigest({
        runDate: input.runDate,
        displayName: input.displayName,
        topMatches: topMatches.map((m) => ({
          company: m.company,
          title: m.title,
          matchScore: m.matchScore,
          recommendation: m.recommendation,
          reasons:
            input.evaluations.find((e) => e.fingerprint === m.fingerprint)
              ?.reasons ?? [],
        })),
        followUpCount: input.followUpCount,
        jobsFetched: input.metrics.jobsFetched,
        jobsNew: input.metrics.jobsNew,
        trendHint: input.trendInsight,
      });
      subject = digest.output.subject;
      summaryMarkdown = digest.output.summaryMarkdown;
      if (digest.output.trendInsight) {
        input.trendInsight = digest.output.trendInsight;
      }
    } catch (err) {
      log("warn", "digest_ai_fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return DailyReportSchema.parse({
    entityType: "REPORT",
    reportType: "DAILY",
    runDate: input.runDate,
    subject,
    summaryMarkdown,
    topMatches,
    followUpCount: input.followUpCount,
    trendInsight: input.trendInsight,
    createdAt: input.nowIso,
  });
}
