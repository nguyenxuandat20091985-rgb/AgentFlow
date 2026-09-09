import { NextRequest, NextResponse } from "next/server";
import { runCeoOutreachReview } from "@/lib/ceo-outreach-review";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.AGENT_HEARTBEAT_SECRET?.trim();
  if (!expected) return false;
  const legacy = request.headers.get("x-agent-heartbeat-secret")?.trim();
  const authorization = request.headers.get("authorization")?.trim() || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  return legacy === expected || bearer === expected;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const persist = request.nextUrl.searchParams.get("persist") !== "0";
    const limit = Number(request.nextUrl.searchParams.get("limit") || 20);
    const report = await runCeoOutreachReview({ persist, limit });
    return NextResponse.json(report, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[ceo-outreach-review] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "ceo_outreach_review_failed" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
