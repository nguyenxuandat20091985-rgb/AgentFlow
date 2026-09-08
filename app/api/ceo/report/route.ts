import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-admin";

const AGENTS = [
  "SalesBot", "SupportAI", "DataAnalyzer", "ContentWriter", "ChatBot",
  "LeadGen", "EmailAI", "SocialMedia", "Analytics", "CRM", "Billing",
  "Inventory", "Research", "Design", "Code", "QA", "HR", "Finance",
  "Marketing", "CustomerService",
];
const PRIMARY = ["salesbot", "marketing"] as const;
const TARGET = 15_000_000;
const HEARTBEAT_MAX_AGE_MS = 10 * 60 * 1000;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!supabaseAdminConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }

    const [ledgerResult, paymentsResult, heartbeatsResult, runsResult] = await Promise.all([
      supabaseAdmin<Array<Record<string, unknown>>>("revenue_ledger?select=amount,agent_id,created_at&order=created_at.desc&limit=500"),
      supabaseAdmin<Array<Record<string, unknown>>>("payment_events?select=id,external_event_id,status,amount,created_at&order=created_at.desc&limit=100"),
      supabaseAdmin<Array<Record<string, unknown>>>("agent_heartbeats?select=agent_id,status,last_seen_at&agent_id=in.(salesbot,marketing)"),
      supabaseAdmin<Array<Record<string, unknown>>>("agent_task_runs?select=id,agent_id,task_type,status,output,created_at&agent_id=in.(salesbot,marketing)&order=created_at.desc&limit=10"),
    ]);

    const ledger = ledgerResult ?? [];
    const payments = paymentsResult ?? [];
    const heartbeats = heartbeatsResult ?? [];
    const runs = runsResult ?? [];
    const successfulPayments = payments.filter((row) => String(row.status || "").toLowerCase() === "success");

    const primary = PRIMARY.map((agentId) => {
      const actual = ledger
        .filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId)
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const transactions = ledger.filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId).length;
      const heartbeat = heartbeats.find((row) => String(row.agent_id ?? "").toLowerCase() === agentId);
      const lastSeen = heartbeat?.last_seen_at ? Date.parse(String(heartbeat.last_seen_at)) : 0;
      const running = heartbeat?.status === "running" && Number.isFinite(lastSeen) && Date.now() - lastSeen <= HEARTBEAT_MAX_AGE_MS;
      const latestRun = runs.find((row) => String(row.agent_id ?? "").toLowerCase() === agentId);
      return {
        agentId,
        name: agentId === "salesbot" ? "SalesBot" : "Marketing",
        target: TARGET,
        actual,
        remaining: Math.max(0, TARGET - actual),
        progress: Math.min(100, actual / TARGET * 100),
        transactions,
        status: running ? "running" : "stopped",
        lastSeen: heartbeat?.last_seen_at ?? null,
        latestRun: latestRun ? { id: latestRun.id, status: latestRun.status, createdAt: latestRun.created_at, output: latestRun.output } : null,
      };
    });

    const totalRevenue = ledger.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const runningCount = heartbeats.filter((row) => {
      const lastSeen = row.last_seen_at ? Date.parse(String(row.last_seen_at)) : 0;
      return row.status === "running" && Number.isFinite(lastSeen) && Date.now() - lastSeen <= HEARTBEAT_MAX_AGE_MS;
    }).length;

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      summary: `AI CEO realtime: ${runningCount}/${AGENTS.length} monitored primary agents active; ${successfulPayments.length} successful payments; verified revenue ${totalRevenue.toLocaleString("vi-VN")} ₫.`,
      metrics: { totalRevenue, successfulPayments: successfulPayments.length, running: runningCount, stopped: PRIMARY.length - runningCount },
      kpis: primary,
      recentRuns: runs,
      financialRule: "Only verified revenue_ledger rows count toward KPI.",
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[CEO_REPORT]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo báo cáo realtime" }, { status: 503 });
  }
}
