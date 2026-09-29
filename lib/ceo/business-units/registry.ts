/**
 * Business Unit plugin registry — declarative units, not auto-spend.
 */

export type BusinessUnitStatus = "draft" | "pilot" | "active" | "paused" | "retired";

export type BusinessUnit = {
  id: string;
  name: string;
  model: "affiliate" | "digital_products" | "ecommerce" | "ai_services" | "content" | "leadgen" | "other";
  goal: string;
  status: BusinessUnitStatus;
  dailyBudgetCeilingVnd: number;
  kpi: { name: string; target: number; unit: string };
  dataSources: string[];
  stopConditions: string[];
  linkedAgentIds: string[];
  notes: string;
};

export const BUSINESS_UNITS: BusinessUnit[] = [
  {
    id: "bu_affiliate_website",
    name: "Affiliate — Website (SalesBot)",
    model: "affiliate",
    goal: "Qualified affiliate traffic and verified commissions via owned storefront",
    status: "active",
    dailyBudgetCeilingVnd: 0,
    kpi: { name: "verified_commission_vnd", target: 15_000_000, unit: "VND/month" },
    dataSources: ["accesstrade", "website_signals", "revenue_ledger"],
    stopConditions: ["budget_breach", "provider_policy_violation", "owner_pause"],
    linkedAgentIds: ["salesbot"],
    notes: "Live via salesbot runtime; revenue only from verified ledger",
  },
  {
    id: "bu_affiliate_facebook",
    name: "Affiliate — Facebook (Marketing)",
    model: "affiliate",
    goal: "Compliant Page content driving storefront traffic",
    status: "active",
    dailyBudgetCeilingVnd: 0,
    kpi: { name: "verified_commission_vnd", target: 15_000_000, unit: "VND/month" },
    dataSources: ["facebook_signals", "revenue_ledger"],
    stopConditions: ["budget_breach", "platform_policy", "owner_pause"],
    linkedAgentIds: ["marketing"],
    notes: "Live via marketing runtime; no auto-ads purchase",
  },
  {
    id: "bu_digital_products",
    name: "Digital products",
    model: "digital_products",
    goal: "Draft and validate digital product offers with real payment confirmation",
    status: "draft",
    dailyBudgetCeilingVnd: 0,
    kpi: { name: "verified_orders", target: 10, unit: "orders/month" },
    dataSources: ["payos", "revenue_ledger"],
    stopConditions: ["negative_unit_economics", "owner_pause"],
    linkedAgentIds: [],
    notes: "Not enabled — requires pilot acceptance",
  },
  {
    id: "bu_content",
    name: "Content production",
    model: "content",
    goal: "Draft SEO/content for owned channels only",
    status: "draft",
    dailyBudgetCeilingVnd: 0,
    kpi: { name: "published_tier_a", target: 20, unit: "posts/month" },
    dataSources: ["website_published_posts"],
    stopConditions: ["quality_regression", "owner_pause"],
    linkedAgentIds: [],
    notes: "Draft-only until content agent validated",
  },
  {
    id: "bu_leadgen",
    name: "Lead generation",
    model: "leadgen",
    goal: "Capture and qualify leads with explicit consent",
    status: "draft",
    dailyBudgetCeilingVnd: 0,
    kpi: { name: "qualified_leads", target: 50, unit: "leads/month" },
    dataSources: [],
    stopConditions: ["consent_violation", "owner_pause"],
    linkedAgentIds: [],
    notes: "Not enabled",
  },
];

export function listBusinessUnits(): BusinessUnit[] {
  return BUSINESS_UNITS.slice();
}

export function getBusinessUnit(id: string): BusinessUnit | undefined {
  return BUSINESS_UNITS.find((u) => u.id === id);
}

export function activeBusinessUnits(): BusinessUnit[] {
  return BUSINESS_UNITS.filter((u) => u.status === "active" || u.status === "pilot");
}
