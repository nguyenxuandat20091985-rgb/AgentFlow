import { NextResponse } from "next/server";
import { FLEET_AGENTS, HEARTBEAT_MAX_AGE_MS, runtimeEnabledAgents } from "@/lib/ceo/fleet";
import { autoEarningMissions, allMissions } from "@/lib/ceo/earning/missions";
import { FACTORY_MODE } from "@/lib/ceo/factory";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const enabled = runtimeEnabledAgents();
    const missions = autoEarningMissions();
    const all = allMissions();

    let heartbeatsOnline = 0;
    let pendingJobs = 0;
    let verifiedRevenueVnd = 0;

    try {
      const supabase = getSupabaseAdmin();
      const ids = enabled.map((a) => a.id);
      const { data: hb } = await supabase
        .from("agent_heartbeats")
        .select("agent_id,status,last_seen_at")
        .in("agent_id", ids);
      const now = Date.now();
      for (const row of hb ?? []) {
        const last = row.last_seen_at ? Date.parse(String(row.last_seen_at)) : 0;
        if (row.status === "running" && Number.isFinite(last) && now - last <= HEARTBEAT_MAX_AGE_MS) {
          heartbeatsOnline += 1;
        }
      }
      const { count } = await supabase
        .from("agent_action_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      pendingJobs = count ?? 0;

      const { data: ledger } = await supabase
        .from("revenue_ledger")
        .select("amount")
        .limit(500);
      verifiedRevenueVnd = (ledger ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
    } catch {
      /* soft */
    }

    return NextResponse.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        factoryMode: FACTORY_MODE,
        fleet: {
          registered: FLEET_AGENTS.length,
          runtimeEnabled: enabled.length,
          heartbeatsOnline,
          heartbeatMaxAgeHours: HEARTBEAT_MAX_AGE_MS / (60 * 60 * 1000),
        },
        missions: {
          total: all.length,
          autoEarning: missions.length,
          byStatus: {
            active_runtime: all.filter((m) => m.status === "active_runtime").length,
            dispatch_ready: all.filter((m) => m.status === "dispatch_ready").length,
            blocked: all.filter((m) => m.status === "blocked").length,
          },
        },
        queue: { pendingJobs },
        verifiedRevenueVnd,
        note: "verifiedRevenueVnd only from revenue_ledger — never inflated by agents",
        links: {
          owner: "https://agentflow-khaki-rho.vercel.app/owner",
          website: "https://agentflow-khaki-rho.vercel.app/website",
          missions: "/api/ceo/missions",
          factory: "/api/ceo/factory",
          report: "/api/ceo/report",
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "status_failed" },
      { status: 503 },
    );
  }
}
