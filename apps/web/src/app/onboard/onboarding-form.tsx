"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { saveOnboardingProfileAction } from "@/lib/actions/mutations";

// ---------- validation schemas (client-side) ----------

const step1Schema = z.object({
  displayName: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Enter a valid email address"),
});

const step2Schema = z.object({
  targetRoles: z.string().optional(),
  locations: z.string().optional(),
  workStyle: z.enum(["remote", "hybrid", "onsite"]),
  seniority: z.array(z.string()).min(1, "Select at least one"),
  skills: z.string().optional(),
});

// ---------- types ----------

type WorkStyle = "remote" | "hybrid" | "onsite";
type Seniority = "internship" | "graduate" | "full-time";

interface FormState {
  displayName: string;
  email: string;
  headline: string;
  targetRoles: string;
  locations: string;
  workStyle: WorkStyle;
  seniority: Seniority[];
  skills: string;
}

const SENIORITY_OPTIONS: { value: Seniority; label: string }[] = [
  { value: "internship", label: "Internship" },
  { value: "graduate", label: "Graduate" },
  { value: "full-time", label: "Full-time" },
];

const WORK_STYLE_OPTIONS: { value: WorkStyle; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

function splitTags(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------- step indicators ----------

function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={[
              "h-1.5 rounded-full transition-all duration-300",
              i + 1 === current
                ? "w-8 bg-[var(--accent)]"
                : i + 1 < current
                  ? "w-4 bg-[var(--accent)]"
                  : "w-4 bg-[var(--border-strong)]",
            ].join(" ")}
          />
        </div>
      ))}
      <span className="ml-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {current} / {total}
      </span>
    </div>
  );
}

// ---------- tag chip input ----------

