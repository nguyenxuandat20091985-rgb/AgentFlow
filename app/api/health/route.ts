import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "agentflow",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  }, { headers: { "cache-control": "no-store" } });
}
