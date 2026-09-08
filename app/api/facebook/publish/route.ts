import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { facebookPublishingConfigured, publishFacebookPagePost } from "@/lib/facebook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const autoPublishEnabled = () => process.env.FACEBOOK_AUTOPUBLISH_ENABLED !== "false";

function authorized(request: NextRequest) {
  const expected = process.env.AGENT_HEARTBEAT_SECRET;
  const auth = request.headers.get("authorization") || "";
  const supplied = request.headers.get("x-agent-heartbeat-secret");
  return Boolean(expected && (supplied === expected || auth === `Bearer ${expected}`));
}

function composePost(payload: Record<string, unknown>) {
  const name = String(payload.name || payload.title || "Deal nổi bật").trim();
  const category = String(payload.category || "đồ gia dụng").trim();
  const price = Number(payload.price || 0);
  const priceText = price > 0 ? ` Giá tham khảo: ${price.toLocaleString("vi-VN")} ₫.` : "";
  const score = Number(payload.opportunityScore || 0);
  const hook = score >= 25 ? "Deal đang được AI ưu tiên theo tín hiệu cơ hội." : "Một lựa chọn đáng xem trong nhóm sản phẩm hôm nay.";
  return `🍳 Nhà Bếp Thông Minh | ${name}\n\n${hook} Nhóm: ${category}.${priceText}\n\nXem thông tin và ưu đãi trên website Nhà Bếp Thông Minh. Link sản phẩm được cung cấp từ hệ thống affiliate và chỉ dùng dữ liệu thực tế.\n\n#NhaBepThongMinh #DealGiaDung #Affiliate`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, configured: facebookPublishingConfigured(), mode: autoPublishEnabled() ? "auto" : "approval" });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  if (!autoPublishEnabled()) {
    return NextResponse.json({ ok: true, status: "skipped", reason: "facebook_auto_publish_disabled", configured: facebookPublishingConfigured() });
  }
  if (!facebookPublishingConfigured()) {
    return NextResponse.json({ ok: true, status: "skipped", reason: "facebook_token_not_configured" });
  }

  try {
    const rows = await supabaseAdmin<Array<{ id: string; payload: Record<string, unknown>; source_id?: string | null }>>(
      "agent_action_queue?select=id,payload,source_id&agent_id=eq.marketing&channel=eq.facebook&status=eq.pending&action_type=in.(facebook_affiliate_campaign_draft,facebook_campaign_content_draft,facebook_affiliate_content_draft)&order=priority.desc,created_at.asc&limit=1"
    );
    const action = rows?.[0];
    if (!action) return NextResponse.json({ ok: true, status: "idle", reason: "no_pending_facebook_action" });

    const payload = action.payload || {};
    const link = typeof payload.affiliateLink === "string" && payload.affiliateLink.startsWith("http") ? payload.affiliateLink : null;
    const message = composePost(payload);
    const published = await publishFacebookPagePost(message, link);

    await supabaseAdmin(
      `agent_action_queue?id=eq.${encodeURIComponent(action.id)}`,
      { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "executed", updated_at: new Date().toISOString(), payload: { ...payload, facebookPostId: published.id, publishedAt: new Date().toISOString() } }) }
    );

    return NextResponse.json({ ok: true, status: "published", agentId: "marketing", actionId: action.id, facebookPostId: published.id, pageName: published.pageName });
  } catch (error) {
    console.error("[facebook-publish]", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "facebook_publish_failed" }, { status: 502 });
  }
}
