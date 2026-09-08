import { supabaseAdmin } from "@/lib/supabase-admin";
import { executeAgent } from "@/lib/agent-engine";
import { fetchAccessTradeDatafeeds, rankAffiliateOpportunities, type AccessTradeFeedItem } from "@/lib/accesstrade";

export const PRIMARY_RUNTIME_TASKS = {
  salesbot: {
    name: "SalesBot — Website Commerce Agent",
    channel: "website",
    goal: "Operate the Nhà Bếp Thông Minh storefront as the website affiliate-commerce AI: discover real affiliate opportunities, prioritize high-intent products, prepare SEO/product merchandising and customer follow-up drafts, and improve on-site conversion. Never invent leads, customers, orders, payments, or revenue.",
  },
  marketing: {
    name: "Marketing — Facebook Growth Agent",
    channel: "facebook",
    goal: "Operate the Nhà Bếp Thông Minh Facebook growth pipeline: analyze real affiliate opportunities and active campaigns, prepare approved social content and distribution plans, and improve qualified traffic into the storefront. Never fabricate traffic, leads, sales, payments, or revenue.",
  },
} as const;

export type RuntimeAgentId = keyof typeof PRIMARY_RUNTIME_TASKS;
type RevenueRow = { amount?: number | string | null; agent_id?: string | null; created_at?: string | null };
type DealRow = { id?: string; deal_title?: string | null; revenue?: number | string | null; status?: string | null; created_at?: string | null; url?: string | null; image?: string | null; category?: string | null };
type AffiliateRow = { id?: string; order_code?: string | null; platform?: string | null; commission?: number | string | null; status?: string | null; created_at?: string | null };

type QueueRow = {
  agent_id: string;
  action_type: string;
  channel: string;
  status: "pending";
  priority: "low" | "medium" | "high";
  source_type?: string | null;
  source_id?: string | null;
  dedupe_key: string;
  payload: Record<string, unknown>;
};

function buildDeterministicQueue(agentId: RuntimeAgentId, deals: DealRow[], affiliateOrders: AffiliateRow[], opportunities: AccessTradeFeedItem[]) {
  const queue: Array<Record<string, unknown>> = [];
  const ranked = rankAffiliateOpportunities(opportunities).slice(0, 10);

  if (agentId === "salesbot") {
    deals.filter((d) => ["open", "active", "pending"].includes(String(d.status ?? "").toLowerCase())).slice(0, 5).forEach((deal) => queue.push({ type: "website_deal_followup_draft", priority: "high", sourceId: deal.id ?? null, title: deal.deal_title ?? "Open deal", expectedOutcome: "Increase qualified conversion", channel: "website", execution: "draft_only" }));
    affiliateOrders.filter((o) => ["pending", "open", "processing"].includes(String(o.status ?? "").toLowerCase())).slice(0, 5).forEach((order) => queue.push({ type: "website_affiliate_followup_draft", priority: "medium", sourceId: order.id ?? null, orderCode: order.order_code ?? null, channel: "website", execution: "draft_only" }));
    ranked.slice(0, 8).forEach((item) => queue.push({ type: "website_affiliate_merchandising_draft", priority: Number(item.opportunity_score ?? 0) >= 25 ? "high" : "medium", productId: item.product_id ?? null, name: item.name ?? null, category: item.category ?? null, price: item.price ?? null, discountRate: item.discount_rate ?? null, image: item.image ?? null, affiliateLink: item.aff_link ?? null, opportunityScore: item.opportunity_score ?? null, channel: "website", execution: "draft_only" }));
    ranked.slice(0, 3).forEach((item) => queue.push({ type: "website_seo_content_brief", priority: "medium", productId: item.product_id ?? null, name: item.name ?? null, category: item.category ?? null, channel: "website", execution: "draft_only", brief: "Create a useful product/deal article with buyer intent, comparison points, FAQ and a clear affiliate CTA using only provider-supplied facts." }));
  } else {
    deals.filter((d) => ["open", "active", "pending"].includes(String(d.status ?? "").toLowerCase())).slice(0, 8).forEach((deal) => queue.push({ type: "facebook_campaign_content_draft", priority: "high", sourceId: deal.id ?? null, title: deal.deal_title ?? "Active opportunity", channel: "facebook", execution: "draft_only" }));
    affiliateOrders.filter((o) => ["pending", "open", "processing"].includes(String(o.status ?? "").toLowerCase())).slice(0, 5).forEach((order) => queue.push({ type: "facebook_affiliate_content_draft", priority: "medium", sourceId: order.id ?? null, platform: order.platform ?? null, channel: "facebook", execution: "draft_only" }));
    ranked.slice(0, 8).forEach((item) => queue.push({ type: "facebook_affiliate_campaign_draft", priority: "high", productId: item.product_id ?? null, name: item.name ?? null, campaign: item.campaign ?? null, affiliateLink: item.aff_link ?? null, opportunityScore: item.opportunity_score ?? null, channel: "facebook", execution: "draft_only" }));
  }
  return queue;
}

