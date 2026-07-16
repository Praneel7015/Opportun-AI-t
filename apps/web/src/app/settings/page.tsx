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

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [mode, profile, sources] = await Promise.all([
    Promise.resolve(getDataMode()),
    getProfile(),
    listSources(),
  ]);

  const effective = profile ?? DEMO_PROFILE;
  const scheduleTimezone =
    process.env.SCHEDULE_TIMEZONE ?? effective.timezone;
  const scheduleExpression =
    process.env.SCHEDULE_EXPRESSION ?? "cron(0 8 * * ? *)";
  const analysisCap = process.env.ANALYSIS_CAP ?? "10";

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Settings
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Profile, watchlists, and schedule metadata (display-only for the
            agent schedule)
          </p>
        </div>
        <DataModeBadge mode={mode} />
      </div>

      <Card className="animate-fade-up-delay">
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

      <Card className="animate-fade-up-delay">
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

      <Card className="animate-fade-up-delay-2">
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
    </div>
  );
}
