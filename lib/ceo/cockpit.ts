import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-admin";
import {
  CEO_ISOLATION_RULES,
  FLEET_AGENTS,
  HEARTBEAT_MAX_AGE_MS,
  runtimeEnabledAgents,
} from "./fleet";

type Hb = { agent_id?: string | null; status?: string | null; last_seen_at?: string | null };
type Run = {
  id?: string;
  agent_id?: string | null;
  task_type?: string | null;
  status?: string | null;
  output?: unknown;
  created_at?: string | null;
};
type Queue = {
  id?: string;
  agent_id?: string | null;
  channel?: string | null;
  status?: string | null;
  action_type?: string | null;
  priority?: string | null;
  created_at?: string | null;
};
type Ledger = { amount?: number | string | null; agent_id?: string | null; created_at?: string | null };
type Published = {
  id?: string;
  slug?: string | null;
  title?: string | null;
  published_at?: string | null;
  published_url?: string | null;
};

function isRunning(hb: Hb | undefined): boolean {
  if (!hb || hb.status !== "running" || !hb.last_seen_at) return false;
  const t = Date.parse(String(hb.last_seen_at));
  return Number.isFinite(t) && Date.now() - t <= HEARTBEAT_MAX_AGE_MS;
}

export type CeoCockpitReport = {
  ok: true;
  ceo: "AI CEO";
  mode: "cockpit-orchestrator";
  generatedAt: string;
  summary: string;
  ownerBrief: string;
  metrics: {
    fleetSize: number;
    runtimeEnabled: number;
    running: number;
    degraded: number;
    registryOnly: number;
    pendingActions: number;
    publishedTierA: number;
    verifiedRevenue: number;
  };
  alerts: Array<{ level: "info" | "warn" | "critical"; code: string; message: string }>;
  agents: Array<{
    id: string;
    name: string;
    domain: string;
    channel: string;
    runtimeEnabled: boolean;
    dispatchEnabled: boolean;
    status: "running" | "stopped" | "registry_only" | "orchestrator";
    lastSeen: string | null;
    pendingActions: number;
    recentRuns: number;
    kpiTarget: number | null;
    kpiActual: number;
    kpiProgress: number;
    role: string;
    branchHint: string;
  }>;
  channels: {
    website: { live: boolean; postsUrl: string; autoPublishTierA: boolean };
    facebook: { live: boolean; note: string };
  };
  recentPublished: Published[];
  latestCeoOutreachReport: string | null;
  isolationRules: readonly string[];
};

