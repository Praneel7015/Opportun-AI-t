# `@opportun-ai-t/core`

Shared Zod schemas, DynamoDB single-table key helpers, job fingerprints, and dedupe/follow-up policy used by:

- `services/agent` (Lambda pipeline)
- `apps/web` (control center reads/writes)

Import from `@opportun-ai-t/core` after `npm run build -w @opportun-ai-t/core`.

## DynamoDB item shapes

Table keys: `PK` / `SK` (primary), `GSI1PK` / `GSI1SK` (status queries), `GSI2PK` / `GSI2SK` (entity + date).

Single-user MVP: `userId = "default"` → partition `USER#default`.

| Entity | PK | SK | GSI1 | GSI2 |
|--------|----|----|------|------|
| Profile | `USER#default` | `PROFILE` | — | — |
| Source | `USER#default` | `SOURCE#{provider}#{boardOrSlug}` | — | — |
| Job | `JOB#{fingerprint}` | `META` | — | `ENTITY#JOB` / `DATE#{discoveredAt}#{fingerprint}` |
| Evaluation | `JOB#{fingerprint}` | `EVAL#{runDate}` | — | `ENTITY#EVALUATION` / `DATE#{runDate}#{fingerprint}` |
| Application | `APP#{fingerprint}` | `META` | `APP#STATUS#{status}` / `DATE#{updatedAt}#{fingerprint}` | `ENTITY#APPLICATION` / `DATE#{updatedAt}#{fingerprint}` |
| Follow-up draft | `APP#{fingerprint}` | `FOLLOWUP#{createdAt}` | — | `ENTITY#FOLLOWUP` / `DATE#{createdAt}#{fingerprint}` |
| Run | `RUN#{YYYY-MM-DD}` | `META` | — | `ENTITY#RUN` / `DATE#{YYYY-MM-DD}` |
| Daily report | `REPORT#{YYYY-MM-DD}` | `DAILY` | — | `ENTITY#REPORT` / `DATE#{YYYY-MM-DD}#DAILY` |
| Weekly trend | `REPORT#WEEK#{YYYY-Www}` | `WEEKLY` | — | `ENTITY#REPORT` / `WEEK#{YYYY-Www}` |

Every item also stores `entityType` matching the Zod schema (`PROFILE`, `SOURCE`, `JOB`, …).

Use helpers from `keys.ts` (`profileKeys`, `jobKeysWithDate`, `applicationKeys`, `runKeys`, …) and `QueryPrefixes` for Query `begins_with` / GSI patterns.

## Access patterns (dashboard)

| Need | How |
|------|-----|
| Load profile | `GetItem` `USER#default` / `PROFILE` |
| List sources | `Query` PK=`USER#default`, SK `begins_with` `SOURCE#` |
| List recent jobs | `Query` GSI2 `ENTITY#JOB`, SK descending |
| Job + latest eval | `GetItem` job; `Query` PK=`JOB#{fp}` SK `begins_with` `EVAL#` |
| Applications by status | `Query` GSI1 `APP#STATUS#{status}` |
| All applications | `Query` GSI2 `ENTITY#APPLICATION` |
| Follow-ups for app | `Query` PK=`APP#{fp}` SK `begins_with` `FOLLOWUP#` |
| Latest run / report | `GetItem` `RUN#{date}` / `REPORT#{date}` or GSI2 `ENTITY#RUN` / `ENTITY#REPORT` |

## Application statuses

`Saved` | `Applied` | `OA Received` | `Interview` | `Offer` | `Rejected` | `Ghosted` | `Withdrawn`

## Idempotency (agent)

- One logical run per **local calendar date** in `SCHEDULE_TIMEZONE` (`RUN#{YYYY-MM-DD}`).
- If run `status === COMPLETED` (or `emailSentAt` set), the Lambda exits without re-fetching, re-analyzing, or re-sending SES.
- New jobs are written with conditional `attribute_not_exists(PK)` so retries do not duplicate.

## Estimates

`companyInference` / `stackInference` on evaluations are **estimates** (`isEstimate: true`). Surface them as such in the UI — not verified facts.

## Fingerprints

`computeJobFingerprint({ provider, boardOrSlug, externalId?, company, title, location?, absoluteUrl? })` — prefers `provider|board|externalId` when present.
