import { supabaseAdmin } from "@/lib/supabase-admin";
import { getWebsiteCatalog, type WebsiteProduct } from "@/lib/website-catalog";
import { publishOwnedCms } from "@/lib/publishers/owned-cms";

const DAILY_LIMIT = 10;

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function buildPost(product: WebsiteProduct) {
  const price = product.price ? `${new Intl.NumberFormat("vi-VN").format(product.price)}đ` : "giá đang cập nhật";
  const discount = product.discountRate > 0 ? ` đang có mức giảm khoảng ${product.discountRate}%` : "";
  const network = product.network === "shopee" ? "Shopee" : product.network === "lazada" ? "Lazada" : "nhà cung cấp";
  return {
    title: `Đánh giá nhanh: ${product.title}`,
    body: [
      `Nếu anh/chị đang tìm ${product.title}, đây là một lựa chọn đáng xem trên ${network}${discount}.`,
      "",
      `Giá tham khảo: ${price}. Giá và ưu đãi có thể thay đổi theo thời điểm.`,
      "",
      "AgentFlow tổng hợp thông tin để người mua tự kiểm tra nhu cầu, giá, đánh giá và điều kiện giao hàng trước khi quyết định.",
      "",
      "Nếu sản phẩm phù hợp, có thể mở link bên dưới để xem thông tin và ưu đãi hiện tại.",
    ].join("\n"),
  };
}

async function alreadyPublished(productId: string) {
  const rows = await supabaseAdmin<Array<{ id: string }>>(
    `website_published_posts?select=id&product_id=eq.${encodeURIComponent(productId)}&limit=1`,
  );
  return Array.isArray(rows) && rows.length > 0;
}

export type EarningAutopilotReport = {
  ok: true;
  day: string;
  catalogSize: number;
  selected: number;
  published: number;
  skipped: number;
  failed: number;
  items: Array<Record<string, unknown>>;
};

export async function runEarningAutopilot(limit = DAILY_LIMIT): Promise<EarningAutopilotReport> {
  const safeLimit = Math.min(Math.max(limit, 1), DAILY_LIMIT);
  const catalog = await getWebsiteCatalog();
  const items: Array<Record<string, unknown>> = [];
  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of catalog.slice(0, safeLimit)) {
    try {
      if (await alreadyPublished(product.id)) {
        skipped += 1;
        items.push({ productId: product.id, title: product.title, status: "skipped", reason: "already published" });
        continue;
      }

      const post = buildPost(product);
      const result = await publishOwnedCms({
        title: post.title,
        body: post.body,
        destinationId: "owned_blog",
        queueActionId: `earning-${dayKey()}-${product.id}`,
        affiliateLink: product.url,
        productId: product.id,
        productName: product.title,
        sourceUrl: product.merchantUrl || product.url,
        priority: "high",
      });

      published += 1;
      items.push({
        productId: product.id,
        title: product.title,
        status: "published",
        url: result.publishedUrl,
      });
    } catch (error) {
      failed += 1;
      items.push({
        productId: product.id,
        title: product.title,
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    await supabaseAdmin("agent_task_runs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        agent_id: "salesbot",
        task_type: "earning_autopilot",
        status: failed > 0 && published === 0 ? "failed" : "completed",
        input_snapshot: { day: dayKey(), limit: safeLimit, catalogSize: catalog.length },
        output: { published, skipped, failed, items },
      }),
    });
  } catch {
    // Reporting failure must not undo successful publications.
  }

  return {
    ok: true,
    day: dayKey(),
    catalogSize: catalog.length,
    selected: Math.min(catalog.length, safeLimit),
    published,
    skipped,
    failed,
    items,
  };
}
