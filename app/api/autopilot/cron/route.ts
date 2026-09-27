import { NextResponse } from "next/server";
import { planAutopilot } from "@/lib/business-autopilot";
import { runEarningAutopilot } from "@/lib/earning-autopilot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const objective =
    process.env.AUTOPILOT_OBJECTIVE ||
    "Run compliant affiliate commerce: select live products, publish useful product content with tracked links, and reconcile only verified revenue.";

  try {
    const earning = await runEarningAutopilot(10);
    return NextResponse.json(
      {
        ok: true,
        executedAt: new Date().toISOString(),
        mode: "earning-autopilot",
        plan: planAutopilot(objective),
        earning,
        safety: {
          revenue: "Only verified provider records can become revenue.",
          payments: "No bank transfer, withdrawal, or fund movement is automated.",
          promotion: "Owned-site product content only; no fake clicks, orders, reviews, or commissions.",
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[autopilot-cron] earning run failed", error);
    return NextResponse.json(
      {
        ok: false,
        executedAt: new Date().toISOString(),
        mode: "earning-autopilot",
        error: error instanceof Error ? error.message : "earning_autopilot_failed",
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
