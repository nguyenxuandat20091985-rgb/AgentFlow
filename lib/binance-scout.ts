export const BINANCE_AGENT_ID = "binance_scout" as const;

export type ScoutOpportunity = {
  id: string;
  title: string;
  mode: "research" | "eligibility" | "referral" | "education";
  status: "candidate";
  capitalRequired: 0;
  evidenceRequired: string[];
};

export const ZERO_CAPITAL_RULES = [
  "Do not deposit money to qualify for an opportunity.",
  "Do not place trades or submit orders.",
  "Do not enable withdrawal or transfer permissions.",
  "Never request, store, or transmit a seed phrase/private key.",
  "Never count an exchange balance, estimated reward, or campaign headline as revenue.",
  "Only record a reward after the provider confirms the actual credit/event.",
];

export const opportunitySources = [
  {
    id: "binance-official-campaigns",
    title: "Official Binance campaigns / tasks",
    mode: "research" as const,
    status: "candidate" as const,
    capitalRequired: 0 as const,
    evidenceRequired: ["official Binance source URL", "eligibility conditions", "campaign end time", "confirmed reward event"],
  },
  {
    id: "binance-education",
    title: "Official education / learning opportunities",
    mode: "education" as const,
    status: "candidate" as const,
    capitalRequired: 0 as const,
    evidenceRequired: ["official program page", "account eligibility", "completion evidence", "confirmed reward event"],
  },
  {
    id: "binance-referral",
    title: "Referral opportunities with zero required spend",
    mode: "referral" as const,
    status: "candidate" as const,
    capitalRequired: 0 as const,
    evidenceRequired: ["official referral terms", "qualified referral event", "confirmed reward event"],
  },
  {
    id: "binance-eligibility",
    title: "Account eligibility and task checklist",
    mode: "eligibility" as const,
    status: "candidate" as const,
    capitalRequired: 0 as const,
    evidenceRequired: ["official terms", "account eligibility", "task completion evidence"],
  },
];

export function buildScoutQueue() {
  return opportunitySources.map((item) => ({
    agent_id: BINANCE_AGENT_ID,
    action_type: `crypto_${item.mode}_research`,
    channel: "binance",
    status: "pending" as const,
    priority: item.mode === "eligibility" ? "high" : "medium",
    source_type: "official_provider_research",
    source_id: item.id,
    dedupe_key: `${BINANCE_AGENT_ID}:${item.id}`,
    payload: {
      title: item.title,
      mode: item.mode,
      capitalRequired: 0,
      execution: "research_only",
      evidenceRequired: item.evidenceRequired,
      rules: ZERO_CAPITAL_RULES,
    },
  }));
}

export async function getBinancePublicHealth() {
  const base = process.env.BINANCE_PUBLIC_API_BASE || "https://api.binance.com";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${base}/api/v3/exchangeInfo?symbol=BTCUSDT`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    return { reachable: response.ok, status: response.status, checkedAt: new Date().toISOString() };
  } catch (error) {
    return { reachable: false, status: null, checkedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "binance_unreachable" };
  } finally {
    clearTimeout(timeout);
  }
}
