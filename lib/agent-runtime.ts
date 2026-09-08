import { supabaseAdmin } from "@/lib/supabase-admin";
import { executeAgent } from "@/lib/agent-engine";
import { fetchAccessTradeDatafeeds, rankAffiliateOpportunities, type AccessTradeFeedItem } from "@/lib/accesstrade";

export const PRIMARY_RUNTIME_TASKS = {
  salesbot: {
    name: "SalesBot — Website Commerce Agent",
    channel: "website",
    goal: "Operate the Nhà Bếp Thông Minh storefront: analyze real commerce deals and legitimate affiliate opportunities, prioritize high-intent products, prepare product merchandising and customer follow-up drafts, and improve on-site conversion. Never invent leads, customers, orders, payments, or revenue.",
  },
  marketing: {
    name: "Marketing — Facebook Growth Agent",
    channel: "facebook",
    goal: "Operate the Nhà Bếp Thông Minh Facebook growth pipeline: analyze real affiliate opportunities and active campaigns, prepare approved social content and distribution plans, and improve qualified traffic into the storefront. Never fabricate traffic, leads, sales, payments, or revenue.",
  },
} as const;

export type RuntimeAgentId = keyof typeof PRIMARY_RUNTIME_TASKS;
type RevenueRow = { amount?: number | string | null; agent_id?: string | null; created_at?: string | null };
type DealRow = { id?: string; deal_title?: string | null; revenue?: number | string | null; status?: string | null; created_at?: string | null };
type AffiliateRow = { id?: string; order_code?: string | null; platform?: string | null; commission?: number | string | null; status?: string | null; created_at?: string | null };

function buildDeterministicQueue(agentId: RuntimeAgentId, deals: DealRow[], affiliateOrders: AffiliateRow[], opportunities: AccessTradeFeedItem[]) {
  const queue: Array<Record<string, unknown>> = [];
  const ranked = rankAffiliateOpportunities(opportunities).slice(0, 10);
  if (agentId === "salesbot") {
    deals.filter((d) => ["open", "active", "pending"].includes(String(d.status ?? "").toLowerCase())).slice(0, 5).forEach((deal) => queue.push({ type: "deal_followup_draft", priority: "high", sourceId: deal.id ?? null, title: deal.deal_title ?? "Open deal", expectedOutcome: "Increase qualified conversion", channel: "website", execution: "draft_only" }));
    affiliateOrders.filter((o) => ["pending", "open", "processing"].includes(String(o.status ?? "").toLowerCase())).slice(0, 5).forEach((order) => queue.push({ type: "affiliate_followup_draft", priority: "medium", sourceId: order.id ?? null, orderCode: order.order_code ?? null, channel: "website", execution: "draft_only" }));
    ranked.slice(0, 5).forEach((item) => queue.push({ type: "affiliate_offer_merchandising_draft", priority: "medium", productId: item.product_id ?? null, name: item.name ?? null, affiliateLink: item.aff_link ?? null, opportunityScore: item.opportunity_score ?? null, channel: "website", execution: "draft_only" }));
  } else {
    deals.filter((d) => ["open", "active", "pending"].includes(String(d.status ?? "").toLowerCase())).slice(0, 8).forEach((deal) => queue.push({ type: "facebook_campaign_content_draft", priority: "high", sourceId: deal.id ?? null, title: deal.deal_title ?? "Active opportunity", channel: "facebook", execution: "draft_only" }));
    affiliateOrders.filter((o) => ["pending", "open", "processing"].includes(String(o.status ?? "").toLowerCase())).slice(0, 5).forEach((order) => queue.push({ type: "facebook_affiliate_content_draft", priority: "medium", sourceId: order.id ?? null, platform: order.platform ?? null, channel: "facebook", execution: "draft_only" }));
    ranked.slice(0, 8).forEach((item) => queue.push({ type: "facebook_affiliate_campaign_draft", priority: "high", productId: item.product_id ?? null, name: item.name ?? null, campaign: item.campaign ?? null, affiliateLink: item.aff_link ?? null, opportunityScore: item.opportunity_score ?? null, channel: "facebook", execution: "draft_only" }));
  }
  return queue;
}

