import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getProfile } from "@/lib/db/repositories";
import { OnboardingForm } from "./onboarding-form";

export const metadata = {
  title: "Set up your desk — OpportunityAI",
};

export const dynamic = "force-dynamic";

export default async function OnboardPage() {
  // If the visitor already has a userId cookie AND an existing profile, skip to dashboard.
  const headersList = await headers();
  const userId = headersList.get("x-user-id")?.trim() || null;
  if (userId) {
    try {
      const profile = await getProfile(userId);
      if (profile) redirect("/");
    } catch {
      // DynamoDB unreachable — allow onboard page to render
    }
  }

  return (
    <div className="mx-auto max-w-[600px] py-10 sm:py-16 animate-fade-up">
      <div className="mb-8">
        <p className="page-kicker mb-3">Welcome</p>
        <h1 className="page-title mb-3">
          Let&rsquo;s set up your desk.
        </h1>
        <p className="text-base text-[var(--muted)] max-w-prose">
          OpportunityAI runs a daily agent that scouts jobs, scores them
          against your profile, and delivers a curated briefing. Takes about
          a minute to configure.
        </p>
      </div>

      <OnboardingForm />

      <p className="mt-6 text-center text-xs text-[var(--muted)]">
        All data is stored in your own AWS DynamoDB table. Nothing leaves your
        infrastructure.
      </p>
    </div>
  );
}
