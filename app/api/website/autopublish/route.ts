import { NextRequest, NextResponse } from "next/server";
import { runWebsiteAutopublish } from "@/lib/website-autopublish";

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
    const limit = Number(request.nextUrl.searchParams.get("limit") || 15);
    const report = await runWebsiteAutopublish({ limit });
    return NextResponse.json(report, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[website-autopublish] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "website_autopublish_failed" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
