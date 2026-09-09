import type { AccessTradeFeedItem } from "@/lib/accesstrade";
import type { WebsiteSignal } from "@/lib/website-hunter";
import { destinationAllowsHost, type OutreachDestination } from "./policy";

export type OutreachDraft = {
  type: "website_outreach_post_draft";
  priority: "low" | "medium" | "high";
  channel: "website";
  execution: "draft_only";
  destinationId: string;
  destinationName: string;
  sourceId: string;
  sourceType: string;
  sourceUrl: string | null;
  title: string;
  body: string;
  productId: string | null;
  productName: string | null;
  affiliateLink: string | null;
  intentScore: number | null;
  matchedTerms: string[];
  complianceNotes: string[];
};

function pickProduct(products: AccessTradeFeedItem[], signal?: WebsiteSignal): AccessTradeFeedItem | null {
  if (!products.length) return null;
  if (!signal) return products[0] ?? null;
  const hay = `${signal.title} ${signal.body} ${signal.matched_terms.join(" ")}`.toLowerCase();
  const scored = products.map((p) => {
    const name = String(p.name ?? "").toLowerCase();
    const cat = String(p.category ?? "").toLowerCase();
    let s = Number((p as { opportunity_score?: number }).opportunity_score ?? 0);
    if (name && hay.includes(name.slice(0, Math.min(12, name.length)))) s += 20;
    if (cat && hay.includes(cat)) s += 10;
    for (const of signal.matched_terms) {
      if (name.includes(term.toLowerCase()) || cat.includes(term.toLowerCase())) s += 8;
    }
    return { p, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0]?.p ?? products[0] ?? null;
}

function formatPrice(item: AccessTradeFeedItem): string {
  const price = Number(item.discount ?? item.price ?? 0);
  if (!price) return "";
  return new Intl.NumberFormat("vi-VN").format(price) + "₫";
}

function audienceLine(product: AccessTradeFeedItem): string {
  const name = String(product.name ?? "").toLowerCase();
  const cat = String(product.category ?? "").toLowerCase();
  if (/toc|gôm|gom|say toc|sấy|rua mat|rửa mặt|cao rau|cạo râu|my pham|mỹ phẩm|skin|men/.test(name + cat)) {
    return "- Nam giới / người dùng quan tâm chăm sóc cá nhân, tóc & da mặt";
  }
h  if (/bep|nồi|noi|bếp|lau nha|gia dung|nhà bếp/.test(name + cat)) {
    return "- Gia đình cần đồ gia dụng bền, dễ vệ sinh";
  }
  return "- Người mua đang tìm deal / hoàn tiền affiliate uy tín";
}

function buildReplyBody(signal: WebsiteSignal, product: AccessTradeFeedItem | null): string {
  const lines: string[] = [];
  lines.push(`Về câu hỏi: "${signal.title.slice(0, 120)}"`);
  lines.push("");
  lines.push(
    "Trả lời thực dụng: chọn theo nhu cầu thật, ngân sách, và chính sách bảo hành/đổi trả của nhà bán.",
  );
  lines.push("");
  if (product?.name) {
    const price = formatPrice(product);
    lines.push(
      `Một lựa chọn đang có trên kênh affiliate: **${product.name}**${price ? ` (khoảng ${price})` : ""}.`,
    );
    if (product.desc) {
      lines.push(String(product.desc).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280));
    }
    if (product.aff_link) {
      lines.push("");
      lines.push(`Link tham khảo (affiliate): ${product.aff_link}`);
    }
  } else {
    lines.push("Chưa khớp sản phẩm cụ thể — nên so sánh 2–3 model cùng phân khúc trước khi chốt.");
  }
  lines.push("");
  lines.push("Lưu ý: gợi ý thông tin, không spam. Kiểm tra rule cộng đồng trước khi đăng.");
  return lines.join("\n");
}

function buildSeoBody(product: AccessTradeFeedItem): string {
  const price = formatPrice(product);
  const name = String(product.name ?? "Sản phẩm");
  const desc = product.desc
    ? String(product.desc).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 420)
    : "";
  return [
    `# ${name}${price ? ` — giá khoảng ${price}` : ""}`,
    "",
    "## Phù hợp với ai",
    audienceLine(product),
    "- Người mua quan tâm deal / hoàn tiền affiliate uy tín",
    "",
    "## Điểm cần xem trước khi mua",
    "1. Thông số / dung tích / công suất theo nhu cầu",
    "2. Chính sách bảo hành và đổi trả",
    "3. Đánh giá gần đây từ người dùng thật",
    "",
    desc,
    "",
    product.aff_link ? `CTA affiliate: ${product.aff_link}` : "CTA: cập nhật link AccessTrade khi có.",
    "",
    "*Nội dung do AI Website soạn — đăng trên kênh sở hữu sau khi AI CEO duyệt.*",
  ]
    .filter(Boolean)
    .join("\n");
}

