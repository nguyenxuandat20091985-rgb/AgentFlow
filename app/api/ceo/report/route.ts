import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-admin";
import { facebookPublishingConfigured } from "@/lib/facebook";

const AGENTS = [
  "SalesBot", "SupportAI", "DataAnalyzer", "ContentWriter", "ChatBot",
  "LeadGen", "EmailAI", "SocialMedia", "Analytics", "CRM", "Billing",
  "Inventory", "Research", "Design", "Code", "QA", "HR", "Finance",
  "Marketing", "CustomerService",
];
const PRIMARY = ["salesbot", "marketing"] as const;
const TARGET = 15_000_000;
const HEARTBEAT_MAX_AGE_MS = 10 * 60 * 1000;
const facebookAutoPublishEnabled = () => process.env.FACEBOOK_AUTOPUBLISH_ENABLED !== "false";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!supabaseAdminConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }

    const ids = AGENTS.map((name) => name.toLowerCase());
    const [ledgerResult, paymentsResult, heartbeatsResult, runsResult, queueResult] = await Promise.all([
      supabaseAdmin<Array<Record<string, unknown>>>("revenue_ledger?select=amount,agent_id,created_at&order=created_at.desc&limit=500"),
      supabaseAdmin<Array<Record<string, unknown>>>("payment_events?select=id,external_event_id,status,amount,created_at&order=created_at.desc&limit=100"),
      supabaseAdmin<Array<Record<string, unknown>>>(`agent_heartbeats?select=agent_id,status,last_seen_at&agent_id=in.(${ids.join(",")})`),
      supabaseAdmin<Array<Record<string, unknown>>>("agent_task_runs?select=id,agent_id,task_type,status,output,created_at&order=created_at.desc&limit=50"),
      supabaseAdmin<Array<Record<string, unknown>>>("agent_action_queue?select=id,agent_id,channel,status,action_type,priority,created_at&order=created_at.desc&limit=50"),
    ]);

    const ledger = ledgerResult ?? [];
    const payments = paymentsResult ?? [];
    const heartbeats = heartbeatsResult ?? [];
    const runs = runsResult ?? [];
    const queue = queueResult ?? [];
    const successfulPayments = payments.filter((row) => String(row.status || "").toLowerCase() === "success");

    const heartbeatMap = new Map(heartbeats.map((row) => [String(row.agent_id ?? "").toLowerCase(), row]));
    const runMap = new Map<string, Record<string, unknown>>();
    for (const row of runs) {
      const id = String(row.agent_id ?? "").toLowerCase();
      if (id && !runMap.has(id)) runMap.set(id, row);
    }

    const fleet = AGENTS.map((name) => {
      const agentId = name.toLowerCase();
      const heartbeat = heartbeatMap.get(agentId);
      const lastSeen = heartbeat?.last_seen_at ? Date.parse(String(heartbeat.last_seen_at)) : 0;
      const running = heartbeat?.status === "running" && Number.isFinite(lastSeen) && Date.now() - lastSeen <= HEARTBEAT_MAX_AGE_MS;
      const actual = ledger.filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId).reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const agentRuns = runs.filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId);
      const pendingActions = queue.filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId && String(row.status ?? "") === "pending").length;
      return {
        agentId,
        name,
        role: name === "SalesBot" ? "Website affiliate commerce" : name === "Marketing" ? "Facebook growth & affiliate marketing" : "AI Agent",
        status: running ? "running" : "stopped",
        statusSource: heartbeat ? "heartbeat" : "no-heartbeat",
        lastSeen: heartbeat?.last_seen_at ?? null,
        target: PRIMARY.includes(agentId as (typeof PRIMARY)[number]) ? TARGET : null,
        actual: PRIMARY.includes(agentId as (typeof PRIMARY)[number]) ? actual : 0,
        progress: PRIMARY.includes(agentId as (typeof PRIMARY)[number]) ? Math.min(100, actual / TARGET * 100) : 0,
        remaining: PRIMARY.includes(agentId as (typeof PRIMARY)[number]) ? Math.max(0, TARGET - actual) : null,
        runCount: agentRuns.length,
        pendingActions,
        latestRun: runMap.get(agentId) ? {
          id: runMap.get(agentId)?.id,
          status: runMap.get(agentId)?.status,
          createdAt: runMap.get(agentId)?.created_at,
        } : null,
      };
    });

    const running = fleet.filter((agent) => agent.status === "running");
    const totalRevenue = ledger.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const primaryKpis = fleet.filter((agent) => PRIMARY.includes(agent.agentId as (typeof PRIMARY)[number]));

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      summary: `AI CEO realtime: ${running.length}/${AGENTS.length} AI đang hoạt động; SalesBot và Marketing được theo dõi riêng; ${successfulPayments.length} thanh toán thành công; doanh thu xác thực ${totalRevenue.toLocaleString("vi-VN")} ₫.`,
      metrics: {
        totalAgents: AGENTS.length,
        running: running.length,
        stopped: AGENTS.length - running.length,
        successfulPayments: successfulPayments.length,
        totalRevenue,
        pendingActions: queue.filter((row) => String(row.status ?? "") === "pending").length,
      },
      channels: {
        website: { url: "https://agentflow-khaki-rho.vercel.app/website", ownerAgent: "salesbot", status: "live" },
        facebook: { ownerAgent: "marketing", publisherConfigured: facebookPublishingConfigured(), autoPublish: facebookPublishingConfigured() && facebookAutoPublishEnabled() },
      },
      fleet,
      kpis: primaryKpis,
      recentRuns: runs.slice(0, 20),
      recentActions: queue.slice(0, 20),
      financialRule: "Only verified revenue_ledger rows count toward KPI. Runtime and outreach automation must never invent revenue, orders, commissions or payments.",
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[CEO_REPORT]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo báo cáo realtime" }, { status: 503 });
  }
}
