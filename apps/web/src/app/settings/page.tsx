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
import { getRequestUserId } from "@/lib/request-context";
import { DEMO_PROFILE } from "@/lib/data/demo-seed";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await getRequestUserId();
  const [mode, profile, sources] = await Promise.all([
    Promise.resolve(getDataMode()),
    getProfile(userId),
    listSources(userId),
  ]);

  // Use real profile for the form; only fall back to DEMO_PROFILE values for
  // schedule metadata (staleFollowUpDays) so the card always shows something sensible.
  const scheduleTimezone =
    process.env.SCHEDULE_TIMEZONE ?? profile?.timezone ?? DEMO_PROFILE.timezone;
  const scheduleExpression =
    process.env.SCHEDULE_EXPRESSION ?? "cron(0 8 * * ? *)";
  const analysisCap = process.env.ANALYSIS_CAP ?? "10";
  const staleFollowUpDays =
    profile?.preferences.staleFollowUpDays ?? DEMO_PROFILE.preferences.staleFollowUpDays;

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
          {!profile && (
            <p className="mb-4 text-xs text-[var(--muted)]">
              Defaults shown — complete onboarding to personalise your profile.
            </p>
          )}
          <ProfileForm profile={profile ?? DEMO_PROFILE} />
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
                {staleFollowUpDays} days
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
