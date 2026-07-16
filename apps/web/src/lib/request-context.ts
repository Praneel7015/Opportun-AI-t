import "server-only";
import { headers } from "next/headers";
import { DEFAULT_USER_ID } from "@opportun-ai-t/core";

/**
 * Reads the current userId from the `x-user-id` header injected by middleware.
 * Falls back to DEFAULT_USER_ID so single-user deployments still work.
 */
export async function getRequestUserId(): Promise<string> {
  const h = await headers();
  const uid = h.get("x-user-id");
  return uid?.trim() || DEFAULT_USER_ID;
}
