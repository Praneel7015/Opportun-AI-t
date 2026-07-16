# Opportun-AI-t

Single-user autonomous career agent for the Weekend Agent Challenge: EventBridge Scheduler invokes a Lambda daily, Bedrock Nova evaluates jobs, DynamoDB persists results, SES sends a briefing, and a Next.js control center displays the work.

## Deploy status (ap-south-1)

| Item | Status |
|------|--------|
| CDK stack `OpportunAiTStack` | **Deployed** |
| DynamoDB `TABLE_NAME` | `OpportunAiTStack-OpportunTableE8F45E13-1CZFD8Z85LAQ` |
| Lambda | `opportun-ai-t-career-agent` |
| Schedule | `opportun-ai-t-daily-8am` ENABLED · 08:00 `Asia/Kolkata` |
| CloudWatch | Dashboard [Opportun-AI-t](https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=Opportun-AI-t) |
| Controlled invoke 2026-07-16 | **COMPLETED** · 10 jobs analyzed · Bedrock OK · email blocked (SES PENDING) |
| SES `praneelteck@gmail.com` | **PENDING** — verify before live email proof |
| Amplify app | Created (`dy5jhx1jn3iz3`) — GitHub branch not connected yet |
| Public GitHub | Pending (`gh auth login`) |

Details: [`docs/deployment.md`](docs/deployment.md) · evidence: [`docs/demo-checklist.md`](docs/demo-checklist.md) · article: [`docs/builder-center-article.md`](docs/builder-center-article.md)

## Monorepo layout

| Path | Package | Role |
|------|---------|------|
| `apps/web` | `@opportun-ai-t/web` | Next.js 15 control center (App Router, Tailwind) |
| `services/agent` | `@opportun-ai-t/agent` | Career agent Lambda handler |
| `packages/core` | `@opportun-ai-t/core` | Shared Zod schemas / domain types |
| `infra` | `@opportun-ai-t/infra` | AWS CDK (Scheduler, Lambda, DynamoDB, SES IAM, CloudWatch) |
| `docs/` | — | Architecture, deployment, demo checklist, Builder Center article |

## Prerequisites

- Node.js 20+
- AWS CLI configured (for deploy; not required for `cdk synth` or unit tests)
- AWS CDK CLI via `npx cdk` (installed in `infra`)

## Quick start

```bash
# From repo root
npm install
npm run build -w @opportun-ai-t/core
npm test
npm run agent:dry-run          # fixture pipeline, no Bedrock/SES/DynamoDB

# Synthesize CloudFormation (no deploy)
npm run synth

# Local web app (demo data when TABLE_NAME unset)
npm run dev:web
```

Copy `.env.example` to `.env` and fill in region (`ap-south-1`), Bedrock model id (`apac.amazon.nova-lite-v1:0`), SES addresses, timezone (`Asia/Kolkata`), and analysis cap. After CDK deploy, set `TABLE_NAME` from stack outputs.

## Demo against the live stack

```bash
# Seed profile + sources into DynamoDB
npm run seed -w @opportun-ai-t/web

# One-shot agent run
aws lambda invoke --function-name opportun-ai-t-career-agent \
  --region ap-south-1 --cli-binary-format raw-in-base64-out \
  --payload "{}" out.json

# Control center against live table
# TABLE_NAME=... DEMO_MODE=0 npm run dev:web
```

## Infrastructure notes

- **Region / schedule**: `ap-south-1`, daily 08:00 `Asia/Kolkata`
- **SES**: Verify sender and recipient in SES. Sandbox requires both; same address is fine. See `docs/deployment.md`.
- **Bedrock**: Use inference profile `apac.amazon.nova-lite-v1:0`.
- **Observability**: CloudWatch dashboard `Opportun-AI-t`, EMF namespace `OpportunAiT`.
- **Amplify + GitHub**: app shell ready; connect repo in console (OAuth). See `docs/deployment.md`.

## Phase status

- Phase 1–3: scaffold, agent, dashboard, observability — complete
- Phase 4: CDK deploy + controlled invoke + article + Amplify shell — complete (SES verify, GitHub push, Amplify connect remain for you)

See `docs/architecture.md` and `packages/core/README.md` for data model details.
