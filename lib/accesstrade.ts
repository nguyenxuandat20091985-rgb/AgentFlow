export type AccessTradeFeedItem = {
  product_id?: string | number | null;
  sku?: string | null;
  name?: string | null;
  desc?: string | null;
  price?: number | string | null;
  discount?: number | string | null;
  discount_amount?: number | string | null;
  discount_rate?: number | string | null;
  campaign?: string | null;
  domain?: string | null;
  url?: string | null;
  aff_link?: string | null;
  image?: string | null;
  category?: string | null;
  status_discount?: number | null;
  update_time?: string | null;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function fetchAccessTradeDatafeeds(options: {
  domain?: string;
  category?: string;
  discountOnly?: boolean;
  limit?: number;
} = {}) {
  const apiKey = requiredEnv("ACCESSTRADE_API_KEY");
  const base = (process.env.ACCESSTRADE_API_BASE || "https://api.accesstrade.vn").replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("limit", String(Math.min(Math.max(options.limit ?? 50, 1), 200)));
  if (options.domain) params.set("domain", options.domain);
  if (options.category) params.set("cat", options.category);
  if (options.discountOnly) params.set("status_discount", "1");

  const response = await fetch(`${base}/v1/datafeeds?${params.toString()}`, {
    headers: { Authorization: `Token ${apiKey}`, Accept: "application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`AccessTrade datafeed ${response.status}: ${body?.message || body?.error || "request failed"}`);
  const data = Array.isArray(body?.data) ? body.data : [];
  return data as AccessTradeFeedItem[];
}

export function rankAffiliateOpportunities(items: AccessTradeFeedItem[]) {
  return [...items]
    .map((item) => {
      const discount = Number(item.discount_rate ?? 0) || 0;
      const hasLink = Boolean(item.aff_link);
      const price = Number(item.discount ?? item.price ?? 0) || 0;
      const score = discount * 2 + (hasLink ? 15 : 0) + (price > 0 ? 5 : 0);
      return { ...item, opportunity_score: Math.round(score * 100) / 100 };
    })
    .sort((a, b) => b.opportunity_score - a.opportunity_score);
}
