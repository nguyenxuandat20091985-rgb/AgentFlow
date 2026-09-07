export type Vertical = "commerce" | "crypto";

export type Opportunity = {
  id: string;
  vertical: Vertical;
  title: string;
  status: "research" | "ready" | "blocked";
  estimatedValue: number;
  risk: "low" | "medium" | "high";
};

export const verticals = [
  {
    id: "commerce" as const,
    name: "E-Commerce & Affiliate Autopilot",
    description: "Deal research, compliant product content, affiliate tracking and performance analytics.",
    automation: ["Deal discovery", "Content drafts", "Affiliate link tracking", "Performance analysis"],
  },
  {
    id: "crypto" as const,
    name: "Crypto Zero-Capital Autopilot",
    description: "Public opportunity research and task tracking for legitimate no-capital campaigns; never custody or move funds.",
    automation: ["Campaign research", "Eligibility tracking", "Task checklist", "Read-only portfolio reporting"],
  },
];

export const opportunities: Opportunity[] = [
  { id: "com-001", vertical: "commerce", title: "Review opportunities", status: "research", estimatedValue: 0, risk: "low" },
  { id: "com-002", vertical: "commerce", title: "Affiliate content queue", status: "ready", estimatedValue: 0, risk: "low" },
  { id: "cry-001", vertical: "crypto", title: "Airdrop campaign research", status: "research", estimatedValue: 0, risk: "medium" },
  { id: "cry-002", vertical: "crypto", title: "Eligibility task tracker", status: "ready", estimatedValue: 0, risk: "low" },
];

export const safetyPolicy = {
  allowed: [
    "public market research",
    "user-approved affiliate content",
    "legitimate promotional links",
    "read-only exchange balance APIs",
    "public airdrop/task research",
  ],
  blocked: [
    "withdrawals",
    "transfers",
    "private-key or seed-phrase handling",
    "API trading permissions",
    "automated liquidity actions",
    "spam or deceptive promotion",
  ],
};

export function getEarningSnapshot() {
  return {
    generatedAt: new Date().toISOString(),
    verticals,
    opportunities,
    safetyPolicy,
    revenue: { commerce: 0, crypto: 0, total: 0, currency: "VND" },
  };
}
