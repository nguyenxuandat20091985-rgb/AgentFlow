/**
 * Seed research opportunities — hypothesis only, never revenue.
 */
import { buildOpportunityFromSignal, buildDraftBusinessCase } from "@/lib/ceo/opportunity/engine";
import { factoryRecordOpportunity, factoryRecordBusinessCase } from "@/lib/ceo/factory";
import { persistOpportunity, persistBusinessCase } from "@/lib/ceo/persistence/store";

const SEEDS = [
  {
    id: "opp_shopee_kitchen_2026",
    title: "Shopee kitchen appliances comparison cluster",
    summary: "Cluster nồi chiên / máy ép / gia dụng — content SEO + affiliate Shopee, biên hoa hồng công khai.",
    domain: "affiliate",
    region: "VN",
    confidence: 0.55,
  },
  {
    id: "opp_tiktok_short_review",
    title: "TikTok short product review → website",
    summary: "Script ngắn review công khai sản phẩm → CTA về storefront owned; không spam inbox.",
    domain: "social",
    region: "VN",
    confidence: 0.5,
  },
  {
    id: "opp_local_seo_city",
    title: "Local SEO city landing pages",
    summary: "Landing theo nhu cầu địa phương (mua X tại [tỉnh]) kéo organic → affiliate/lead.",
    domain: "seo",
    region: "VN",
    confidence: 0.45,
  },
  {
    id: "opp_newsletter_deals",
    title: "Weekly deals newsletter",
    summary: "Bản tin deal công khai opt-in → click affiliate; không mua list email.",
    domain: "email",
    region: "VN",
    confidence: 0.48,
  },
  {
    id: "opp_youtube_longform",
    title: "YouTube long-form how-to / unbox",
    summary: "Script dài SEO + description affiliate; xây traffic bền vững.",
    domain: "content",
    region: "VN",
    confidence: 0.5,
  },
] as const;

export async function seedOpportunityCatalog(): Promise<{
  ok: true;
  opportunities: number;
  businessCases: number;
  errors: string[];
}> {
  let opportunities = 0;
  let businessCases = 0;
  const errors: string[] = [];

  for (const seed of SEEDS) {
    const built = buildOpportunityFromSignal({
      id: seed.id,
      title: seed.title,
      summary: seed.summary,
      domain: seed.domain,
      region: seed.region,
      confidence: seed.confidence,
      provider: "ceo_seed_catalog",
    });
    if (!built.ok) {
      errors.push(`${seed.id}: ${built.errors.join("; ")}`);
      continue;
    }
    const rec = factoryRecordOpportunity(built.opportunity);
    if (!rec.ok) {
      errors.push(`${seed.id}: ${rec.errors.join("; ")}`);
      continue;
    }
    await persistOpportunity(rec.value);
    opportunities += 1;

    const bc = buildDraftBusinessCase({
      id: `bc_${seed.id.replace(/^opp_/, "")}`,
      opportunityId: seed.id,
      title: `Forecast: ${seed.title}`,
      monthlyTraffic: 2000,
      conversionRate: 0.008,
      averageOrderValueVnd: 350_000,
      infrastructureCostVnd: 300_000,
      aiCostVnd: 150_000,
    });
    if (bc.ok) {
      const brec = factoryRecordBusinessCase(bc.businessCase);
      if (brec.ok) {
        await persistBusinessCase(brec.value);
        businessCases += 1;
      }
    }
  }

  return { ok: true, opportunities, businessCases, errors };
}
