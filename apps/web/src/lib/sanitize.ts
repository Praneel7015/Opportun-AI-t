/**
 * Sanitize outbound job/application URLs before rendering as links.
 * Blocks javascript:, data:, and non-http(s) schemes.
 */
export function sanitizeOutboundUrl(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  // Reject credentials in URL
  if (parsed.username || parsed.password) {
    return null;
  }

  return parsed.toString();
}

export function safeExternalHref(raw: string | undefined | null): string {
  return sanitizeOutboundUrl(raw) ?? "#";
}
