import { NextRequest, NextResponse } from "next/server";
import { runWebsiteOutreachPlanner } from "@/lib/website-outreach";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Accept both Authorization Bearer and legacy x-agent-heartbeat-secret. */
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
    const result = await runWebsiteOutreachPlanner({ persist });
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[website-outreach] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "website_outreach_failed" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
