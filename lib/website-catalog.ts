import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchAccessTradeDatafeeds, rankAffiliateOpportunities, type AccessTradeFeedItem } from "@/lib/accesstrade";

type DealRow = {
  id?: string | number | null;
  deal_title?: string | null;
  revenue?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  url?: string | null;
  image?: string | null;
  category?: string | null;
};

export type WebsiteProduct = {
  id: string;
  title: string;
  price: number | null;
  discountRate: number;
  image: string | null;
  url: string | null;
  category: string;
  source: "accesstrade" | "deal";
  score: number;
};

async function loadCatalog(): Promise<WebsiteProduct[]> {
  const products: WebsiteProduct[] = [];

  try {
    const feed = rankAffiliateOpportunities(await fetchAccessTradeDatafeeds({ limit: 80 }));
    for (const item of feed.slice(0, 48)) {
      products.push({
        id: `at-${String(item.product_id ?? item.sku ?? Math.random())}`,
        title: item.name?.trim() || "Sản phẩm đang có ưu đãi",
        price: Number(item.price ?? 0) || null,
        discountRate: Number(item.discount_rate ?? 0) || 0,
        image: item.image || null,
        url: item.aff_link || item.url || null,
        category: item.category || "Ưu đãi nổi bật",
        source: "accesstrade",
        score: Number(item.opportunity_score ?? 0),
      });
    }
  } catch (error) {
    console.error("[website-catalog] AccessTrade unavailable", error);
  }

  try {
    // supabaseAdmin() returns null for an empty REST response, so normalize it
    // before filtering to keep the build/runtime type-safe.
    const deals = (await supabaseAdmin<DealRow[]>(
      "commerce_deals?select=id,deal_title,revenue,status,created_at,url,image,category&order=created_at.desc&limit=24"
    )) ?? [];

    for (const deal of deals.filter((item) => String(item.status || "").toLowerCase() !== "closed")) {
      products.push({
        id: `deal-${String(deal.id ?? Math.random())}`,
        title: deal.deal_title?.trim() || "Cơ hội mua sắm nổi bật",
        price: Number(deal.revenue ?? 0) || null,
        discountRate: 0,
        image: deal.image || null,
        url: deal.url || null,
        category: deal.category || "Deal mới",
        source: "deal",
        score: 10,
      });
    }
  } catch (error) {
    console.error("[website-catalog] commerce_deals unavailable", error);
  }

  return products
    .filter((item) => item.url)
    .sort((a, b) => b.score - a.score)
    .slice(0, 60);
}

export const getWebsiteCatalog = unstable_cache(loadCatalog, ["agentflow-website-catalog"], {
  revalidate: 1800,
  tags: ["website-catalog"],
});
