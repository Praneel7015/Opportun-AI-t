# Infrastructure (AWS CDK)

Default target region: **ap-south-1** (Mumbai). Schedule timezone: **Asia/Kolkata** (daily 08:00).

Synthesize without deploying:

```bash
cd infra
npx cdk synth
```

Bootstrap (once per account/region) before first deploy:

```bash
npx cdk bootstrap aws://ACCOUNT_ID/ap-south-1
```

## Parameters / context

| Key | Default | Notes |
|-----|---------|-------|
| `SesFromEmail` / `-c sesFromEmail` | `praneelteck@gmail.com` | Must be verified in SES |
| `SesToEmail` / `-c sesToEmail` | `praneelteck@gmail.com` | Must be verified in sandbox |
| `scheduleTimezone` | `Asia/Kolkata` | IANA tz for 08:00 daily cron |
| `bedrockModelId` | `apac.amazon.nova-lite-v1:0` | APAC inference profile (required for on-demand Nova Lite in ap-south-1) |
| `analysisCap` | `10` | Per-run Bedrock analysis limit |

SES identities are **not** provisioned by this stack — verify in SES (console or CLI) before deploy.

## Amplify + GitHub

Hosting plan: connect **AWS Amplify Hosting** to the GitHub repo in a later deploy phase (user choice: yes). Not configured in this CDK stack.
