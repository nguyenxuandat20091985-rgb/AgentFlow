import { NextResponse } from "next/server";
import { runCeoWebsiteCycle } from "@/lib/ceo/website-cycle";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(request: Request) {
  const secret = process.env.AGENT_HEARTBEAT_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  const header = request.headers.get("x-agent-heartbeat-secret") || "";
  return auth === `Bearer ${secret}` || header === secret;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const report = await runCeoWebsiteCycle();
    return NextResponse.json({ ok: true, ceo: "AI CEO", mode: "website-cycle", ...report });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
