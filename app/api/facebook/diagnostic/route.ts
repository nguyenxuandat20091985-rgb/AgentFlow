import { NextRequest, NextResponse } from "next/server";
import { validateFacebookPageToken } from "@/lib/facebook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.AGENT_HEARTBEAT_SECRET?.trim();
  if (!expected) return false;
  const suppliedHeader = request.headers.get("x-agent-heartbeat-secret")?.trim();
  const authorization = request.headers.get("authorization")?.trim();
  const suppliedQuery = request.nextUrl.searchParams.get("secret")?.trim();
  return suppliedHeader === expected || authorization === `Bearer ${expected}` || suppliedQuery === expected;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  const facebook = await validateFacebookPageToken();
  return NextResponse.json(
    { ok: true, agentId: "marketing", facebook, checkedAt: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } }
  );
}
