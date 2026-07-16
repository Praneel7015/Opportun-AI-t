import "server-only";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

const COOKIE_NAME = "oai_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Returns the current userId from the cookie, or null if not set.
 * Use this in read-only server contexts (pages, layouts).
 */
export async function getUserId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Returns the current userId, creating a new one if none exists.
 * Only call this in Server Actions (needs cookie writes).
 */
export async function getOrCreateUserId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = nanoid(16);
  jar.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return id;
}

/**
 * Explicitly set the userId cookie (called after onboarding completes so
 * the cookie is guaranteed to exist before the redirect lands).
 */
export async function setUserIdCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export { COOKIE_NAME };
