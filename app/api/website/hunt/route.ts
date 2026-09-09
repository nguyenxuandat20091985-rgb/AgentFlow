import { NextRequest, NextResponse } from "next/server";
import { discoverWebsiteSignals } from "@/lib/website-hunter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.AGENT_HEARTBEAT_SECRET?.trim();
  const supplied = request.headers.get("x-agent-heartbeat-secret")?.trim();
  return Boolean(expected && supplied && supplied === expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const result = await discoverWebsiteSignals();
    return NextResponse.json({ ok: true, agent: "salesbot", channel: "website", mode: "public-signal-discovery", ...result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[website-hunt] failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "website_signal_hunt_failed" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
