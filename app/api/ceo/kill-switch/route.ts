import { NextResponse } from "next/server";
import { getFactorySnapshot, isGlobalPaused, setGlobalPaused } from "@/lib/ceo/factory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** In-process kill switch for factory proposals. Does NOT stop salesbot/marketing. */
export async function GET() {
  return NextResponse.json({
    ok: true, globalPaused: isGlobalPaused(),
    note: "Affects factory proposals only. Primary runtime controlled by lib/ceo/fleet.ts.",
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { paused?: boolean; actor?: string };
    if (typeof body.paused !== "boolean") {
      return NextResponse.json({ ok: false, error: "body.paused boolean required" }, { status: 400 });
    }
    const audit = setGlobalPaused(body.paused, body.actor ?? "owner");
    const snapshot = getFactorySnapshot();
    return NextResponse.json({
      ok: true, globalPaused: snapshot.globalPaused, audit,
      note: "Factory paused state updated. Existing salesbot/marketing loops are unaffected.",
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "kill switch failed" }, { status: 500 });
  }
}
