import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-admin";
import { facebookPublishingConfigured } from "@/lib/facebook";
import { FLEET_AGENTS, HEARTBEAT_MAX_AGE_MS } from "@/lib/ceo/fleet";

const PRIMARY = ["salesbot", "marketing"] as const;
const TARGET = 15_000_000;
const facebookAutoPublishEnabled = () => process.env.FACEBOOK_AUTOPUBLISH_ENABLED !== "false";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    if (!supabaseAdminConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }

    const agents = FLEET_AGENTS.filter((a) => a.id !== "ceo");
    const ids = agents.map((a) => a.id);
    const [ledgerResult, paymentsResult, heartbeatsResult, runsResult, queueResult, publishedResult, ceoReviewRun] =
      await Promise.all([
        supabaseAdmin<Array<Record<string, unknown>>>("revenue_ledger?select=amount,agent_id,created_at&order=created_at.desc&limit=500"),
        supabaseAdmin<Array<Record<string, unknown>>>("payment_events?select=id,external_event_id,status,amount,created_at&order=created_at.desc&limit=100"),
        supabaseAdmin<Array<Record<string, unknown>>>(`agent_heartbeats?select=agent_id,status,last_seen_at&agent_id=in.(${ids.join(",")})`),
        supabaseAdmin<Array<Record<string, unknown>>>("agent_task_runs?select=id,agent_id,task_type,status,output,created_at&order=created_at.desc&limit=50"),
        supabaseAdmin<Array<Record<string, unknown>>>("agent_action_queue?select=id,agent_id,channel,status,action_type,priority,created_at&order=created_at.desc&limit=50"),
        supabaseAdmin<Array<Record<string, unknown>>>("website_published_posts?select=id,slug,title,published_at,published_url,destination_id,status&status=eq.published&order=published_at.desc&limit=20").catch(() => []),
        supabaseAdmin<Array<Record<string, unknown>>>("agent_task_runs?select=id,output,created_at&agent_id=eq.ceo&task_type=eq.outreach_draft_review&order=created_at.desc&limit=1").catch(() => []),
      ]);

    const ledger = ledgerResult ?? [];
    const payments = paymentsResult ?? [];
    const heartbeats = heartbeatsResult ?? [];
    const runs = runsResult ?? [];
    const queue = queueResult ?? [];
    const published = Array.isArray(publishedResult) ? publishedResult : [];
    const successfulPayments = payments.filter((row) => String(row.status || "").toLowerCase() === "success");

    const heartbeatMap = new Map(heartbeats.map((row) => [String(row.agent_id ?? "").toLowerCase(), row]));
    const runMap = new Map<string, Record<string, unknown>>();
    for (const row of runs) {
      const id = String(row.agent_id ?? "").toLowerCase();
      if (id && !runMap.has(id)) runMap.set(id, row);
    }

    const fleet = agents.map((agent) => {
      const agentId = agent.id;
      const heartbeat = heartbeatMap.get(agentId);
      const lastSeen = heartbeat?.last_seen_at ? Date.parse(String(heartbeat.last_seen_at)) : 0;
      const running =
        agent.runtimeEnabled &&
        heartbeat?.status === "running" &&
        Number.isFinite(lastSeen) &&
        Date.now() - lastSeen <= HEARTBEAT_MAX_AGE_MS;
      const actual = ledger
        .filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId)
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const agentRuns = runs.filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId);
      const pendingActions = queue.filter(
        (row) => String(row.agent_id ?? "").toLowerCase() === agentId && String(row.status ?? "") === "pending",
      ).length;
      return {
        agentId,
        name: agent.name,
        role: agent.role,
        channel: agent.channel,
        runtimeEnabled: agent.runtimeEnabled,
        status: running ? "running" : agent.runtimeEnabled ? "stopped" : "disabled",
        statusSource: heartbeat ? "heartbeat" : "no-heartbeat",
        lastSeen: heartbeat?.last_seen_at ?? null,
        target: PRIMARY.includes(agentId as (typeof PRIMARY)[number]) ? TARGET : agent.kpiTarget,
        actual: PRIMARY.includes(agentId as (typeof PRIMARY)[number]) ? actual : 0,
        progress: PRIMARY.includes(agentId as (typeof PRIMARY)[number]) ? Math.min(100, (actual / TARGET) * 100) : 0,
        remaining: PRIMARY.includes(agentId as (typeof PRIMARY)[number]) ? Math.max(0, TARGET - actual) : null,
        runCount: agentRuns.length,
        pendingActions,
        latestRun: runMap.get(agentId)
          ? {
              id: runMap.get(agentId)?.id,
              status: runMap.get(agentId)?.status,
              createdAt: runMap.get(agentId)?.created_at,
            }
          : null,
      };
    });

    const running = fleet.filter((agent) => agent.status === "running");
    const totalRevenue = ledger.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const primaryKpis = fleet.filter((agent) => PRIMARY.includes(agent.agentId as (typeof PRIMARY)[number]));
    const latestCeoReview = Array.isArray(ceoReviewRun) && ceoReviewRun[0] ? ceoReviewRun[0] : null;
    const ownerReport =
      latestCeoReview && latestCeoReview.output && typeof latestCeoReview.output === "object"
        ? String((latestCeoReview.output as Record<string, unknown>).ownerReport ?? "")
        : "";

    return NextResponse.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        summary: `AI CEO realtime: ${running.length}/${agents.length} AI online; ${published.length} bài Tier A; ${successfulPayments.length} thanh toán thành công; doanh thu xác thực ${totalRevenue.toLocaleString("vi-VN")} ₫.`,
        metrics: {
          totalAgents: agents.length,
          running: running.length,
          stopped: agents.length - running.length,
          successfulPayments: successfulPayments.length,
          totalRevenue,
          pendingActions: queue.filter((row) => String(row.status ?? "") === "pending").length,
          publishedTierA: published.length,
          heartbeatMaxAgeHours: HEARTBEAT_MAX_AGE_MS / (60 * 60 * 1000),
        },
        channels: {
          website: {
            url: "https://agentflow-khaki-rho.vercel.app/website",
            postsUrl: "https://agentflow-khaki-rho.vercel.app/website/posts",
            ownerAgent: "salesbot",
            status: "live",
            autoPublishTierA: true,
          },
          facebook: {
            ownerAgent: "marketing",
            publisherConfigured: facebookPublishingConfigured(),
            autoPublish: facebookPublishingConfigured() && facebookAutoPublishEnabled(),
          },
        },
        websitePublishing: {
          tierA: published.slice(0, 15),
          latestOwnerReport: ownerReport || null,
          latestCeoReviewAt: latestCeoReview?.created_at ?? null,
        },
        fleet,
        kpis: primaryKpis,
        recentRuns: runs.slice(0, 20),
        recentActions: queue.slice(0, 20),
        financialRule:
          "Only verified revenue_ledger rows count toward KPI. Runtime and outreach automation must never invent revenue, orders, commissions or payments.",
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[CEO_REPORT]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tạo báo cáo realtime" },
      { status: 503 },
    );
  }
}
