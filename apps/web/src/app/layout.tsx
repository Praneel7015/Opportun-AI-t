import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppNav } from "@/components/layout/app-nav";
import { getProfile } from "@/lib/db/repositories";
import "./globals.css";

const editorial = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OpportunityAI — Daily career brief",
  description: "A personal career operations desk",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const userId = headersList.get("x-user-id")?.trim() || null;

  const isOnboarding = pathname.startsWith("/onboard");
  const isApiRoute = pathname.startsWith("/api/");

  if (!isOnboarding && !isApiRoute) {
    // If there's no userId cookie at all, send straight to onboarding —
    // no DynamoDB call needed.
    if (!userId) {
      redirect("/onboard");
    }

    // Cookie exists — verify the profile is in DynamoDB (catches cases where
    // the cookie outlives a table reset or the profile was never written).
    try {
      const profile = await getProfile(userId);
      if (!profile) {
        redirect("/onboard");
      }
    } catch {
      // DynamoDB unreachable — show app rather than redirect loop
    }
  }

  return (
    <html lang="en" className={`${editorial.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="mx-auto min-h-screen max-w-[1440px] md:grid md:grid-cols-[236px_minmax(0,1fr)]">
          <header className="editorial-rail">
            <div className="md:sticky md:top-0 md:flex md:h-screen md:flex-col">
              <div className="border-b border-[var(--border-strong)] px-5 py-5 md:px-7 md:pb-8 md:pt-9">
                <p className="font-display text-[2rem] font-semibold leading-none tracking-[-0.035em] text-[var(--ink)]">
                  Opportunity<span className="text-[var(--accent)]">AI</span>
                </p>
                <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.19em] text-[var(--muted)]">
                  Daily career brief
                </p>
              </div>
              <AppNav />
              <div className="mt-auto hidden border-t border-[var(--border)] px-7 py-6 text-xs leading-relaxed text-[var(--muted)] md:block">
                <p className="font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
                  Editorial desk
                </p>
                <p className="mt-2">
                  Review matched roles, follow-ups, and hiring signals. Runs are
                  scheduled externally.
                </p>
              </div>
            </div>
          </header>
          <main className="min-w-0 px-4 pb-14 pt-7 sm:px-8 md:px-10 md:pb-20 md:pt-10 lg:px-14">
            <div className="mx-auto max-w-[1080px]">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
