import { NextResponse } from "next/server";
import { listBusinessUnits, activeBusinessUnits } from "@/lib/ceo/business-units/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") === "1";
  const units = activeOnly ? activeBusinessUnits() : listBusinessUnits();
  return NextResponse.json({
    ok: true,
    units,
    note: "Declarative registry. Active status does not grant new runtime agents — fleet.ts does.",
  });
}
