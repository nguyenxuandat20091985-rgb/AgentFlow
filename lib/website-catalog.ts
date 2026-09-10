import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchAccessTradeDatafeeds, rankAffiliateOpportunities } from "@/lib/accesstrade";
import { fetchGoogleAffiliateSheetProducts } from "@/lib/google-affiliate-sheet";

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
  source: "accesstrade" | "sheet" | "deal";
  network: WebsiteNetwork;
  score: number;
};

const FALLBACK_CATALOG_URL =
  process.env.WEBSITE_CATALOG_FALLBACK_URL?.trim() ||
  "https://agentflow-l6cn1mzxt-nguyenxuandat20091985-rgbs-projects.vercel.app/api/website/catalog";

function detectNetwork(value: string | null | undefined): WebsiteNetwork {
  const text = String(value || "").toLowerCase();
  if (text.includes("shopee")) return "shopee";
  if (text.includes("lazada")) return "lazada";
  return "other";
}

function dedupeKey(product: WebsiteProduct) {
  return String(product.merchantUrl || product.url || "")
    .toLowerCase()
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

async function loadFallbackCatalog(): Promise<WebsiteProduct[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(FALLBACK_CATALOG_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`fallback catalog ${response.status}`);
    const body = await response.json().catch(() => null);
    const items = Array.isArray(body?.items) ? body.items : [];
    return items.filter((item: unknown): item is WebsiteProduct => {
      if (!item || typeof item !== "object") return false;
      const value = item as Partial<WebsiteProduct>;
      return Boolean(value.id && value.title && value.url);
    });
  } finally {
    clearTimeout(timer);
  }
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
    const sheetProducts = await fetchGoogleAffiliateSheetProducts(48);
    products.push(...sheetProducts);
    console.info("[website-catalog] Google Sheets affiliate feed loaded", {
      count: sheetProducts.length,
    });
  } catch (error) {
    console.error("[website-catalog] Google Sheets affiliate feed unavailable", error);
  }

  try {
    const deals = (await supabaseAdmin<DealRow[]>(
      "commerce_deals?select=id,deal_title,revenue,status,created_at&order=created_at.desc&limit=24"
    )) ?? [];

    for (const deal of deals.filter((item) => String(item.status || "").toLowerCase() !== "closed")) {
      if (!deal.id || !deal.deal_title) continue;
      console.info("[website-catalog] deal available without destination", { id: deal.id });
    }
  } catch (error) {
    console.error("[website-catalog] commerce_deals unavailable", error);
  }

  const unique = new Map<string, WebsiteProduct>();
  for (const product of products.filter((item) => item.url)) {
    const key = dedupeKey(product);
    const existing = unique.get(key);
    if (!existing || product.score > existing.score || (!existing.image && product.image)) {
      unique.set(key, product);
    }
  }

  const liveCatalog = [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 80);
  if (liveCatalog.length > 0) return liveCatalog;

  try {
    const fallback = await loadFallbackCatalog();
    if (fallback.length > 0) {
      console.warn("[website-catalog] Using resilient fallback catalog", {
        count: fallback.length,
      });
      return fallback.slice(0, 80);
    }
  } catch (error) {
    console.error("[website-catalog] Fallback catalog unavailable", error);
  }

  return [];
}

export const getWebsiteCatalog = unstable_cache(loadCatalog, ["agentflow-website-catalog"], {
  revalidate: 1800,
  tags: ["website-catalog"],
});
