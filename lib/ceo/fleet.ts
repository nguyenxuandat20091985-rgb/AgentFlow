/**
 * AI CEO — isolated fleet registry.
 * Source isolation: only CEO modules import this. Agents do not write here.
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
  /** Production runtime loop may call this agent */
  runtimeEnabled: boolean;
  /** CEO may assign tasks to this agent via router */
  dispatchEnabled: boolean;
  /** KPI target VND (null = no primary KPI) */
  kpiTarget: number | null;
  role: string;
  branchHint: string;
};

/**
 * Single source of truth for CEO coordination.
 * Expanding an agent must not require editing salesbot/marketing runtime code.
 */
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
    branchHint: "agent/marketing-* / agent/ai2-facebook-*",
  },
  // Registry-only — activate one-by-one after validation
  { id: "supportai", name: "SupportAI", domain: "support", channel: "support", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Customer support drafts", branchHint: "agent/supportai-*" },
  { id: "dataanalyzer", name: "DataAnalyzer", domain: "analytics", channel: "analytics", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Analytics", branchHint: "agent/dataanalyzer-*" },
  { id: "contentwriter", name: "ContentWriter", domain: "content", channel: "content", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Long-form content", branchHint: "agent/contentwriter-*" },
  { id: "chatbot", name: "ChatBot", domain: "support", channel: "chat", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "On-site chat", branchHint: "agent/chatbot-*" },
  { id: "leadgen", name: "LeadGen", domain: "other", channel: "leads", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Lead capture drafts", branchHint: "agent/leadgen-*" },
  { id: "emailai", name: "EmailAI", domain: "other", channel: "email", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Email sequences", branchHint: "agent/emailai-*" },
  { id: "socialmedia", name: "SocialMedia", domain: "other", channel: "social", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Multi-social drafts", branchHint: "agent/socialmedia-*" },
  { id: "analytics", name: "Analytics", domain: "analytics", channel: "analytics", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Reporting", branchHint: "agent/analytics-*" },
  { id: "crm", name: "CRM", domain: "database", channel: "crm", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "CRM hygiene", branchHint: "agent/crm-*" },
  { id: "billing", name: "Billing", domain: "payment", channel: "billing", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Billing events read-only", branchHint: "agent/billing-*" },
  { id: "inventory", name: "Inventory", domain: "database", channel: "inventory", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Catalog sync", branchHint: "agent/inventory-*" },
  { id: "research", name: "Research", domain: "other", channel: "research", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Market research drafts", branchHint: "agent/research-*" },
  { id: "design", name: "Design", domain: "other", channel: "design", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Creative briefs", branchHint: "agent/design-*" },
  { id: "code", name: "Code", domain: "other", channel: "code", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Engineering assistant — no prod deploy", branchHint: "agent/code-*" },
  { id: "qa", name: "QA", domain: "other", channel: "qa", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "QA checklists", branchHint: "agent/qa-*" },
  { id: "hr", name: "HR", domain: "other", channel: "hr", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Internal HR drafts", branchHint: "agent/hr-*" },
  { id: "finance", name: "Finance", domain: "payment", channel: "finance", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "Finance read-only", branchHint: "agent/finance-*" },
  { id: "customerservice", name: "CustomerService", domain: "support", channel: "support", runtimeEnabled: false, dispatchEnabled: false, kpiTarget: null, role: "CS tickets drafts", branchHint: "agent/customerservice-*" },
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
  "CEO code lives only under lib/ceo/* and app/api/ceo/* (plus docs/ceo-*).",
  "CEO never mutates another agent's source files or feature branches.",
  "CEO never writes revenue, payments, or fake conversions.",
  "CEO only dispatches to agents with runtimeEnabled + dispatchEnabled.",
  "Channel queues stay isolated: website tasks stay on salesbot; facebook on marketing.",
  "If CEO API fails, agent heartbeats/runtimes continue independently.",
  "Activating a new AI requires: isolated branch → CI → runtimeEnabled flip → one agent at a time.",
] as const;
