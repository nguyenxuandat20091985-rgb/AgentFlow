import { NextRequest, NextResponse } from "next/server";
import { validateFacebookPageToken } from "@/lib/facebook";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = process.env.AGENT_HEARTBEAT_SECRET;
  const auth = request.headers.get("authorization") || "";
  const supplied = request.headers.get("x-agent-heartbeat-secret");
  return Boolean(expected && (supplied === expected || auth === `Bearer ${expected}`));
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const token = await validateFacebookPageToken();
  return NextResponse.json({ ok: true, agentId: "marketing", facebook: token, checkedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
