import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchAccessTradeDatafeeds, rankAffiliateOpportunities } from "@/lib/accesstrade";

type DealRow = {
  id?: string | number | null;
  deal_title?: string | null;
  revenue?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

export type WebsiteNetwork = "shopee" | "lazada" | "other";

export type WebsiteProduct = {
  id: string;
  title: string;
  price: number | null;
  discountRate: number;
  image: string | null;
  url: string | null;
  merchantUrl: string | null;
  category: string;
  source: "accesstrade" | "deal";
  network: WebsiteNetwork;
  score: number;
};

function detectNetwork(value: string | null | undefined): WebsiteNetwork {
  const text = String(value || "").toLowerCase();
  if (text.includes("shopee")) return "shopee";
  if (text.includes("lazada")) return "lazada";
  return "other";
}

async function loadCatalog(): Promise<WebsiteProduct[]> {
  const products: WebsiteProduct[] = [];

  try {
    const feed = rankAffiliateOpportunities(await fetchAccessTradeDatafeeds({ limit: 80 }));
    for (const item of feed.slice(0, 48)) {
      const destination = item.domain || item.url || item.aff_link;
      products.push({
        id: `at-${String(item.product_id ?? item.sku ?? "unknown")}`,
        title: item.name?.trim() || "Sản phẩm đang có ưu đãi",
        price: Number(item.discount ?? item.price ?? 0) || null,
        discountRate: Number(item.discount_rate ?? 0) || 0,
        image: item.image || null,
        url: item.aff_link || item.url || null,
        merchantUrl: item.url || null,
        category: item.category || "Ưu đãi nổi bật",
        source: "accesstrade",
        network: detectNetwork(destination),
        score: Number(item.opportunity_score ?? 0),
      });
    }
  } catch (error) {
    console.error("[website-catalog] AccessTrade unavailable", error);
  }

  try {
    // Keep this query aligned with the live commerce_deals schema.
    const deals = (await supabaseAdmin<DealRow[]>(
      "commerce_deals?select=id,deal_title,revenue,status,created_at&order=created_at.desc&limit=24"
    )) ?? [];

    // commerce_deals currently has no URL/image columns, so it is not promoted to a clickable
    // storefront product until a canonical destination exists.
    for (const deal of deals.filter((item) => String(item.status || "").toLowerCase() !== "closed")) {
      if (!deal.id || !deal.deal_title) continue;
      console.info("[website-catalog] deal available without destination", { id: deal.id });
    }
  } catch (error) {
    console.error("[website-catalog] commerce_deals unavailable", error);
  }

  return products.filter((item) => item.url).sort((a, b) => b.score - a.score).slice(0, 60);
}

export const getWebsiteCatalog = unstable_cache(loadCatalog, ["agentflow-website-catalog"], {
  revalidate: 1800,
  tags: ["website-catalog"],
});
