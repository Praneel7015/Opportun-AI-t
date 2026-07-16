# Demo / challenge evidence checklist

Capture these after a real unattended (or one-time) Lambda run in `ap-south-1`. Screenshots go into the Builder Center article.

## Before the run

- [ ] SES identity `praneelteck@gmail.com` shows **Verified** in SES console (`ap-south-1`) — sandbox needs verified From **and** To  
  - **As of deploy-submit:** still **PENDING** / not verified for sending — click the verification email first
- [x] Stack deployed (`OpportunAiTStack`); outputs recorded in `docs/deployment.md` and `.env` (`TABLE_NAME`)
- [x] Profile + Greenhouse/Lever sources seeded (`npm run seed -w @opportun-ai-t/web` with `DEMO_MODE=0`)
- [x] Scheduler enabled: `opportun-ai-t-daily-8am` at 08:00 `Asia/Kolkata`

## Unattended / controlled invoke

- [ ] **EventBridge Scheduler** → schedule → invocation history (Success) — wait for next 08:00 IST or screenshot after it fires
- [x] Controlled invoke (2026-07-16):

```bash
aws lambda invoke --function-name opportun-ai-t-career-agent --region ap-south-1 \
  --cli-binary-format raw-in-base64-out --payload "{}" out.json
```

  Result summary: `COMPLETED`, `jobsFetched=524`, `jobsAnalyzed=10`, `bedrockErrors=0`, `emailSent=false` (SES unverified), `durationMs≈31652`

- [x] Second invoke same calendar day: `skipped: true` / `run_already_completed` (idempotency)

## CloudWatch evidence

**Commands / what to screenshot:**

```bash
# Dashboard URL (open in browser → screenshot widgets)
# https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=Opportun-AI-t

aws logs filter-log-events \
  --log-group-name "OpportunAiTStack-CareerAgentLogGroupB0706E80-ESCzJrkIaNTk" \
  --region ap-south-1 \
  --filter-pattern "pipeline_completed" \
  --limit 5
```

- [ ] Dashboard **`Opportun-AI-t`**: Lambda Invocations / Errors / Duration
- [ ] Same dashboard: **Agent job pipeline (OpportunAiT)** and **Run outcomes / Bedrock / Email**
- [x] Log group exists; `pipeline_completed` emitted with metrics (JobsFetched/New/Analyzed, BedrockErrors=0, EmailSent=0)
- [ ] EMF / custom metrics namespace `OpportunAiT` visible on dashboard graphs
- [ ] Alarms idle (no error/DLQ/run-failed) after a healthy run

## Data + email

- [x] DynamoDB: `RUN#2026-07-16` status `COMPLETED`, jobs + evaluations for the run date
- [ ] SES: sent briefing in inbox — **blocked until SES verified** (`emailError` recorded on run)
- [x] Follow-up drafts (if any) are stored only — not emailed as application follow-ups

## Control center UI

- [ ] Local: `TABLE_NAME=... DEMO_MODE=0 npm run dev:web` against live table
- [x] Amplify live: [https://main.dy5jhx1jn3iz3.amplifyapp.com](https://main.dy5jhx1jn3iz3.amplifyapp.com)
- [ ] Dashboard / Opportunities / Applications / Daily Reports / Settings / Onboarding screenshots

## Local dry-run (no AWS) — optional pre-demo

```bash
npm run agent:dry-run
```

## Submission assets

- [x] Public GitHub: [https://github.com/Praneel7015/Opportun-AI-t](https://github.com/Praneel7015/Opportun-AI-t)
- [x] Amplify public URL: [https://main.dy5jhx1jn3iz3.amplifyapp.com](https://main.dy5jhx1jn3iz3.amplifyapp.com)
- [x] Builder Center article (≥500 words): `docs/builder-center-article.md` — title **Weekend Agent Challenge: Opportun-AI-t**, tag `#agents` (repo + Amplify links filled in)
- [ ] Publish article in Builder Center with `#agents`

## Remaining user actions

1. Click SES verification link for `praneelteck@gmail.com` → confirm Verified → re-invoke Lambda (delete `RUN#YYYY-MM-DD` first if same day already completed) or wait for 08:00 `Asia/Kolkata`.
2. Screenshot Scheduler history + SES inbox (welcome + daily briefing) + CloudWatch dashboard + onboarding → dashboard path.
3. Publish `docs/builder-center-article.md` in Builder Center with tag `#agents`.
