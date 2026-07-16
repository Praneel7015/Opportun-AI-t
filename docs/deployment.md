# Deployment runbook

## Chosen defaults

| Setting | Value |
|---------|-------|
| Region | `ap-south-1` (Mumbai) |
| Account | `329863774639` |
| SES From/To | `praneelteck@gmail.com` |
| Schedule | Daily 08:00 `Asia/Kolkata` (`opportun-ai-t-daily-8am`, ENABLED) |
| Bedrock | `apac.amazon.nova-lite-v1:0` |
| CloudWatch dashboard | `Opportun-AI-t` (metrics namespace `OpportunAiT`) |
| Amplify app | `Opportun-AI-t` · appId `dy5jhx1jn3iz3` · domain `dy5jhx1jn3iz3.amplifyapp.com` (repo not connected yet) |

## Stack outputs (deployed)

| Output | Value |
|--------|--------|
| TableName | `OpportunAiTStack-OpportunTableE8F45E13-1CZFD8Z85LAQ` |
| LambdaName | `opportun-ai-t-career-agent` |
| LambdaArn | `arn:aws:lambda:ap-south-1:329863774639:function:opportun-ai-t-career-agent` |
| ScheduleName | `opportun-ai-t-daily-8am` |
| DashboardUrl | https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=Opportun-AI-t |
| Log group | `OpportunAiTStack-CareerAgentLogGroupB0706E80-ESCzJrkIaNTk` |

Copy `TABLE_NAME` into repo-root `.env` (gitignored). Never commit credentials.

## Prerequisites checklist

1. AWS CLI credentials for account `329863774639`; `AWS_REGION=ap-south-1`.
2. Copy `.env.example` → `.env` and set emails / model / timezone.
3. **SES**: verify `praneelteck@gmail.com` in `ap-south-1`. Sandbox needs verified From **and** To.  
   **Current status (deploy-submit):** `VerificationStatus=PENDING`, `VerifiedForSendingStatus=false`. Click the SES verification email, then re-check:
   ```bash
   aws sesv2 get-email-identity --email-identity praneelteck@gmail.com --region ap-south-1
   ```
4. **Bedrock**: model access for Nova Lite via inference profile `apac.amazon.nova-lite-v1:0`.
5. **CDK bootstrap** (already done): `cd infra && npx cdk bootstrap aws://329863774639/ap-south-1`

## CDK deploy

```bash
cd infra
npx cdk deploy OpportunAiTStack --require-approval never \
  -c sesFromEmail=praneelteck@gmail.com \
  -c sesToEmail=praneelteck@gmail.com \
  -c scheduleTimezone=Asia/Kolkata \
  -c bedrockModelId=apac.amazon.nova-lite-v1:0
```

Context defaults also live in `infra/cdk.json`.

## Post-deploy smoke

```bash
# Seed profile + Greenhouse/Lever sources (DEMO_MODE=0)
# Ensure TABLE_NAME is set in .env
npm run seed -w @opportun-ai-t/web

# Manual invoke
aws lambda invoke --function-name opportun-ai-t-career-agent \
  --region ap-south-1 --cli-binary-format raw-in-base64-out \
  --payload "{}" out.json
type out.json   # or: Get-Content out.json

# Confirm schedule
aws scheduler get-schedule --name opportun-ai-t-daily-8am --region ap-south-1
```

**Observed controlled run (2026-07-16):** `COMPLETED`, `jobsFetched≈524`, `jobsAnalyzed=10`, `bedrockErrors=0`, `emailSent=false` (SES unverified). Second invoke same day: `skipped: true` / `run_already_completed`.

After SES becomes Verified, delete or wait past the run date and re-invoke (or wait for 08:00 IST) to capture inbox evidence.

### CloudWatch evidence commands

```bash
# Dashboard (screenshot)
# https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=Opportun-AI-t

# Recent structured logs
aws logs filter-log-events \
  --log-group-name "OpportunAiTStack-CareerAgentLogGroupB0706E80-ESCzJrkIaNTk" \
  --region ap-south-1 \
  --filter-pattern "pipeline_completed" \
  --limit 5
```

## Amplify Hosting (GitHub)

Amplify Gen 1 CLI OAuth / `amplify` local CLI is optional. An Amplify **Hosting** app shell already exists:

| Field | Value |
|-------|--------|
| Name | `Opportun-AI-t` |
| App ID | `dy5jhx1jn3iz3` |
| Default domain | `https://dy5jhx1jn3iz3.amplifyapp.com` (live after first successful branch build) |

### Exact user steps (GitHub connect)

1. Ensure the repo is public on GitHub (see below).
2. Open Amplify console → **Opportun-AI-t** → **Hosting** → **Connect branch**.
3. Authorize **GitHub** when prompted (OAuth; cannot be completed unattended without your login).
4. Select repository `Opportun-AI-t` (or your fork) and branch `main`.
5. Build settings — monorepo root with app in `apps/web`. Use the repo `amplify.yml` (committed) or paste:

```yaml
version: 1
applications:
  - appRoot: apps/web
    frontend:
      phases:
        preBuild:
          commands:
            - cd ../..
            - npm ci
            - npm run build -w @opportun-ai-t/core
        build:
          commands:
            - npm run build -w @opportun-ai-t/web
      artifacts:
        baseDirectory: apps/web/.next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

   Prefer Amplify’s **Next.js SSR** hosting detection when offered (App Router). Adjust artifact/`baseDirectory` if the console wizard generates a Next.js SSR template — follow the Amplify Next.js guide for monorepos if the first build fails.

6. **Environment variables** (Hosting → Environment variables). Do **not** set keys starting with `AWS_` (reserved). Suggested:

   | Key | Value |
   |-----|--------|
   | `TABLE_NAME` | `OpportunAiTStack-OpportunTableE8F45E13-1CZFD8Z85LAQ` |
   | `DEMO_MODE` | `0` |
   | `APP_REGION` | `ap-south-1` (do **not** set `AWS_REGION` — Amplify rejects `AWS_*` keys) |

7. Grant the Amplify SSR / compute role **DynamoDB read/write** on the table ARN (IAM). Never commit access keys into the repo or Amplify env for long-lived secrets if a role can be used.
8. Save and deploy; wait for the build; open the Amplify URL.

### Create Amplify app from CLI (already done)

```bash
aws amplify create-app --name "Opportun-AI-t" --region ap-south-1 --platform WEB \
  --environment-variables "TABLE_NAME=...,DEMO_MODE=0"
# Connecting a repository still requires console OAuth.
```

## Public GitHub (not authenticated in this session)

`gh auth status` showed **not logged in**. After you log in:

```bash
cd C:\Users\x390\Projects\Opportun-AI-t
gh auth login
git status
git add -A
git commit -m "Initial Opportun-AI-t challenge MVP"
gh repo create Opportun-AI-t --public --source=. --remote=origin --push
```

Do **not** force-push. Do not commit `.env`.

## Local verification (no deploy)

```bash
npm install
npm run build -w @opportun-ai-t/core
npm test
npm run build -w @opportun-ai-t/agent
npm run build -w @opportun-ai-t/web
npm run agent:dry-run
cd infra && npx cdk synth
```

## Notes

- Do not commit secrets or `.env`.
- `AGENT_DRY_RUN=true` skips live Bedrock/SES (local/fixtures).
- SES PENDING blocks live email proof until Verified — stack and agent still run.
