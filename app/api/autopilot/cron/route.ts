import { NextResponse } from "next/server";
import { planAutopilot } from "@/lib/business-autopilot";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const objective = process.env.AUTOPILOT_OBJECTIVE || "Find compliant opportunities to sell AgentFlow AI products and improve customer conversion.";
  return NextResponse.json({ ok: true, executedAt: new Date().toISOString(), plan: planAutopilot(objective) });
}
