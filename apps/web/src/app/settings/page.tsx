import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataModeBadge } from "@/components/shared/meta";
import {
  ProfileForm,
  WatchlistManager,
} from "@/components/settings/settings-forms";
import {
  getDataMode,
  getProfile,
  listSources,
} from "@/lib/db/repositories";
import { DEMO_PROFILE } from "@/lib/data/demo-seed";
import { runHealthCheck } from "@/lib/health";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [mode, profile, sources, health] = await Promise.all([
    Promise.resolve(getDataMode()),
    getProfile(),
    listSources(),
    runHealthCheck(),
  ]);

  const effective = profile ?? DEMO_PROFILE;
  const scheduleTimezone =
    process.env.SCHEDULE_TIMEZONE ?? effective.timezone;
  const scheduleExpression =
    process.env.SCHEDULE_EXPRESSION ?? "cron(0 8 * * ? *)";
  const analysisCap = process.env.ANALYSIS_CAP ?? "10";

  return (
    <div className="space-y-8">
      <header className="animate-fade-up flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-strong)] pb-5">
        <div>
          <p className="page-kicker">Personal desk · Configuration</p>
          <h1 className="page-title mt-4">Settings</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Profile, watchlists, and display-only schedule metadata.
          </p>
        </div>
        <DataModeBadge mode={mode} />
      </header>

      <Card className="animate-fade-up-delay rounded-none border-x-0 border-b-0 border-t-2 border-t-[var(--ink)] bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>Profile & preferences</CardTitle>
          <CardDescription>
            Used by the agent for matching and stale follow-up policy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={effective} />
        </CardContent>
      </Card>

      <Card className="animate-fade-up-delay rounded-none border-x-0 border-b-0 border-t-2 border-t-[var(--ink)] bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>Company watchlists</CardTitle>
          <CardDescription>
            Greenhouse and Lever public board slugs the agent polls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WatchlistManager sources={sources} />
        </CardContent>
      </Card>

      <Card className="animate-fade-up-delay-2 rounded-none border-x-0 border-b-0 border-t-2 border-t-[var(--ink)] bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>Notification & schedule</CardTitle>
          <CardDescription>
            Configured in AWS EventBridge Scheduler — shown here for reference.
            This UI does not start or stop the agent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--muted)]">Local notification time</dt>
              <dd className="font-medium">08:00</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Timezone</dt>
              <dd className="font-medium">{scheduleTimezone}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Schedule expression</dt>
              <dd className="font-mono text-xs">{scheduleExpression}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Schedule name</dt>
              <dd className="font-mono text-xs">opportun-ai-t-daily-8am</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Analysis cap / run</dt>
              <dd className="font-medium">{analysisCap}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Stale follow-up threshold</dt>
              <dd className="font-medium">
                {effective.preferences.staleFollowUpDays} days
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="animate-fade-up-delay-2 rounded-none border-x-0 border-b-0 border-t-2 border-t-[var(--ink)] bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>System health</CardTitle>
          <CardDescription>
            Live pipeline probe — also available as{" "}
            <a
              href="/api/health"
              className="underline underline-offset-2 hover:text-[var(--ink)]"
            >
              /api/health
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium uppercase tracking-wide">
              Status: {health.status}
            </span>
            <span className="text-[var(--muted)]">mode={health.mode}</span>
            <span className="text-[var(--muted)]">region={health.region}</span>
          </div>
          <ul className="space-y-2">
            {health.checks.map((check) => (
              <li
                key={check.name}
                className="border-b border-[var(--border)] pb-2 last:border-0"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="font-mono text-xs uppercase">
                    {check.status}
                  </span>
                  <span className="font-medium">{check.name}</span>
                  {check.latencyMs !== undefined ? (
                    <span className="text-[var(--muted)]">
                      {check.latencyMs}ms
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[var(--muted)]">{check.detail}</p>
              </li>
            ))}
          </ul>
          {health.diagnosis.length > 0 ? (
            <div>
              <p className="mb-1 font-medium">Diagnosis</p>
              <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
                {health.diagnosis.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
