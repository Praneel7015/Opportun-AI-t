"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { JobSourceProvider } from "@opportun-ai-t/core";
import {
  deleteSource,
  setJobSaved,
  updateApplication,
  updateProfile,
  upsertSource,
} from "../db/repositories";
import {
  UpdateApplicationInputSchema,
  UpdateProfileInputSchema,
  UpsertSourceInputSchema,
} from "../domain/mutations";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function updateApplicationAction(
  raw: unknown,
): Promise<ActionResult> {
  const parsed = UpdateApplicationInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    await updateApplication(parsed.data);
    revalidatePath("/applications");
    revalidatePath("/");
    revalidatePath("/opportunities");
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Update failed",
    };
  }
}

export async function updateProfileAction(
  raw: unknown,
): Promise<ActionResult> {
  const parsed = UpdateProfileInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    await updateProfile(parsed.data);
    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Update failed",
    };
  }
}

export async function upsertSourceAction(
  raw: unknown,
): Promise<ActionResult> {
  const parsed = UpsertSourceInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    await upsertSource(parsed.data);
    revalidatePath("/settings");
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Upsert failed",
    };
  }
}

export async function deleteSourceAction(
  raw: unknown,
): Promise<ActionResult> {
  const schema = z.object({
    provider: z.enum([
      JobSourceProvider.GREENHOUSE,
      JobSourceProvider.LEVER,
    ]),
    boardOrSlug: z.string().min(1),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid source key" };
  }
  try {
    await deleteSource(parsed.data.provider, parsed.data.boardOrSlug);
    revalidatePath("/settings");
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Delete failed",
    };
  }
}

export async function toggleSavedAction(
  raw: unknown,
): Promise<ActionResult> {
  const schema = z.object({
    fingerprint: z.string().min(8),
    saved: z.boolean(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid saved toggle" };
  }
  try {
    await setJobSaved(parsed.data.fingerprint, parsed.data.saved);
    revalidatePath("/opportunities");
    revalidatePath(`/opportunities/${parsed.data.fingerprint}`);
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Toggle failed",
    };
  }
}

const OnboardingInputSchema = z.object({
  displayName: z.string().min(1).max(120),
  email: z.string().email(),
  headline: z.string().max(200).optional(),
  targetRoles: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  remoteOk: z.boolean().default(true),
  seniority: z.array(z.string()).default([]),
  timezone: z.string().default("Asia/Kolkata"),
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export async function saveOnboardingProfileAction(
  raw: unknown,
): Promise<ActionResult> {
  const parsed = OnboardingInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    await updateProfile({
      displayName: parsed.data.displayName,
      email: parsed.data.email,
      headline: parsed.data.headline,
      targetRoles: parsed.data.targetRoles,
      skills: parsed.data.skills,
      locations: parsed.data.locations,
      remoteOk: parsed.data.remoteOk,
      timezone: parsed.data.timezone,
    });
    revalidatePath("/");
    revalidatePath("/settings");
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save profile",
    };
  }
  redirect("/");
}