function allowsSignalHost(dest: OutreachDestination, url: string): boolean {
  if (dest.kind === "owned_storefront" || dest.kind === "owned_blog" || dest.kind === "manual_only") return true;
  return destinationAllowsHost(dest, url);
}

export function buildOutreachDrafts(options: {
  destinations: OutreachDestination[];
  signals: WebsiteSignal[];
  products: AccessTradeFeedItem[];
}): OutreachDraft[] {
  const { destinations, signals, products } = options;
  const drafts: OutreachDraft[] = [];
  const enabled = destinations.filter((d) => d.enabled);

  for (const dest of enabled) {
    let count = 0;
    if (dest.kind === "public_rss_reply_draft") {
      for (const signal of signals) {
        if (count >= dest.maxDraftsPerCycle) break;
        if (signal.intent_score < 30) continue;
        if (signal.source_url && !allowsSignalHost(dest, signal.source_url)) continue;
        const product = pickProduct(products, signal);
        drafts.push({
          type: "website_outreach_post_draft",
          priority: signal.intent_score >= 60 ? "high" : "medium",
          channel: "website",
          execution: "draft_only",
          destinationId: dest.id,
          destinationName: dest.name,
          sourceId: signal.external_id,
          sourceType: signal.source,
          sourceUrl: signal.source_url,
          title: `Reply draft: ${signal.title.slice(0, 120)}`,
          body: buildReplyBody(signal, product),
          productId: product?.product_id != null ? String(product.product_id) : null,
          productName: product?.name ? String(product.name) : null,
          affiliateLink: product?.aff_link ? String(product.aff_link) : null,
          intentScore: signal.intent_score,
          matchedTerms: signal.matched_terms,
          complianceNotes: ["draft_only", "verify community rules before post", dest.notes],
        });
        count += 1;
      }
    } else if (dest.kind === "owned_blog" || dest.kind === "owned_storefront") {
      for (const product of products.slice(0, dest.maxDraftsPerCycle)) {
        if (!product.name) continue;
        drafts.push({
          type: "website_outreach_post_draft",
          priority: Number((product as { opportunity_score?: number }).opportunity_score ?? 0) >= 25 ? "high" : "medium",
          channel: "website",
          execution: "draft_only",
          destinationId: dest.id,
          destinationName: dest.name,
          sourceId: String(product.product_id ?? product.sku ?? product.name),
          sourceType: "affiliate_product",
          sourceUrl: product.url ? String(product.url) : null,
          title: String(product.name).slice(0, 120),
          body: buildSeoBody(product),
          productId: product.product_id != null ? String(product.product_id) : null,
          productName: String(product.name),
          affiliateLink: product.aff_link ? String(product.aff_link) : null,
          intentScore: null,
          matchedTerms: [],
          complianceNotes: ["draft_only", "owned property only", dest.notes],
        });
        count += 1;
      }
    } else if (dest.kind === "manual_only") {
      for (const signal of signals.slice(0, dest.maxDraftsPerCycle)) {
        const product = pickProduct(products, signal);
        drafts.push({
          type: "website_outreach_post_draft",
          priority: "medium",
          channel: "website",
          execution: "draft_only",
          destinationId: dest.id,
          destinationName: dest.name,
          sourceId: signal.external_id,
          sourceType: signal.source,
          sourceUrl: signal.source_url,
          title: `Manual channel draft: ${signal.title.slice(0, 100)}`,
          body: buildReplyBody(signal, product),
          productId: product?.product_id != null ? String(product.product_id) : null,
          productName: product?.name ? String(product.name) : null,
          affiliateLink: product?.aff_link ? String(product.aff_link) : null,
          intentScore: signal.intent_score,
          matchedTerms: signal.matched_terms,
          complianceNotes: ["draft_only", "manual publish only", "operator must allow the target channel", dest.notes],
        });
        count += 1;
      }
    }
  }

  return drafts;
}
