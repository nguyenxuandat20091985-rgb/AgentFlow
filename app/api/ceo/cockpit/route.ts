import { NextResponse } from "next/server";
import { buildCeoCockpit } from "@/lib/ceo/cockpit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** AI CEO Cockpit — owner read-only orchestration snapshot. Isolated under /api/ceo. */
export async function GET() {
  try {
    const report = await buildCeoCockpit();
    return NextResponse.json(report, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[CEO_COCKPIT]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "CEO cockpit unavailable",
        isolation: "CEO failure must not stop salesbot/marketing heartbeats",
      },
      { status: 503 },
    );
  }
}
