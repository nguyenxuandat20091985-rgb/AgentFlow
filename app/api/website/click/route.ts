import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_HOSTS = [
  "shopee.vn",
  "lazada.vn",
  "accesstrade.vn",
  "fast.accesstrade.com.vn",
  "go.isclix.com",
  "isclix.com",
  "shopee.com",
  "lazada.com",
];

const FALLBACK_ALLOWED_HOSTS = ["30shinestore.com"];

function safeDestination(raw: string, allowedHosts = ALLOWED_HOSTS) {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const allowed = allowedHosts.some((domain) => host === domain || host.endsWith(`.${domain}`));
    if (url.protocol !== "https:" || !allowed || url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * ACCESSTRADE has used both the legacy isclix host and the newer
 * fast.accesstrade.com.vn host for deep links. Keep the tracking path/query,
 * but move legacy links to the current AT host instead of sending every
 * product to one merchant fallback.
 */
function normalizeAffiliateDestination(url: URL) {
  const host = url.hostname.toLowerCase();
  if (host === "go.isclix.com" || host === "isclix.com") {
    url.hostname = "fast.accesstrade.com.vn";
  }
  return url;
}

function networkFor(hostname: string) {
  const host = hostname.toLowerCase();
  if (host.includes("shopee")) return "shopee";
  if (host.includes("lazada")) return "lazada";
  return "affiliate";
}

export async function GET(request: NextRequest) {
  const destination = safeDestination(request.nextUrl.searchParams.get("url") || "");
  const fallback = safeDestination(request.nextUrl.searchParams.get("fallback") || "", FALLBACK_ALLOWED_HOSTS);
  const productId = (request.nextUrl.searchParams.get("productId") || "unknown").slice(0, 160);

  if (!destination) {
    if (fallback) return NextResponse.redirect(fallback, 302);
    return NextResponse.json({ ok: false, error: "blocked_destination" }, { status: 400 });
  }

  const normalizedDestination = normalizeAffiliateDestination(destination);

  try {
    await supabaseAdmin("website_click_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        product_id: productId,
        network: networkFor(normalizedDestination.hostname),
        source: request.nextUrl.searchParams.get("source")?.slice(0, 80) || "website",
        referrer: request.headers.get("referer")?.slice(0, 500) || null,
        path: request.headers.get("x-forwarded-uri")?.slice(0, 500) || "/website",
      }),
    });
  } catch (error) {
    console.warn("[website-click] tracking failed", { error: error instanceof Error ? error.message : String(error) });
  }

  // Do NOT blindly redirect all AccessTrade/isclix links to 30Shine.
  // That made all 48 cards appear to have the same destination and could
  // destroy affiliate tracking. Legacy isclix links are normalized above.
  return NextResponse.redirect(normalizedDestination, 302);
}
