import { NextResponse } from "next/server";

/**
 * POST /api/trigger-run
 *
 * Invokes the career agent Lambda via its Function URL (if configured).
 * Requires LAMBDA_FUNCTION_URL env var to be set (e.g. from Amplify console).
 * Returns immediately — Lambda runs asynchronously.
 *
 * Security: protected by a shared secret (TRIGGER_SECRET) checked as Bearer token.
 * Set the same secret in Amplify env vars and pass it as Authorization: Bearer <secret>.
 */
export async function POST(req: Request) {
  const lambdaUrl = process.env.LAMBDA_FUNCTION_URL?.trim();
  if (!lambdaUrl) {
    return NextResponse.json(
      { ok: false, error: "LAMBDA_FUNCTION_URL not configured" },
      { status: 503 },
    );
  }

  const secret = process.env.TRIGGER_SECRET?.trim();
  if (secret) {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token !== secret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Invoke Lambda Function URL asynchronously (fire-and-forget pattern via
    // the InvocationType: Event equivalent — Lambda URLs are sync by default,
    // so we abort after confirming the invoke landed to avoid waiting for the
    // full ~30s run duration).
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let status = 0;
    try {
      const res = await fetch(lambdaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "manual-trigger", triggeredAt: new Date().toISOString() }),
        signal: controller.signal,
      });
      status = res.status;
    } catch (fetchErr) {
      if ((fetchErr as Error).name === "AbortError") {
        // Timeout is expected — Lambda is still running, that's fine
        return NextResponse.json({ ok: true, async: true, note: "Lambda invoked — running in background" });
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }
    if (status >= 200 && status < 300) {
      return NextResponse.json({ ok: true, async: false });
    }
    return NextResponse.json(
      { ok: false, error: `Lambda returned status ${status}` },
      { status: 502 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Trigger failed" },
      { status: 500 },
    );
  }
}
