"use client";

import { useState, useTransition } from "react";
import type { SourceConfig, UserProfile } from "@opportun-ai-t/core";
import { JobSourceProvider } from "@opportun-ai-t/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteSourceAction,
  updateProfileAction,
  upsertSourceAction,
} from "@/lib/actions/mutations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMessage(null);
        startTransition(async () => {
          const res = await updateProfileAction({
            displayName: String(fd.get("displayName") ?? ""),
            email: String(fd.get("email") ?? ""),
            headline: String(fd.get("headline") ?? ""),
            targetRoles: String(fd.get("targetRoles") ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            skills: String(fd.get("skills") ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            locations: String(fd.get("locations") ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            remoteOk: fd.get("remoteOk") === "on",
            staleFollowUpDays: Number(fd.get("staleFollowUpDays") ?? 7),
            timezone: String(fd.get("timezone") ?? profile.timezone),
          });
          setMessage(res.ok ? "Profile saved" : res.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={profile.displayName}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={profile.email}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          name="headline"
          defaultValue={profile.headline ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetRoles">Target roles (comma-separated)</Label>
        <Textarea
          id="targetRoles"
          name="targetRoles"
          defaultValue={profile.preferences.targetRoles.join(", ")}
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="skills">Skills (comma-separated)</Label>
        <Textarea
          id="skills"
          name="skills"
          defaultValue={profile.preferences.skills.join(", ")}
          rows={2}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="locations">Locations (comma-separated)</Label>
          <Input
            id="locations"
            name="locations"
            defaultValue={profile.preferences.locations.join(", ")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue={profile.timezone}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="remoteOk"
            defaultChecked={profile.preferences.remoteOk}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Remote OK
        </label>
        <div className="flex items-center gap-2">
          <Label htmlFor="staleFollowUpDays">Stale follow-up (days)</Label>
          <Input
            id="staleFollowUpDays"
            name="staleFollowUpDays"
            type="number"
            min={1}
            max={90}
            className="w-20"
            defaultValue={profile.preferences.staleFollowUpDays}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {message ? (
          <span className="text-xs text-[var(--muted)]">{message}</span>
        ) : null}
      </div>
    </form>
  );
}

export function WatchlistManager({ sources }: { sources: SourceConfig[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [provider, setProvider] = useState<
    typeof JobSourceProvider.GREENHOUSE | typeof JobSourceProvider.LEVER
  >(JobSourceProvider.GREENHOUSE);

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {sources.map((s) => (
          <li
            key={`${s.provider}-${s.boardOrSlug}`}
            className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-3 text-sm first:border-t-2 first:border-t-[var(--ink)]"
          >
            <div>
              <span className="font-medium">
                {s.displayName ?? s.boardOrSlug}
              </span>
              <span className="ml-2 text-[var(--muted)]">
                {s.provider} · {s.boardOrSlug}
                {!s.enabled ? " · disabled" : ""}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await deleteSourceAction({
                    provider: s.provider,
                    boardOrSlug: s.boardOrSlug,
                  });
                  setMessage(res.ok ? "Removed" : res.error);
                });
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>

      <form
        className="grid gap-3 border-y border-[var(--border-strong)] bg-[var(--surface-2)]/50 p-4 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setMessage(null);
          startTransition(async () => {
            const res = await upsertSourceAction({
              provider,
              boardOrSlug: String(fd.get("boardOrSlug") ?? ""),
              displayName: String(fd.get("displayName") ?? ""),
              enabled: true,
            });
            setMessage(res.ok ? "Watchlist updated" : res.error);
            if (res.ok) e.currentTarget.reset();
          });
        }}
      >
        <div className="space-y-1 sm:col-span-1">
          <Label>Provider</Label>
          <Select
            value={provider}
            onValueChange={(v) =>
              setProvider(
                v as
                  | typeof JobSourceProvider.GREENHOUSE
                  | typeof JobSourceProvider.LEVER,
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={JobSourceProvider.GREENHOUSE}>
                Greenhouse
              </SelectItem>
              <SelectItem value={JobSourceProvider.LEVER}>Lever</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-1">
          <Label htmlFor="boardOrSlug">Board slug</Label>
          <Input
            id="boardOrSlug"
            name="boardOrSlug"
            placeholder="stripe"
            required
          />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <Label htmlFor="displayName">Company name</Label>
          <Input
            id="displayName"
            name="displayName"
            placeholder="Stripe"
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full">
            Add board
          </Button>
        </div>
      </form>
      {message ? (
        <p className="text-xs text-[var(--muted)]">{message}</p>
      ) : null}
    </div>
  );
}
