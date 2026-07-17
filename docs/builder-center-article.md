# Weekend Agent Challenge: Opportun-AI-t

**Tag:** `agents`

---

## Vision & What the Agent Does

Job hunting is a daily grind of refreshing career boards, skimming postings that look promising, and forgetting to follow up. Most AI career tools wait for you to paste a job description and click “analyze.” **Opportun-AI-t** flips that model. It is a personal, AI-powered career agent that wakes up on its own, scouts public job boards, scores roles against your profile, and reports back with a daily briefing you can read in your inbox and in a web control center.

The problem it solves is simple: opportunities move faster than attention. If you only search when you have free time, you miss roles that opened overnight. Opportun-AI-t keeps a watchlist of Greenhouse and Lever company boards, evaluates new postings with Amazon Bedrock (Nova Lite), stores structured results in DynamoDB, and delivers a curated morning digest. Follow-up drafts for stale applications are written for human review only—the agent never auto-applies or auto-sends outreach emails.

What triggers it to run is **Amazon EventBridge Scheduler**. Every day at 08:00 Asia/Kolkata, the schedule `opportun-ai-t-daily-8am` invokes the career-agent Lambda with no human click required. The agent claims an idempotent run for that calendar day, fetches enabled boards, fingerprints and dedupes jobs, evaluates up to an analysis cap of new roles, persists evaluations and a daily report, then attempts SES delivery of the briefing. A second invoke the same day is skipped, so scheduler retries cannot double-email or re-analyze the day.

From a user perspective, the agent reports back in three places. First, a daily email briefing summarizes top matches and follow-ups needing review. Second, a Next.js control center on AWS Amplify shows the issued brief, ranked opportunities, applications, and run status. Third, CloudWatch logs and a dedicated dashboard record that the unattended pipeline completed—jobs fetched, jobs analyzed, Bedrock errors, email sent, and duration. First-time visitors complete a short onboarding flow (name, email, career preferences, company watchlists) and receive a welcome email confirming the desk is ready; subsequent mornings arrive without further setup.

The optional “Run now” control in the UI is only a demo convenience. The production contract is the scheduled, unattended invoke.

---

## How You Built It

Opportun-AI-t is a TypeScript monorepo with four workspaces: a shared `packages/core` library (Zod schemas, DynamoDB key helpers, fingerprints, dedupe and stale-follow-up logic, content normalizers), `services/agent` (the Lambda pipeline), `apps/web` (Next.js 15 App Router control center), and `infra` (AWS CDK for Scheduler, Lambda, DynamoDB, DLQ, alarms, and CloudWatch).

Key decisions early on kept the MVP honest for a weekend challenge. The agent owns the autonomous loop; the dashboard primarily displays and edits results. Follow-up drafts are stored, never emailed as application outreach. Job sources stay on public Greenhouse and Lever boards—no scraping of authenticated sites. Bedrock evaluations return structured JSON validated at the boundary, because free-form model output is not a trustworthy database schema.

Several challenges shaped the final design. Nova Lite sometimes returned numeric confidence values instead of the expected `low` | `medium` | `high` strings; a coercion layer plus stricter prompts turned systematic validation failures into clean analyzed batches. SES sandbox verification blocked live inbox proof until identities were verified, so the pipeline records `emailError` honestly while still completing the rest of the run. Amplify Hosting for Next.js SSR needed its own reliability work: console environment variables do not always reach compute for monorepos, Amplify rejects custom `AWS_*` keys, and the SSR runtime needs a dedicated IAM compute role for DynamoDB. Baking values into `.env.production` during `amplify.yml` preBuild, using `APP_REGION` instead of `AWS_REGION`, and attaching `OpportunAiT-AmplifySSRComputeRole` fixed “demo mode forever.”

Identity without Cognito was another hard lesson. A shared `USER#default` profile made the second visitor appear “already onboarded.” An HttpOnly session cookie plus `USER#<id>` namespaces let multiple visitors keep separate prefs and watchlists without shipping full multi-tenant auth. The scheduled Lambda continues to run for the configured agent user—the control center is multi-visitor; the autonomous agent remains a personal desk on a schedule.

