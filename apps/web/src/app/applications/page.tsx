import Link from "next/link";
import { ApplicationStatus } from "@opportun-ai-t/core";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplicationEditor } from "@/components/applications/application-editor";
import { CopyDraftButton } from "@/components/applications/copy-draft-button";
import {
  listApplications,
  listFollowUpsForApp,
} from "@/lib/db/repositories";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const applications = await listApplications();
  const active = applications.filter(
    (a) => a.status !== ApplicationStatus.SAVED,
  );

  const followUpsByFp = new Map<
    string,
    Awaited<ReturnType<typeof listFollowUpsForApp>>
  >();
  await Promise.all(
    active.map(async (app) => {
      followUpsByFp.set(
        app.fingerprint,
        await listFollowUpsForApp(app.fingerprint),
      );
    }),
  );

  return (
    <div className="space-y-8">
      <header className="animate-fade-up border-b border-[var(--border-strong)] pb-5">
        <p className="page-kicker">Active pipeline · Working ledger</p>
        <h1 className="page-title mt-4">Applications</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Status, notes, and follow-up draft review (copy only — never auto-sent)
        </p>
      </header>

      <div className="animate-fade-up-delay space-y-4">
        {active.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-[var(--muted)]">
              No applications tracked yet. Save roles from Opportunities or wait
              for the agent to create follow-ups on stale apps.
            </CardContent>
          </Card>
        ) : (
          active.map((app) => {
            const followUps = followUpsByFp.get(app.fingerprint) ?? [];
            const fu = followUps[0];
            return (
              <Card key={app.fingerprint} className="rounded-[3px] border-l-4 border-l-[var(--accent)]">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{app.title}</CardTitle>
                      <CardDescription>
                        {app.company}
                        {app.appliedAt
                          ? ` · applied ${new Date(app.appliedAt).toLocaleDateString()}`
                          : ""}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{app.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ApplicationEditor
                    fingerprint={app.fingerprint}
                    status={app.status}
                    notes={app.notes ?? ""}
                  />
                  <Link
                    href={`/opportunities/${app.fingerprint}`}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    View opportunity →
                  </Link>

                  {fu ? (
                    <div className="rounded-[3px] border-l-4 border-[var(--warning)] bg-[var(--warning-soft)] p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--warning)]">
                          Follow-up draft
                        </p>
                        <CopyDraftButton draftEmail={fu.draftEmail} />
                      </div>
                      <p className="mb-1 text-xs text-[var(--muted)]">
                        {fu.reminder}
                      </p>
                      <p className="mb-2 text-xs text-[var(--muted)]">
                        {fu.suggestedAction}
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-[var(--foreground)]/90">
                        {fu.draftEmail}
                      </pre>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