async function buildRuntimeSnapshot(agentId: RuntimeAgentId) {
  const [ledger, deals, affiliateOrders] = await Promise.all([
    supabaseAdmin<RevenueRow[]>("revenue_ledger?select=amount,agent_id,created_at&order=created_at.desc&limit=100"),
    supabaseAdmin<DealRow[]>("commerce_deals?select=id,deal_title,revenue,status,created_at&order=created_at.desc&limit=50"),
    supabaseAdmin<AffiliateRow[]>("affiliate_orders?select=id,order_code,platform,commission,status,created_at&order=created_at.desc&limit=50"),
  ]);

  let affiliateOpportunities: AccessTradeFeedItem[] = [];
  try {
    affiliateOpportunities = rankAffiliateOpportunities(await fetchAccessTradeDatafeeds({ discountOnly: true, limit: 100 }));
  } catch (error) {
    console.error("[agent-runtime] AccessTrade discovery unavailable", error);
  }

  const agentRevenue = (ledger ?? []).filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const actionQueue = buildDeterministicQueue(agentId, deals ?? [], affiliateOrders ?? [], affiliateOpportunities);

  return {
    asOf: new Date().toISOString(),
    agentId,
    channel: PRIMARY_RUNTIME_TASKS[agentId].channel,
    kpi: { target: 15_000_000, actual: agentRevenue, remaining: Math.max(0, 15_000_000 - agentRevenue), progress: Math.min(100, agentRevenue / 15_000_000 * 100) },
    commerceDeals: (deals ?? []).slice(0, 25),
    affiliateOrders: (affiliateOrders ?? []).slice(0, 25),
    affiliateOpportunities: affiliateOpportunities.slice(0, 20),
    verifiedRevenueRows: (ledger ?? []).filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId).slice(0, 25),
    actionQueue,
    rules: [
      "Only verified PayOS/revenue_ledger amounts count as revenue.",
      "Runtime is planning/orchestration only: never create payments, orders, commissions, or revenue.",
      "External outreach or publishing is draft-only unless an explicitly connected and authorized provider action exists.",
      "Affiliate links must use provider-generated links; never fabricate tracking parameters.",
      "Never claim an action was sent, published, converted, or paid unless a provider/database confirmation exists.",
    ],
  };
}

export async function runPrimaryAgent(agentId: RuntimeAgentId) {
  const task = PRIMARY_RUNTIME_TASKS[agentId];
  const snapshot = await buildRuntimeSnapshot(agentId);
  const result = await executeAgent({
    agent: agentId === "salesbot" ? "SalesBot" : "Marketing",
    goal: `${task.goal}\nReturn a prioritized execution queue. For every item include priority, action, evidence, expected KPI impact, and execution mode (draft_only unless an authorized provider action is explicitly available). Draft concrete follow-up/content copy when useful. Never state that an action was completed unless the runtime actually performed it.`,
    context: `AgentFlow controlled revenue automation cycle. ${task.name}. Assigned channel: ${task.channel}. Real database/provider snapshot:\n${JSON.stringify(snapshot)}\nFinancial integrity: revenue is read-only evidence from revenue_ledger; never write revenue, payments, or fake conversions.`,
  });

  try {
    await supabaseAdmin("agent_task_runs", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ agent_id: agentId, task_type: "revenue_automation_cycle", status: result.status, input_snapshot: snapshot, output: result.output }) });
  } catch (error) {
    console.error("[agent-runtime] failed to persist task run", { agentId, error });
  }

  return { ...result, snapshot: { kpi: snapshot.kpi, actionQueue: snapshot.actionQueue, commerceDeals: snapshot.commerceDeals.length, affiliateOrders: snapshot.affiliateOrders.length, affiliateOpportunities: snapshot.affiliateOpportunities.length, channel: snapshot.channel } };
}
