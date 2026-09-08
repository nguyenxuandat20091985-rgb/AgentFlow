import { supabaseAdmin } from "@/lib/supabase-admin";
import { executeAgent } from "@/lib/agent-engine";

export const PRIMARY_RUNTIME_TASKS = {
  salesbot: {
    name: "SalesBot revenue operations",
    goal: "Analyze real sales inputs and produce concrete, compliant conversion actions: prioritize open commerce deals, legitimate affiliate orders, follow-up drafts, and owner-approved customer actions. Never invent leads, customers, orders, payments, or revenue.",
  },
  marketing: {
    name: "Marketing growth operations",
    goal: "Analyze real marketing inputs and produce concrete, compliant growth actions: prioritize active commerce opportunities, approved content/campaign work, lead-generation opportunities, and measurable conversion experiments. Never fabricate traffic, leads, sales, payments, or revenue.",
  },
} as const;

export type RuntimeAgentId = keyof typeof PRIMARY_RUNTIME_TASKS;

type RevenueRow = { amount?: number | string | null; agent_id?: string | null; created_at?: string | null };
type DealRow = { id?: string; deal_title?: string | null; revenue?: number | string | null; status?: string | null; created_at?: string | null };
type AffiliateRow = { id?: string; order_code?: string | null; platform?: string | null; commission?: number | string | null; status?: string | null; created_at?: string | null };

async function buildRuntimeSnapshot(agentId: RuntimeAgentId) {
  const [ledger, deals, affiliateOrders] = await Promise.all([
    supabaseAdmin<RevenueRow[]>("revenue_ledger?select=amount,agent_id,created_at&order=created_at.desc&limit=100"),
    supabaseAdmin<DealRow[]>("commerce_deals?select=id,deal_title,revenue,status,created_at&order=created_at.desc&limit=50"),
    supabaseAdmin<AffiliateRow[]>("affiliate_orders?select=id,order_code,platform,commission,status,created_at&order=created_at.desc&limit=50"),
  ]);

  const agentRevenue = (ledger ?? [])
    .filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId)
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  return {
    asOf: new Date().toISOString(),
    agentId,
    kpi: { target: 15_000_000, actual: agentRevenue, remaining: Math.max(0, 15_000_000 - agentRevenue), progress: Math.min(100, agentRevenue / 15_000_000 * 100) },
    commerceDeals: (deals ?? []).slice(0, 25),
    affiliateOrders: (affiliateOrders ?? []).slice(0, 25),
    verifiedRevenueRows: (ledger ?? []).filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId).slice(0, 25),
    rules: [
      "Only verified PayOS/revenue_ledger amounts count as revenue.",
      "Do not create or mutate payment records from the agent runtime.",
      "Do not claim a conversion unless a connected source confirms it.",
      "External outreach/content publishing requires an explicitly connected and authorized action; otherwise produce a draft task for owner approval.",
    ],
  };
}

export async function runPrimaryAgent(agentId: RuntimeAgentId) {
  const task = PRIMARY_RUNTIME_TASKS[agentId];
  const snapshot = await buildRuntimeSnapshot(agentId);
  const result = await executeAgent({
    agent: agentId === "salesbot" ? "SalesBot" : "Marketing",
    goal: `${task.goal}\nReturn a short prioritized action queue with: priority, action, evidence from the snapshot, expected KPI impact, and whether owner approval is required. Do not state that an action was completed unless the runtime actually performed it.`,
    context: `AgentFlow controlled runtime cycle. ${task.name}. Real database snapshot:\n${JSON.stringify(snapshot)}\nFinancial integrity: revenue is read-only evidence from revenue_ledger; never write revenue, payments, or fake conversions.`,
  });

  try {
    await supabaseAdmin("agent_task_runs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        agent_id: agentId,
        task_type: "kpi_runtime_cycle",
        status: result.status,
        input_snapshot: snapshot,
        output: result.output,
      }),
    });
  } catch (error) {
    console.error("[agent-runtime] failed to persist task run", { agentId, error });
  }

  return { ...result, snapshot: { kpi: snapshot.kpi, commerceDeals: snapshot.commerceDeals.length, affiliateOrders: snapshot.affiliateOrders.length } };
}
