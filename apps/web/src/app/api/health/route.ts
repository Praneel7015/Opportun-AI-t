import { NextResponse } from "next/server";

import { runHealthCheck } from "@/lib/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/health
 * Pipeline status for demo vs DynamoDB, AWS reachability, and agent data.
 */
export async function GET() {
  const report = await runHealthCheck();
  const httpStatus =
    report.status === "ok" ? 200 : report.status === "degraded" ? 200 : 503;

  return NextResponse.json(report, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
