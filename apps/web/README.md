# Web control center (`@opportun-ai-t/web`)

Next.js 15 App Router dashboard for reviewing autonomous agent output.

## Local demo (no AWS)

```bash
# from repo root
npm run build -w @opportun-ai-t/core
npm run dev -w @opportun-ai-t/web
```

With `TABLE_NAME` unset (or `DEMO_MODE=1`), the server uses an in-memory store preloaded with seed data. Mutations (application status/notes, profile, watchlists, save toggles) persist for the Node process lifetime.

Optional explicit seed refresh:

```bash
npm run seed -w @opportun-ai-t/web
```

## Live DynamoDB

1. Deploy CDK and copy the `TableName` output into root `.env` as `TABLE_NAME`.
2. Ensure AWS credentials can read/write the table.
3. `DEMO_MODE=0 npm run seed -w @opportun-ai-t/web` to write demo items.
4. `npm run dev -w @opportun-ai-t/web`

## Routes

| Path | Purpose |
|------|---------|
| `/` | Dashboard — briefing, run status, trends, top matches, follow-ups |
| `/opportunities` | List/filter (incl. Saved) |
| `/opportunities/[fingerprint]` | Detail + AI reasoning + estimates |
| `/applications` | Status/notes + follow-up draft copy |
| `/reports` | Daily/weekly digests |
| `/reports/[id]` | Report detail (`YYYY-MM-DD` or `week-YYYY-Www`) |
| `/settings` | Profile, watchlists, schedule metadata (display-only) |

All DynamoDB access is server-side only (repositories + server actions). No AWS credentials in client bundles.
