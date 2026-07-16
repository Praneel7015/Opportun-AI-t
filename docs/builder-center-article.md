# Weekend Agent Challenge: Opportun-AI-t

**Tag:** `#agents`

**Public repo:** [https://github.com/Praneel7015/Opportun-AI-t](https://github.com/Praneel7015/Opportun-AI-t)  
**Live control center:** [https://main.dy5jhx1jn3iz3.amplifyapp.com](https://main.dy5jhx1jn3iz3.amplifyapp.com)  
**AWS region:** `ap-south-1` · **Account:** `329863774639`

---

## Vision

Job hunting is a daily grind of refreshing boards, skimming postings that look promising, and forgetting to follow up. Most “AI career tools” wait for you to paste a job description. **Opportun-AI-t** flips that: a scheduled AWS agent wakes up on its own, pulls public Greenhouse and Lever boards from a watchlist, reasons about fit with Amazon Nova Lite, stores structured results, and emails a briefing—while a Next.js control center shows the work the agent already finished.

The Weekend Agent Challenge asks for something that is **autonomous**, **evidence-backed**, and **built on AWS**. The MVP stays intentionally bounded: no Cognito login wall, no auto-apply, no automatic follow-up sending. Follow-up drafts are stored for human review only. The agent owns the daily loop; the dashboard primarily displays and edits results (with an optional manual “Run now” trigger for demos).

What changed since the first draft is the **first-run experience**. A visitor lands on onboarding, enters name / email / career preferences / company watchlists, gets a welcome email, and receives an isolated DynamoDB namespace via an HttpOnly session cookie—so multiple people can use the same Amplify app without sharing one another’s desk. The scheduled Lambda still runs for the configured agent `USER_ID` (typically the challenge owner’s desk); the control center is multi-visitor.

Success for this challenge is not a prettier UI. It is an **unattended schedule**, a **completed Lambda run** with CloudWatch metrics, DynamoDB artifacts, and (once SES is verified) an inbox briefing that proves the pipeline closed the loop without a human click.

---

## How it was built

The monorepo is TypeScript throughout:

| Path | Role |
|------|------|
| `packages/core` | Zod schemas, DynamoDB keys, fingerprints, dedupe / stale-follow-up helpers, content normalizers |
| `services/agent` | Lambda handler + pipeline (providers → Bedrock → persist → SES) |
| `apps/web` | Next.js 15 App Router control center (SSR DynamoDB, onboarding, settings) |
| `infra` | AWS CDK: Scheduler, Lambda, DynamoDB, DLQ, alarms, CloudWatch dashboard |

**Pipeline (idempotent per calendar day in `Asia/Kolkata`):**

1. EventBridge Scheduler invokes `opportun-ai-t-career-agent` at 08:00.
2. The agent claims a `RUN` record. A second invoke the same day returns `skipped: true` / `run_already_completed`.
3. Profile + enabled sources load from DynamoDB (defaults seed on first run if missing).
4. Greenhouse / Lever adapters fetch public boards with timeouts and retries; jobs are fingerprinted and deduped; HTML descriptions are normalized to plain text at ingest.
5. Up to `ANALYSIS_CAP` new jobs are evaluated via Bedrock Converse (`apac.amazon.nova-lite-v1:0`). Structured JSON is validated; Nova sometimes returns numeric confidence values, which the parser coerces to `low` | `medium` | `high`.
6. Stale applications get **review-only** follow-up drafts (never emailed).
7. A daily report is persisted; SES sends the briefing to the **profile email** when present (falling back to `SES_TO_EMAIL`); EMF metrics land in namespace `OpportunAiT`.

**Control center (Amplify Hosting):**

- First-run onboarding (4 steps): identity → career prefs → company watchlists → schedule review.
- Welcome email via SES after onboarding completes (fire-and-forget; never blocks the redirect).
- Multi-visitor isolation: `oai_uid` HttpOnly cookie → `USER#<id>` DynamoDB namespace for profile and sources.
- Dashboard: live run desk, next-schedule countdown, ranked opportunities, action queue.
- Opportunity detail: Apply CTA + copy job URL; Markdown lite for briefing rendering.
- Optional `/api/trigger-run` → Lambda Function URL for a manual demo invoke (Bearer-protected when `TRIGGER_SECRET` is set).

Local development uses fixture boards and `AGENT_DRY_RUN` so the pipeline can be exercised without calling Bedrock or SES. Unit tests cover adapters, idempotency, parsing, digest rendering, content normalizers, and dry-run orchestration.

---

## AWS architecture

```
EventBridge Scheduler (opportun-ai-t-daily-8am, Asia/Kolkata)
        │
        ▼
Lambda opportun-ai-t-career-agent
   ├── Greenhouse / Lever HTTPS
   ├── Bedrock Nova Lite (APAC inference profile)
   ├── DynamoDB single-table (PK/SK + GSI1/GSI2)
   ├── SES SendEmail (From/To verified identities)
   └── CloudWatch logs + EMF (OpportunAiT)
        │
        ▼
Next.js control center (Amplify Hosting ← GitHub main)
   ├── onboarding + HttpOnly session cookie
   ├── server actions / repositories → same DynamoDB table
   └── optional POST /api/trigger-run → Lambda Function URL
```

**Deployed stack outputs (live):**

| Output | Value |
|--------|--------|
| TableName | `OpportunAiTStack-OpportunTableE8F45E13-1CZFD8Z85LAQ` |
| LambdaName | `opportun-ai-t-career-agent` |
| ScheduleName | `opportun-ai-t-daily-8am` (ENABLED) |
| Dashboard | [Opportun-AI-t](https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=Opportun-AI-t) |
| Log group | `OpportunAiTStack-CareerAgentLogGroupB0706E80-ESCzJrkIaNTk` |
| Amplify | app `dy5jhx1jn3iz3` · SSR compute role with DynamoDB access |

IAM is least-privilege for DynamoDB R/W, Bedrock Converse on Nova + inference profiles, SES from the configured address, and CloudWatch PutMetricData for the `OpportunAiT` namespace. Failed invokes land on an SQS DLQ with alarms.

Amplify Hosting runs the Next.js App Router as SSR. Console env vars are **baked into `apps/web/.env.production` during `amplify.yml` preBuild** (Amplify forbids custom `AWS_*` keys, so the app uses `APP_REGION`). An Amplify **SSR Compute role** (`OpportunAiT-AmplifySSRComputeRole`) assumes DynamoDB access so server actions can write profiles without bundling credentials into the client.

---

## What we learned

**Autonomous agents need boring reliability first.** Idempotent run claims mattered as much as the model: Scheduler retries must not double-email or re-analyze the same day. EMF metrics and a dedicated dashboard made “did it run?” answerable in one screenshot.

**Model output is a contract.** Nova Lite reliably called Converse in `ap-south-1` via the APAC inference profile, but free-form JSON drifted (e.g. numeric confidence). Coercion + explicit prompt constraints turned a 10/10 validation failure into a clean analyzed batch.

**Hosting SSR on Amplify is its own agent problem.** Env vars that work in Lambda do not automatically reach Next.js compute. Baking `.env.production` at build time, renaming `AWS_REGION` → `APP_REGION`, and attaching a dedicated SSR compute role were the difference between “demo mode forever” and a live DynamoDB desk.

**Identity without Cognito still needs a namespace.** A shared `USER#default` profile made the second visitor “already onboarded.” An HttpOnly cookie + `USER#<nanoid>` keys fixed onboarding and let multiple visitors keep separate prefs and watchlists—without pretending we shipped full multi-tenant auth.

**Sandbox email is a hard gate.** SES identity verification blocks both welcome mail and the daily digest until From (and, in sandbox, To) are verified. The pipeline records `emailError` honestly when that gate is closed; the agent still completes the rest of the loop.

**Provider boards change.** Watchlist slugs like Greenhouse `notion` or Lever `vercel` can 404; Stripe still returned hundreds of postings. Documenting source health in logs kept the run useful instead of failing closed.

**Challenge demos are evidence packs.** The winning artifact set is Scheduler history + Lambda logs + dashboard widgets + DynamoDB run/report items + SES mail + control-center screenshots—not a longer feature list.

---

## Live run evidence (2026-07-16)

Controlled invoke after deploy (post parse-fix redeploy):

```text
ok: true
skipped: false
runDate: 2026-07-16
status: COMPLETED
metrics:
  jobsFetched: 524
  jobsNew: 524
  jobsAnalyzed: 10
  bedrockErrors: 0
  followUpsCreated: 0
  emailSent: false
  emailError: Email address is not verified ... praneelteck@gmail.com
  durationMs: ~31652
```

Immediate second invoke: `skipped: true`, `skipReason: run_already_completed` (idempotency proof).

**Screenshot checklist:** CloudWatch dashboard `Opportun-AI-t`, log group filter for `pipeline_completed`, DynamoDB `RUN#2026-07-16`, Scheduler schedule ENABLED, Amplify onboarding → dashboard path, and (after SES verify) inbox subject `Opportun-AI-t briefing — 2026-07-16` plus the welcome email after first-run setup.

---

## Product surface (control center)

| Route | What you see |
|-------|----------------|
| `/onboard` | 4-step first-run: name/email → prefs → watchlists → schedule review |
| `/` | Morning briefing, run desk, next-run countdown, ranked matches, action queue |
| `/opportunities` | Scored job ledger |
| `/opportunities/[id]` | Match rationale, Apply CTA, copy URL, save toggle |
| `/applications` | Status tracking + copy-only follow-up drafts |
| `/reports` | Daily / weekly digests with Markdown rendering |
| `/settings` | Profile, watchlists, schedule metadata (display-only) |

The UI never pretends follow-ups were sent. Drafts are copy-to-clipboard for the human. The agent’s contract is: scout → score → brief → store.

---

## Links for submission

| Asset | URL |
|-------|-----|
| Public GitHub | [github.com/Praneel7015/Opportun-AI-t](https://github.com/Praneel7015/Opportun-AI-t) |
| Live Amplify app | [main.dy5jhx1jn3iz3.amplifyapp.com](https://main.dy5jhx1jn3iz3.amplifyapp.com) |
| CloudWatch dashboard | [Opportun-AI-t (ap-south-1)](https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=Opportun-AI-t) |
| Architecture notes | [`docs/architecture.md`](./architecture.md) |
| Deploy runbook | [`docs/deployment.md`](./deployment.md) |
| Evidence checklist | [`docs/demo-checklist.md`](./demo-checklist.md) |

**Remaining for a perfect evidence pack:** verify SES → capture welcome + daily briefing screenshots → publish this article in Builder Center with tag **`#agents`**.

Built for the Weekend Agent Challenge: an agent that shows up for work even when you do not.