async function persistActionQueue(agentId: RuntimeAgentId, actionQueue: Array<Record<string, unknown>>) {
  if (!actionQueue.length) return 0;
  const rows: QueueRow[] = actionQueue.map((action) => {
    const sourceId = action.sourceId == null ? String(action.productId ?? "") : String(action.sourceId);
    const type = String(action.type ?? "action");
    const productId = action.productId == null ? "" : String(action.productId);
    return {
      agent_id: agentId,
      action_type: type,
      channel: String(action.channel ?? PRIMARY_RUNTIME_TASKS[agentId].channel),
      status: "pending",
      priority: action.priority === "high" ? "high" : action.priority === "low" ? "low" : "medium",
      source_type: productId ? "affiliate_product" : sourceId ? "database_record" : "runtime",
      source_id: sourceId || null,
      dedupe_key: `${agentId}:${type}:${sourceId}:${productId}`,
      payload: action,
    };
  });
  try {
    const result = await supabaseAdmin<unknown[]>("agent_action_queue", { method: "POST", headers: { Prefer: "return=representation,resolution=ignore-duplicates" }, body: JSON.stringify(rows) });
    return Array.isArray(result) ? result.length : 0;
  } catch (error) {
    console.error("[agent-runtime] failed to persist action queue", { agentId, error });
    return 0;
  }
}

async function buildRuntimeSnapshot(agentId: RuntimeAgentId) {
  const [ledger, deals, affiliateOrders] = await Promise.all([
    supabaseAdmin<RevenueRow[]>("revenue_ledger?select=amount,agent_id,created_at&order=created_at.desc&limit=100"),
    supabaseAdmin<DealRow[]>("commerce_deals?select=id,deal_title,revenue,status,created_at,url,image,category&order=created_at.desc&limit=50"),
    supabaseAdmin<AffiliateRow[]>("affiliate_orders?select=id,order_code,platform,commission,status,created_at&order=created_at.desc&limit=50"),
  ]);

  let affiliateOpportunities: AccessTradeFeedItem[] = [];
  try {
    affiliateOpportunities = rankAffiliateOpportunities(await fetchAccessTradeDatafeeds({ limit: 100 }));
  } catch (error) {
    console.error("[agent-runtime] AccessTrade discovery unavailable", error);
  }

  const agentRevenue = (ledger ?? []).filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const actionQueue = buildDeterministicQueue(agentId, deals ?? [], affiliateOrders ?? [], affiliateOpportunities);

  return {
    asOf: new Date().toISOString(),
    agentId,
    channel: PRIMARY_RUNTIME_TASKS[agentId].channel,
    kpi: { target: 15_000_000, actual: agentRevenue, remaining: Math.max(0, 15_000_000 - agentRevenue), progress: Math.min(100, (agentRevenue / 15_000_000) * 100) },
    commerceDeals: (deals ?? []).slice(0, 25),
    affiliateOrders: (affiliateOrders ?? []).slice(0, 25),
    affiliateOpportunities: affiliateOpportunities.slice(0, 20),
    verifiedRevenueRows: (ledger ?? []).filter((row) => String(row.agent_id ?? "").toLowerCase() === agentId).slice(0, 25),
    actionQueue,
    rules: [
      "Only verified PayOS/revenue_ledger amounts count as revenue.",
      "Runtime is planning/orchestration only: never create payments, orders, commissions, or revenue.",
      "Website AI may prepare merchandising, SEO and CTA drafts; publication remains controlled by the website pipeline.",
      "External outreach or publishing is draft-only unless an authorized provider action explicitly exists.",
      "Affiliate links must use provider-generated links; never fabricate tracking parameters.",
      "Never claim an action was sent, published, converted, or paid unless a provider/database confirmation exists.",
    ],
  };
}

export async function runPrimaryAgent(agentId: RuntimeAgentId) {
  const task = PRIMARY_RUNTIME_TASKS[agentId];
  const snapshot = await buildRuntimeSnapshot(agentId);
  const persistedQueueCount = await persistActionQueue(agentId, snapshot.actionQueue);
  const result = await executeAgent({
    agent: agentId === "salesbot" ? "SalesBot — Website Commerce AI" : "Marketing — Facebook Growth AI",
    goal: `${task.goal}\nOperate as a real production planning agent. Analyze the supplied live snapshot and produce concrete next actions. For each action include priority, evidence/source, exact content or implementation suggestion, expected funnel impact, and execution mode. Prefer useful drafts over generic advice. Do not invent facts. Never state that a publish/send/purchase/payment occurred unless the runtime has a provider confirmation.`,
    context: `AgentFlow revenue-automation cycle. Assigned channel: ${task.channel}. Live database/provider snapshot:\n${JSON.stringify(snapshot)}\nThe deterministic action queue has already been persisted to agent_action_queue where possible (${persistedQueueCount} new rows). Financial integrity: revenue is read-only evidence from revenue_ledger; never write revenue, payments, or fake conversions.`,
  });

  try {
    await supabaseAdmin("agent_task_runs", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ agent_id: agentId, task_type: "revenue_automation_cycle", status: result.status, input_snapshot: { ...snapshot, persistedQueueCount }, output: result.output }) });
  } catch (error) {
    console.error("[agent-runtime] failed to persist task run", { agentId, error });
  }

  return { ...result, snapshot: { kpi: snapshot.kpi, actionQueue: snapshot.actionQueue, persistedQueueCount, commerceDeals: snapshot.commerceDeals.length, affiliateOrders: snapshot.affiliateOrders.length, affiliateOpportunities: snapshot.affiliateOpportunities.length, channel: snapshot.channel } };
}
