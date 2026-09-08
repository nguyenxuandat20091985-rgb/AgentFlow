import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AGENTS = ["salesbot", "marketing"] as const;
const TARGET = 15_000_000;
const MAX_AGE = 10 * 60 * 1000;

function authorized(request: NextRequest) {
  const expected = process.env.AGENT_HEARTBEAT_SECRET;
  const supplied = request.headers.get("x-agent-heartbeat-secret");
  return Boolean(expected && supplied && supplied === expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const supabase = getSupabaseAdmin();
    const [{ data: ledger, error: ledgerError }, { data: heartbeats, error: heartbeatError }, { data: runs, error: runsError }] = await Promise.all([
      supabase.from("revenue_ledger").select("amount,agent_id,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("agent_heartbeats").select("agent_id,status,last_seen_at").in("agent_id", AGENTS),
      supabase.from("agent_task_runs").select("id,agent_id,task_type,status,created_at,output").in("agent_id", AGENTS).order("created_at", { ascending: false }).limit(20),
    ]);
    if (ledgerError) throw ledgerError;
    if (heartbeatError) throw heartbeatError;
    if (runsError) throw runsError;

    const kpis = AGENTS.map((agentId) => {
      const rows = (ledger ?? []).filter((r) => String(r.agent_id ?? "").toLowerCase() === agentId);
      const actual = rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
      const hb = (heartbeats ?? []).find((r) => String(r.agent_id ?? "").toLowerCase() === agentId);
      const lastSeen = hb?.last_seen_at ? Date.parse(String(hb.last_seen_at)) : 0;
      const running = hb?.status === "running" && Number.isFinite(lastSeen) && Date.now() - lastSeen <= MAX_AGE;
      const latestRun = (runs ?? []).find((r) => String(r.agent_id ?? "").toLowerCase() === agentId);
      return { agentId, target: TARGET, actual, remaining: Math.max(0, TARGET - actual), progress: Math.min(100, actual / TARGET * 100), transactions: rows.length, status: running ? "running" : "stopped", lastSeen: hb?.last_seen_at ?? null, latestRun: latestRun ? { id: latestRun.id, status: latestRun.status, taskType: latestRun.task_type, createdAt: latestRun.created_at } : null };
    });

    return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), kpis, financialSource: "revenue_ledger (verified payment flow only)" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[revenue-automation] status failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "automation_status_failed" }, { status: 503 });
  }
}