Local development uses fixture boards and an `AGENT_DRY_RUN` mode so the pipeline can be exercised without calling Bedrock or SES. Unit tests cover adapters, idempotency, JSON parsing, digest rendering, and dry-run orchestration. A controlled live invoke in `ap-south-1` completed with hundreds of jobs fetched, ten analyzed via Bedrock with zero model errors, and a second same-day invoke correctly skipped as already completed.

---

## AWS Services Used / Architecture Overview

**AWS services used**

| Service | Role |
|---------|------|
| Amazon EventBridge Scheduler | Unattended daily trigger at 08:00 Asia/Kolkata |
| AWS Lambda | Career agent pipeline execution |
| Amazon Bedrock (Nova Lite) | Job evaluation and digest writing via Converse |
| Amazon DynamoDB | Single-table store for profile, sources, jobs, evaluations, applications, follow-ups, runs, reports |
| Amazon SES | Welcome email and daily briefing delivery |
| Amazon CloudWatch | Structured logs, Embedded Metric Format (`OpportunAiT`), dashboard, alarms |
| Amazon SQS | Dead-letter queue for failed Lambda invokes |
| AWS Amplify Hosting | Next.js SSR control center |
| AWS IAM | Least-privilege roles for Lambda and Amplify SSR compute |
| AWS CDK | Infrastructure as code for the stack |

**Architecture overview**

```
EventBridge Scheduler (opportun-ai-t-daily-8am)
        │
        ▼
Lambda opportun-ai-t-career-agent
   ├── Greenhouse / Lever HTTPS adapters
   ├── Bedrock Nova Lite (APAC inference profile)
   ├── DynamoDB single-table (PK/SK + GSI1/GSI2)
   ├── SES SendEmail
   └── CloudWatch logs + EMF metrics
        │
        ▼
Next.js control center (Amplify Hosting)
   └── server actions / repositories → same DynamoDB table
```

The agent is triggered by EventBridge Scheduler, not by a required UI click. Lambda loads the profile and enabled sources, fetches public boards, dedupes by fingerprint, evaluates new jobs with Bedrock, writes review-only follow-up drafts when applications go stale, persists a daily report, sends SES mail to the profile email when available, and emits CloudWatch evidence that the unattended run finished. The Amplify-hosted control center reads the same DynamoDB table so the human can review matches, edit preferences, and manage watchlists after the agent has already done the work.

---

## What You Learned

The strongest lesson was that autonomous agents are mostly boring reliability. Idempotent run claims mattered as much as the model: scheduler retries must not double-email or re-analyze the same day. CloudWatch EMF metrics and a named dashboard made “did it run?” answerable in one screenshot—exactly the evidence an unattended agent needs for a challenge.

Model output is a contract, not a suggestion. Constraining Nova Lite with explicit JSON shapes and coercing drifted fields was the difference between a failed batch and a clean analyzed run. Content rendering taught a similar boundary lesson: job boards ship HTML, briefings ship Markdown, and the UI must normalize both safely instead of dumping raw markup.

Amplify SSR for a monorepo taught that “deployed on AWS” and “credentials and env vars actually reach the runtime” are different problems. Renaming region to `APP_REGION`, baking env at build time, and attaching a proper compute role were as important as the agent code itself.

Finally, identity shortcuts have consequences. Cookie-scoped DynamoDB namespaces fixed broken onboarding without Cognito, but they also clarified the MVP boundary: the challenge asks for a personal agent that runs unattended and reports back—not a full multi-tenant SaaS. Keeping follow-ups review-only, keeping apply human-driven, and keeping the schedule as the source of truth preserved that boundary while still shipping a useful desk.

---

## Link to App or Repo

**Deployed application:** [https://main.dy5jhx1jn3iz3.amplifyapp.com](https://main.dy5jhx1jn3iz3.amplifyapp.com)

**Public source repository:** [https://github.com/Praneel7015/Opportun-AI-t](https://github.com/Praneel7015/Opportun-AI-t)

Built for the Weekend Agent Challenge: an agent that shows up for work even when you do not.
