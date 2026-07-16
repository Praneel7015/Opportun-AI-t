# Weekend Agent Challenge: Opportun-AI-t

**Tag:** `#agents`

**Public repo:** _[add GitHub URL after `gh auth login` + push]_  
**Live control center:** Amplify app `dy5jhx1jn3iz3` → `https://dy5jhx1jn3iz3.amplifyapp.com` _[live after GitHub branch connect + green build]_  
**AWS region:** `ap-south-1` · **Account:** `329863774639`

---

## Vision

Job hunting is a daily grind of refreshing boards, skimming postings that look promising, and forgetting to follow up. Most “AI career tools” wait for you to paste a job description. **Opportun-AI-t** flips that: a scheduled AWS agent wakes up on its own, pulls public Greenhouse and Lever boards from a watchlist, reasons about fit with Amazon Nova Lite, stores structured results, and emails a briefing—while a Next.js control center shows the work the agent already finished.

The Weekend Agent Challenge asks for something that is **autonomous**, **evidence-backed**, and **built on AWS**. The MVP is intentionally single-user and bounded: no multi-tenant auth, no auto-apply, no automatic follow-up sending. Follow-up drafts are stored for human review only. The agent owns the loop; the dashboard never triggers it.

Success for this challenge is not a prettier UI. It is an **unattended schedule**, a **completed Lambda run** with CloudWatch metrics, DynamoDB artifacts, and (once SES is verified) an inbox briefing that proves the pipeline closed the loop without a human click.

---

## How it was built

The monorepo is TypeScript throughout:

| Path | Role |
|------|------|
| `packages/core` | Zod schemas, DynamoDB keys, fingerprints, dedupe / stale-follow-up helpers |
| `services/agent` | Lambda handler + pipeline (providers → Bedrock → persist → SES) |
| `apps/web` | Next.js 15 App Router control center (server-side DynamoDB) |
| `infra` | AWS CDK: Scheduler, Lambda, DynamoDB, DLQ, alarms, CloudWatch dashboard |

**Pipeline (idempotent per calendar day in `Asia/Kolkata`):**

1. EventBridge Scheduler invokes `opportun-ai-t-career-agent` at 08:00.
2. The agent claims a `RUN` record. A second invoke the same day returns `skipped: true` / `run_already_completed`.
3. Profile + enabled sources load from DynamoDB (defaults seed on first run if missing).
4. Greenhouse / Lever adapters fetch public boards with timeouts and retries; jobs are fingerprinted and deduped.
5. Up to `ANALYSIS_CAP` (10) new jobs are evaluated via Bedrock Converse (`apac.amazon.nova-lite-v1:0`). Structured JSON is validated; Nova sometimes returns numeric confidence values, which the parser coerces to `low` | `medium` | `high`.
6. Stale applications get **review-only** follow-up drafts (never emailed).
7. A daily report is persisted; SES sends the briefing; EMF metrics land in namespace `OpportunAiT`.

Local development uses fixture boards and `AGENT_DRY_RUN` so the pipeline can be exercised without calling Bedrock or SES. Unit tests cover adapters, idempotency, parsing, digest rendering, and dry-run orchestration.

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
Next.js control center (Amplify Hosting ← GitHub)
   └── server routes / repositories → same DynamoDB table
```

**Deployed stack outputs (live):**

| Output | Value |
|--------|--------|
| TableName | `OpportunAiTStack-OpportunTableE8F45E13-1CZFD8Z85LAQ` |
| LambdaName | `opportun-ai-t-career-agent` |
| ScheduleName | `opportun-ai-t-daily-8am` (ENABLED) |
| Dashboard | [Opportun-AI-t](https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=Opportun-AI-t) |
| Log group | `OpportunAiTStack-CareerAgentLogGroupB0706E80-ESCzJrkIaNTk` |

IAM is least-privilege for DynamoDB R/W, Bedrock Converse on Nova + inference profiles, SES from the configured address, and CloudWatch PutMetricData for the `OpportunAiT` namespace. Failed invokes land on an SQS DLQ with alarms.

Amplify Hosting is prepared as an app shell; connecting the public GitHub repo requires a one-time OAuth consent in the Amplify console (see `docs/deployment.md`). The web app reads `TABLE_NAME` and `AWS_REGION` server-side and should use an Amplify compute role or SSR data access—not client-bundled credentials.

---

## What we learned

**Autonomous agents need boring reliability first.** Idempotent run claims mattered as much as the model: Scheduler retries must not double-email or re-analyze the same day. EMF metrics and a dedicated dashboard made “did it run?” answerable in one screenshot.

**Model output is a contract.** Nova Lite reliably called Converse in `ap-south-1` via the APAC inference profile, but free-form JSON drifted (e.g. numeric confidence). Coercion + explicit prompt constraints turned a 10/10 validation failure into a clean analyzed batch.

**Sandbox email is a hard gate.** SES identity `praneelteck@gmail.com` remained `PENDING` / not verified for sending during deploy. The pipeline completed and recorded `emailError` honestly; live inbox proof waits on clicking the verification link and re-invoking (or waiting for the 08:00 schedule).

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

**Screenshot checklist:** CloudWatch dashboard `Opportun-AI-t`, log group filter for `pipeline_completed`, DynamoDB `RUN#2026-07-16`, Scheduler schedule ENABLED, and (after SES verify) inbox subject `Opportun-AI-t briefing — 2026-07-16`.

---

## Links & next steps for submission

1. Verify SES → re-run Lambda or wait for 08:00 IST → capture email screenshot.
2. `gh auth login` → create public repo → push → connect Amplify branch for `apps/web`.
3. Paste public repo + Amplify URLs into this article and the Builder Center form.
4. Publish within the challenge window with tag **`#agents`**.

Built for the Weekend Agent Challenge: an agent that shows up for work even when you do not.
