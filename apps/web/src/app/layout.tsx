import type { Metadata } from "next";
import { IBM_Plex_Sans, Sora } from "next/font/google";
import { AppNav } from "@/components/layout/app-nav";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Opportun-AI-t",
  description: "Autonomous career agent control center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${plex.variable}`}>
      <body
        className="atmosphere min-h-screen antialiased"
        style={{ fontFamily: "var(--font-body), ui-sans-serif, system-ui" }}
      >
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
          <header className="mb-8 border-b border-[var(--border)] pb-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p
                  className="text-2xl font-semibold tracking-tight text-[var(--accent)] sm:text-3xl"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  Opportun-AI-t
                </p>
                <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
                  Personal AI recruiter control center — review autonomous
                  briefings, matches, and follow-ups. The dashboard never starts
                  a run.
                </p>
              </div>
            </div>
            <AppNav />
          </header>
          <main className="flex-1 pb-12">{children}</main>
        </div>
      </body>
    </html>
  );
}
