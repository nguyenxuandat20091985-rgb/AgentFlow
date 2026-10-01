/**
 * AI CEO — isolated fleet registry.
 */

export type AgentDomain =
  | "orchestration"
  | "website"
  | "facebook"
  | "database"
  | "payment"
  | "security"
  | "error_handler"
  | "binance"
  | "support"
  | "analytics"
  | "content"
  | "other";

export type FleetAgent = {
  id: string;
  name: string;
  domain: AgentDomain;
  channel: string;
  runtimeEnabled: boolean;
  dispatchEnabled: boolean;
  kpiTarget: number | null;
  role: string;
  branchHint: string;
};

export const FLEET_AGENTS: FleetAgent[] = [
  {
    id: "ceo",
    name: "AI CEO",
    domain: "orchestration",
    channel: "ceo",
    runtimeEnabled: false,
    dispatchEnabled: false,
    kpiTarget: null,
    role: "Orchestrator, policy gate, owner reports — never executes channel work",
    branchHint: "agent/ceo-*",
  },
  {
    id: "salesbot",
    name: "SalesBot (AI Website)",
    domain: "website",
    channel: "website",
    runtimeEnabled: true,
    dispatchEnabled: true,
    kpiTarget: 15_000_000,
    role: "Website affiliate commerce, merchandising, Tier A publish",
    branchHint: "agent/salesbot-*",
  },
  {
    id: "marketing",
    name: "Marketing (AI Facebook)",
    domain: "facebook",
    channel: "facebook",
    runtimeEnabled: true,
    dispatchEnabled: true,
    kpiTarget: 15_000_000,
    role: "Facebook growth, Page content drafts, approval-only outbound",
    branchHint: "agent/marketing-*",
  },
  { id: "supportai", name: "SupportAI", domain: "support", channel: "support", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 2_000_000, role: "Support retention / upsell drafts", branchHint: "agent/supportai-*" },
  { id: "dataanalyzer", name: "DataAnalyzer", domain: "analytics", channel: "analytics", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 1_000_000, role: "Conversion analytics", branchHint: "agent/dataanalyzer-*" },
  { id: "contentwriter", name: "ContentWriter", domain: "content", channel: "content", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 5_000_000, role: "SEO/comparison content", branchHint: "agent/contentwriter-*" },
  { id: "chatbot", name: "ChatBot", domain: "support", channel: "chat", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 2_000_000, role: "On-site assistant → product match", branchHint: "agent/chatbot-*" },
  { id: "leadgen", name: "LeadGen", domain: "other", channel: "leads", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 3_000_000, role: "Lead magnet + consent capture", branchHint: "agent/leadgen-*" },
  { id: "emailai", name: "EmailAI", domain: "other", channel: "email", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 3_000_000, role: "Email nurture to conversion", branchHint: "agent/emailai-*" },
  { id: "socialmedia", name: "SocialMedia", domain: "other", channel: "social", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 3_000_000, role: "Multi-channel short content", branchHint: "agent/socialmedia-*" },
  { id: "analytics", name: "Analytics", domain: "analytics", channel: "analytics", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 1_000_000, role: "KPI board & anomaly alerts", branchHint: "agent/analytics-*" },
  { id: "crm", name: "CRM", domain: "database", channel: "crm", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 1_000_000, role: "CRM hygiene", branchHint: "agent/crm-*" },
  { id: "billing", name: "Billing", domain: "payment", channel: "billing", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: null, role: "Payment event observer", branchHint: "agent/billing-*" },
  { id: "inventory", name: "Inventory", domain: "database", channel: "inventory", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 1_000_000, role: "Catalog / link hygiene", branchHint: "agent/inventory-*" },
  { id: "research", name: "Research", domain: "other", channel: "research", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 2_000_000, role: "Market opportunity scanner", branchHint: "agent/research-*" },
  { id: "design", name: "Design", domain: "other", channel: "design", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 1_000_000, role: "Creative assets for offers", branchHint: "agent/design-*" },
  { id: "code", name: "Code", domain: "other", channel: "code", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: null, role: "Automation engineering — no prod deploy", branchHint: "agent/code-*" },
  { id: "qa", name: "QA", domain: "other", channel: "qa", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: null, role: "Offer & content QA gate", branchHint: "agent/qa-*" },
  { id: "hr", name: "HR", domain: "other", channel: "hr", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Internal HR — blocked", branchHint: "agent/hr-*" },
  { id: "finance", name: "Finance", domain: "payment", channel: "finance", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: null, role: "Net revenue truth", branchHint: "agent/finance-*" },
  { id: "customerservice", name: "CustomerService", domain: "support", channel: "support", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 1_000_000, role: "CS ticket drafts", branchHint: "agent/customerservice-*" },
  // Next-wave Factory spawn catalog (durable fleet entries)
  { id: "shopeeops", name: "Shopee Ops", domain: "other", channel: "shopee", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 5_000_000, role: "Shopee affiliate merchandising", branchHint: "agent/shopeeops-*" },
  { id: "tiktokgrowth", name: "TikTok Growth", domain: "content", channel: "tiktok", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 3_000_000, role: "TikTok scripts → storefront", branchHint: "agent/tiktokgrowth-*" },
  { id: "youtubecontent", name: "YouTube Content", domain: "content", channel: "youtube", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 3_000_000, role: "Long-form review scripts", branchHint: "agent/youtubecontent-*" },
  { id: "couponhunter", name: "Coupon Hunter", domain: "other", channel: "deals", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 2_000_000, role: "Deal aggregation pages", branchHint: "agent/couponhunter-*" },
  { id: "localseo", name: "Local SEO", domain: "content", channel: "local", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 2_000_000, role: "Local intent content VN", branchHint: "agent/localseo-*" },
  { id: "newsletter", name: "Newsletter AI", domain: "other", channel: "newsletter", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 2_000_000, role: "Weekly value newsletter", branchHint: "agent/newsletter-*" },
  { id: "partnerships", name: "Partnerships", domain: "other", channel: "partners", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 2_000_000, role: "Collab / co-promo drafts", branchHint: "agent/partnerships-*" },
  { id: "pricemonitor", name: "Price Monitor", domain: "analytics", channel: "pricing", runtimeEnabled: true, dispatchEnabled: true, kpiTarget: 1_000_000, role: "Price & margin watch", branchHint: "agent/pricemonitor-*" },
];

export const HEARTBEAT_MAX_AGE_MS = 10 * 60 * 1000;

export function getFleetAgent(id: string): FleetAgent | undefined {
  return FLEET_AGENTS.find((a) => a.id === id.toLowerCase());
}

export function runtimeEnabledAgents(): FleetAgent[] {
  return FLEET_AGENTS.filter((a) => a.runtimeEnabled && a.id !== "ceo");
}

export function dispatchableAgents(): FleetAgent[] {
  return FLEET_AGENTS.filter((a) => a.dispatchEnabled && a.runtimeEnabled);
}

export const CEO_ISOLATION_RULES = [
  "CEO never writes revenue, payments, or fake conversions.",
  "Factory spawn may enable draft-only earning agents; verified ledger only counts real money.",
  "If CEO API fails, agent heartbeats continue independently.",
] as const;
