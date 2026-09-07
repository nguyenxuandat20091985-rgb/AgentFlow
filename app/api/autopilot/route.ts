import { NextResponse } from "next/server";
import { planAutopilot } from "@/lib/business-autopilot";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body.objective !== "string") return NextResponse.json({ error: "objective must be a string" }, { status: 400 });
    return NextResponse.json({ ok: true, mode: "supervised-autopilot", plan: planAutopilot(body.objective) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create plan" }, { status: 400 });
  }
}
