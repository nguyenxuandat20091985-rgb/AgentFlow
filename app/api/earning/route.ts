import { NextResponse } from "next/server";
import { getEarningSnapshot } from "@/lib/earning-engine";

export function GET() {
  return NextResponse.json(getEarningSnapshot(), { headers: { "cache-control": "no-store" } });
}
