import { NextResponse } from "next/server";
import { planAutopilot } from "@/lib/business-autopilot";
import { runEarningAutopilot } from "@/lib/earning-autopilot";
import { dispatchEarningMissions } from "@/lib/ceo/earning/dispatch-missions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const objective =
    process.env.AUTOPILOT_OBJECTIVE ||
    "Run compliant diversified monetization: affiliate storefront, social traffic, SEO/lead/email drafts; reconcile only verified revenue.";

  try {
    const earning = await runEarningAutopilot(10);
    const missions = await dispatchEarningMissions({ includeDraftOpportunities: true });
    return NextResponse.json(
      {
        ok: true,
        executedAt: new Date().toISOString(),
        mode: "earning-autopilot+missions",
        plan: planAutopilot(objective),
        earning,
        missions: {
          count: missions.results.length,
          enqueued: missions.results.filter((r) => r.action === "enqueued").length,
          skipped: missions.results.filter((r) => r.action === "skipped").length,
          results: missions.results,
        },
        safety: {
          revenue: "Only verified provider records can become revenue.",
          payments: "No bank transfer, withdrawal, or fund movement is automated.",
          promotion: "Owned-site product content + compliant drafts; no fake clicks, orders, reviews, or commissions.",
          agents: "Auto-earning agents enqueue distinct jobs; verified ledger only counts real money.",
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