export async function buildCeoCockpit(): Promise<CeoCockpitReport> {
  if (!supabaseAdminConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const ids = FLEET_AGENTS.map((a) => a.id).filter((id) => id !== "ceo");
  const [heartbeats, runs, queue, ledger, published, ceoReview] = await Promise.all([
    supabaseAdmin<Hb[]>(`agent_heartbeats?select=agent_id,status,last_seen_at&agent_id=in.(${ids.join(",")})`).catch(() => []),
    supabaseAdmin<Run[]>("agent_task_runs?select=id,agent_id,task_type,status,output,created_at&order=created_at.desc&limit=80").catch(() => []),
    supabaseAdmin<Queue[]>("agent_action_queue?select=id,agent_id,channel,status,action_type,priority,created_at&order=created_at.desc&limit=100").catch(() => []),
    supabaseAdmin<Ledger[]>("revenue_ledger?select=amount,agent_id,created_at&order=created_at.desc&limit=500").catch(() => []),
    supabaseAdmin<Published[]>("website_published_posts?select=id,slug,title,published_at,published_url&status=eq.published&order=published_at.desc&limit=10").catch(() => []),
    supabaseAdmin<Run[]>("agent_task_runs?select=id,output,created_at&agent_id=eq.ceo&task_type=eq.outreach_draft_review&order=created_at.desc&limit=1").catch(() => []),
  ]);

  const hbMap = new Map((heartbeats ?? []).map((h) => [String(h.agent_id ?? "").toLowerCase(), h]));
  const ledgerRows = ledger ?? [];
  const queueRows = queue ?? [];
  const runRows = runs ?? [];
  const publishedRows = Array.isArray(published) ? published : [];

  const agents = FLEET_AGENTS.map((def) => {
    if (def.id === "ceo") {
      return {
        id: def.id,
        name: def.name,
        domain: def.domain,
        channel: def.channel,
        runtimeEnabled: def.runtimeEnabled,
        dispatchEnabled: def.dispatchEnabled,
        status: "orchestrator" as const,
        lastSeen: null,
        pendingActions: 0,
        recentRuns: runRows.filter((r) => String(r.agent_id ?? "").toLowerCase() === "ceo").length,
        kpiTarget: null,
        kpiActual: 0,
        kpiProgress: 0,
        role: def.role,
        branchHint: def.branchHint,
      };
    }

    const hb = hbMap.get(def.id);
    const running = isRunning(hb);
    const actual = ledgerRows
      .filter((r) => String(r.agent_id ?? "").toLowerCase() === def.id)
      .reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const pendingActions = queueRows.filter(
      (q) => String(q.agent_id ?? "").toLowerCase() === def.id && String(q.status ?? "") === "pending",
    ).length;
    const recentRuns = runRows.filter((r) => String(r.agent_id ?? "").toLowerCase() === def.id).length;
    const target = def.kpiTarget;
    const progress = target ? Math.min(100, (actual / target) * 100) : 0;

    let status: "running" | "stopped" | "registry_only" = "registry_only";
    if (def.runtimeEnabled) status = running ? "running" : "stopped";

    return {
      id: def.id,
      name: def.name,
      domain: def.domain,
      channel: def.channel,
      runtimeEnabled: def.runtimeEnabled,
      dispatchEnabled: def.dispatchEnabled,
      status,
      lastSeen: hb?.last_seen_at ? String(hb.last_seen_at) : null,
      pendingActions,
      recentRuns,
      kpiTarget: target,
      kpiActual: actual,
      kpiProgress: progress,
      role: def.role,
      branchHint: def.branchHint,
    };
  });

  const runtimeAgents = agents.filter((a) => a.runtimeEnabled);
  const running = runtimeAgents.filter((a) => a.status === "running");
  const degraded = runtimeAgents.filter((a) => a.status === "stopped");
  const registryOnly = agents.filter((a) => a.status === "registry_only").length;
  const pendingActions = queueRows.filter((q) => String(q.status ?? "") === "pending").length;
  const verifiedRevenue = ledgerRows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const alerts: CeoCockpitReport["alerts"] = [];
  for (const a of degraded) {
    alerts.push({
      level: "warn",
      code: "heartbeat_stale",
      message: `${a.name} runtimeEnabled nhưng không có heartbeat tươi (<10 phút).`,
    });
  }
  if (pendingActions > 80) {
    alerts.push({
      level: "warn",
      code: "queue_backlog",
      message: `Queue tồn ${pendingActions} pending — cần CEO review / agent runtime.`,
    });
  }
  if (!running.length && runtimeEnabledAgents().length) {
    alerts.push({
      level: "critical",
      code: "no_runtime_online",
      message: "Không có primary agent nào online.",
    });
  }
  if (!alerts.length) {
    alerts.push({
      level: "info",
      code: "fleet_ok",
      message: "Fleet trong tầm kiểm soát — primary agents theo heartbeat.",
    });
  }

  const latestCeo = Array.isArray(ceoReview) && ceoReview[0] ? ceoReview[0] : null;
  let latestCeoOutreachReport: string | null = null;
  if (latestCeo?.output && typeof latestCeo.output === "object") {
    const out = latestCeo.output as Record<string, unknown>;
    latestCeoOutreachReport = out.ownerReport ? String(out.ownerReport) : null;
  }

  const salesbot = agents.find((a) => a.id === "salesbot");
  const marketing = agents.find((a) => a.id === "marketing");

  const summary = `AI CEO cockpit: ${running.length}/${runtimeAgents.length} primary online; ${registryOnly} registry-only; ${publishedRows.length} bài Tier A; doanh thu verified ${verifiedRevenue.toLocaleString("vi-VN")} ₫.`;

  const ownerBrief = [
    `Báo cáo AI CEO — ${new Date().toISOString()}`,
    summary,
    ``,
    `Primary:`,
    `• SalesBot (Website): ${salesbot?.status ?? "?"} | pending ${salesbot?.pendingActions ?? 0} | KPI ${Math.round(salesbot?.kpiProgress ?? 0)}%`,
    `• Marketing (Facebook): ${marketing?.status ?? "?"} | pending ${marketing?.pendingActions ?? 0} | KPI ${Math.round(marketing?.kpiProgress ?? 0)}%`,
    ``,
    alerts.map((a) => `[${a.level}] ${a.message}`).join("\n"),
    ``,
    latestCeoOutreachReport ? `Outreach gần nhất:\n${latestCeoOutreachReport.slice(0, 500)}` : "Chưa có ownerReport outreach.",
    ``,
    `CEO không sửa code agent khác. Kích hoạt AI mới = branch riêng + runtimeEnabled sau validate.`,
  ].join("\n");

  return {
    ok: true,
    ceo: "AI CEO",
    mode: "cockpit-orchestrator",
    generatedAt: new Date().toISOString(),
    summary,
    ownerBrief,
    metrics: {
      fleetSize: FLEET_AGENTS.length,
      runtimeEnabled: runtimeAgents.length,
      running: running.length,
      degraded: degraded.length,
      registryOnly,
      pendingActions,
      publishedTierA: publishedRows.length,
      verifiedRevenue,
    },
    alerts,
    agents,
    channels: {
      website: {
        live: salesbot?.status === "running",
        postsUrl: "https://agentflow-khaki-rho.vercel.app/website/posts",
        autoPublishTierA: true,
      },
      facebook: {
        live: marketing?.status === "running",
        note: "Draft/approval pipeline — Page publish only via authorized connector",
      },
    },
    recentPublished: publishedRows,
    latestCeoOutreachReport,
    isolationRules: CEO_ISOLATION_RULES,
  };
}
