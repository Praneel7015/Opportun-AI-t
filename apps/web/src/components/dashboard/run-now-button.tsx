"use client";

import { useState, useTransition } from "react";

export function RunNowButton() {
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const secret = process.env.NEXT_PUBLIC_TRIGGER_SECRET ?? "";

  function handleClick() {
    setStatus("idle");
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/trigger-run", {
          method: "POST",
          headers: secret ? { Authorization: `Bearer ${secret}` } : {},
        });
        const json = (await res.json()) as { ok: boolean; error?: string; note?: string };
        if (json.ok) {
          setStatus("ok");
          setMessage(json.note ?? "Run triggered — check back in a minute.");
        } else {
          setStatus("error");
          setMessage(json.error ?? "Trigger failed.");
        }
      } catch {
        setStatus("error");
        setMessage("Could not reach the trigger endpoint.");
      }
    });
  }

  if (!process.env.NEXT_PUBLIC_HAS_LAMBDA_URL) return null;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || status === "ok"}
        className="inline-flex items-center gap-2 rounded-[3px] border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink)] transition-colors hover:bg-[var(--surface-3)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        {isPending ? (
          <>
            <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Triggering…
          </>
        ) : status === "ok" ? (
          "✓ Triggered"
        ) : (
          "Run now"
        )}
      </button>
      {message && (
        <p className={`text-xs ${status === "error" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