function TagChips({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const tags = splitTags(value);
  return (
    <div className="space-y-1.5">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-block rounded-[3px] border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2 py-0.5 text-[0.72rem] font-semibold text-[var(--accent)]"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- main form component ----------

export function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    displayName: "",
    email: "",
    headline: "",
    targetRoles: "",
    locations: "",
    workStyle: "remote",
    seniority: [],
    skills: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const TOTAL_STEPS = 3;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleSeniority(val: Seniority) {
    const current = form.seniority;
    const next = current.includes(val)
      ? current.filter((s) => s !== val)
      : [...current, val];
    set("seniority", next);
    setErrors((prev) => {
      const next2 = { ...prev };
      delete next2["seniority"];
      return next2;
    });
  }

  function validateStep1(): boolean {
    const result = step1Schema.safeParse({
      displayName: form.displayName,
      email: form.email,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        errs[key] = issue.message;
      }
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  }

  function validateStep2(): boolean {
    const errs: Record<string, string> = {};
    if (form.seniority.length === 0) {
      errs["seniority"] = "Select at least one";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
    setErrors({});
  }

  function handleSubmit() {
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const result = await saveOnboardingProfileAction({
        displayName: form.displayName,
        email: form.email,
        headline: form.headline || undefined,
        targetRoles: splitTags(form.targetRoles),
        skills: splitTags(form.skills),
        locations: splitTags(form.locations),
        remoteOk: form.workStyle !== "onsite",
        seniority: form.seniority,
        timezone: "Asia/Kolkata",
      });
      if (result && !result.ok) {
        setServerError(result.error);
      }
    });
  }

  return (
    <div className="animate-fade-up">
      <Card className="border-[var(--border-strong)] bg-[var(--surface)] shadow-[3px_3px_0_var(--border-strong)]">
        <CardHeader className="border-b border-[var(--border)] pb-5">
          <div className="flex items-center justify-between">
            <p className="page-kicker">Setup</p>
            <StepIndicator current={step} total={TOTAL_STEPS} />
          </div>
          <h2 className="font-display mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--ink)]">
            {step === 1 && "Who are you?"}
            {step === 2 && "Career preferences"}
            {step === 3 && "Notifications & schedule"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {step === 1 &&
              "Your name and email are used to personalise briefings and send daily updates."}
            {step === 2 &&
              "Tell the agent what to look for. You can change this any time in Settings."}
            {step === 3 &&
              "Review your notification setup. The schedule is managed externally via AWS EventBridge."}
          </p>
        </CardHeader>

        <CardContent className="pt-6">
          {/* ---- Step 1: Name & Email ---- */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  placeholder="Praneel"
                  value={form.displayName}
                  onChange={(e) => set("displayName", e.target.value)}
                  aria-invalid={!!errors.displayName}
                />
                {errors.displayName && (
                  <p className="text-xs text-[var(--danger)]">
                    {errors.displayName}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-[var(--danger)]">{errors.email}</p>
                )}
                <p className="text-xs text-[var(--muted)]">
                  This email will be used for daily briefings from the agent.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="headline">
                  Headline{" "}
                  <span className="text-xs font-normal text-[var(--muted)]">
                    optional
                  </span>
                </Label>
                <Input
                  id="headline"
                  placeholder="Final-year CS student · ML & backend"
                  value={form.headline}
                  onChange={(e) => set("headline", e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
          )}

          {/* ---- Step 2: Career preferences ---- */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="targetRoles">Target roles</Label>
                <TagChips
                  value={form.targetRoles}
                  onChange={(v) => set("targetRoles", v)}
                  placeholder="Software Engineer, ML Engineer, Backend Developer"
                />
                <p className="text-xs text-[var(--muted)]">
                  Comma-separated. The agent matches jobs against these titles.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="locations">Preferred locations</Label>
                <TagChips
                  value={form.locations}
                  onChange={(v) => set("locations", v)}
                  placeholder="Bangalore, Remote, Singapore"
                />
                <p className="text-xs text-[var(--muted)]">
                  Comma-separated cities or regions.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Work style</Label>
                <div className="flex gap-2">
                  {WORK_STYLE_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("workStyle", value)}
                      className={[
                        "flex-1 rounded-[3px] border py-2 text-sm font-semibold transition-colors",
                        form.workStyle === value
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-[2px_2px_0_var(--ink)]"
                          : "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-3)]",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Opportunity type
                  {errors.seniority && (
                    <span className="ml-2 text-xs font-normal text-[var(--danger)]">
                      {errors.seniority}
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  {SENIORITY_OPTIONS.map(({ value, label }) => {
                    const active = form.seniority.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleSeniority(value)}
                        className={[
                          "flex-1 rounded-[3px] border py-2 text-sm font-semibold transition-colors",
                          active
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-[2px_2px_0_var(--ink)]"
                            : "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-3)]",
                        ].join(" ")}
                        aria-pressed={active}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="skills">Skills</Label>
                <TagChips
                  value={form.skills}
                  onChange={(v) => set("skills", v)}
                  placeholder="Python, TypeScript, AWS, React"
                />
                <p className="text-xs text-[var(--muted)]">
                  Comma-separated. Used to evaluate job match scores.
                </p>
              </div>
            </div>
          )}

          {/* ---- Step 3: Notification review ---- */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-[4px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Notification email
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">
                      {form.email || (
                        <span className="italic text-[var(--muted)]">
                          (not set)
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="shrink-0 text-xs font-semibold text-[var(--accent)] underline underline-offset-2"
                  >
                    Edit
                  </button>
                </div>

                <div className="border-t border-[var(--border)] pt-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Timezone
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">
                      Asia/Kolkata
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      Read-only — reflects the EventBridge schedule timezone.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[var(--border)] pt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Daily analysis cap
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--ink)]">
                    The agent analyses up to <span className="font-semibold">50 new jobs</span> per
                    run via Bedrock. Older jobs are cached and not re-evaluated.
                    Typical Bedrock cost: &lt;$0.10 per run.
                  </p>
                </div>
              </div>

              <div className="rounded-[4px] border border-[var(--warning-soft)] bg-[var(--warning-soft)] px-4 py-3">
                <p className="text-xs font-semibold text-[var(--warning)]">
                  SES verification note
                </p>
                <p className="mt-0.5 text-xs text-[var(--warning)]">
                  Your email must be verified in AWS SES before briefings can be
                  delivered. This is done separately in the AWS Console — no
                  action needed here.
                </p>
              </div>

              {serverError && (
                <div className="rounded-[4px] border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--danger)]">
                    {serverError}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ---- Navigation ---- */}
          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isPending}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <Button
                type="button"
                onClick={handleNext}
                className="border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-[2px_2px_0_var(--ink)] hover:opacity-90"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-[2px_2px_0_var(--ink)] hover:opacity-90"
              >
                {isPending ? "Saving…" : "Set up my desk →"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
