"use client";

import { useState, useTransition } from "react";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@opportun-ai-t/core";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateApplicationAction } from "@/lib/actions/mutations";

export function ApplicationEditor({
  fingerprint,
  status,
  notes,
}: {
  fingerprint: string;
  status: ApplicationStatus;
  notes: string;
}) {
  const [nextStatus, setNextStatus] = useState(status);
  const [nextNotes, setNextNotes] = useState(notes);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-4 border-y border-[var(--border)] bg-[var(--surface-2)]/50 p-4 lg:grid-cols-[minmax(180px,.45fr)_1fr]">
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={nextStatus}
          onValueChange={(v) => setNextStatus(v as ApplicationStatus)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPLICATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`notes-${fingerprint}`}>Notes</Label>
        <Textarea
          id={`notes-${fingerprint}`}
          value={nextNotes}
          onChange={(e) => setNextNotes(e.target.value)}
          rows={4}
        />
      </div>
      <div className="flex items-center gap-3 lg:col-span-2">
        <Button
          disabled={pending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const res = await updateApplicationAction({
                fingerprint,
                status: nextStatus,
                notes: nextNotes,
              });
              setMessage(res.ok ? "Saved" : res.error);
            });
          }}
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {message ? (
          <span className="text-xs text-[var(--muted)]">{message}</span>
        ) : null}
      </div>
    </div>
  );
}
