import type { AccessTradeFeedItem } from "@/lib/accesstrade";
import type { WebsiteSignal } from "@/lib/website-hunter";
import type { OutreachDestination } from "./policy";

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
    for (const term of signal.matched_terms) {
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

function buildReplyBody(signal: WebsiteSignal, product: AccessTradeFeedItem | null): string {
  const lines: string[] = [];
  lines.push(`Về câu hỏi: "${signal.title.slice(0, 120)}"`);
  lines.push("");
  lines.push(
    "Mình trả lời theo hướng thực dụng: nên chọn theo nhu cầu sử dụng (dung tích / công suất / dễ vệ sinh), ngân sách, và chính sách bảo hành/đổi trả của nhà bán.",
  );
  lines.push("");
  if (product?.name) {
    const price = formatPrice(product);
    lines.push(
      `Nếu đang cân nhắc phân khúc gia dụng, một lựa chọn đang có deal là **${product.name}**${price ? ` (khoảng ${price})` : ""}.`,
    );
    if (product.desc) {
      lines.push(String(product.desc).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280));
    }
    if (product.aff_link) {
      lines.push("");
      lines.push(`Link tham khảo (affiliate): ${product.aff_link}`);
    }
  } else {
    lines.push("Hiện chưa khớp sản phẩm affiliate cụ thể — nên so sánh 2–3 model cùng phân khúc trước khi chốt.");
  }
  lines.push("");
  lines.push("Lưu ý: đây là gợi ý thông tin, không phải spam. Hãy tự kiểm tra rule cộng đồng trước khi đăng.");
  return lines.join("\n");
}

function buildSeoBody(product: AccessTradeFeedItem): string {
  const price = formatPrice(product);
  const name = String(product.name ?? "Sản phẩm gia dụng");
  return [
    `# ${name}${price ? ` — giá khoảng ${price}` : ""}`,
    "",
    "## Phù hợp với ai",
    "- Gia đình cần đồ gia dụng bền, dễ vệ sinh",
    "- Người mua quan tâm deal / hoàn tiền affiliate uy tín",
    "",
    "## Điểm cần xem trước khi mua",
    "1. Công suất / dung tích theo nhu cầu thực tế",
    "2. Chính sách bảo hành và đổi trả",
    "3. Đánh giá gần đây từ người dùng thật",
    "",
    product.desc
      ? String(product.desc).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400)
      : "",
    "",
    product.aff_link ? `CTA affiliate: ${product.aff_link}` : "CTA: cập nhật link AccessTrade khi có.",
    "",
    "*Nội dung do AI Website soạn dạng draft — chưa publish.*",
  ]
    .filter(Boolean)
    .join("\n");
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
        if (signal.source_url && !destinationAllowsOrOwned(dest, signal.source_url)) continue;
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
          complianceNotes: [
            "draft_only",
            "verify community rules before post",
            dest.notes,
          ],
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
          title: `Content draft: ${String(product.name).slice(0, 120)}`,
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

function destinationAllowsOrOwned(dest: OutreachDestination, url: string): boolean {
  if (dest.kind === "owned_storefront" || dest.kind === "owned_blog" || dest.kind === "manual_only") return true;
  try {
    // inline to avoid circular import style issues in some bundlers
    const { destinationAllowsHost } = require("./policy") as typeof import("./policy");
    return destinationAllowsHost(dest, url);
  } catch {
    return false;
  }
}
