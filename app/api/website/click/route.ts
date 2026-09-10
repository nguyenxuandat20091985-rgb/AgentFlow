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

  try {
    await supabaseAdmin("website_click_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        product_id: productId,
        network: networkFor(destination.hostname),
        source: request.nextUrl.searchParams.get("source")?.slice(0, 80) || "website",
        referrer: request.headers.get("referer")?.slice(0, 500) || null,
        path: request.headers.get("x-forwarded-uri")?.slice(0, 500) || "/website",
      }),
    });
  } catch (error) {
    console.warn("[website-click] tracking failed", { error: error instanceof Error ? error.message : String(error) });
  }

  // Some legacy AccessTrade/isclix deep links can return a browser-level
  // "Not Allowed" page even though the merchant URL is still valid. Do not
  // send a customer into a dead page: when a trusted merchant fallback is
  // available, prefer it for isclix destinations. The fallback stays strictly
  // allowlisted above, so this cannot become an open redirect.
  if ((destination.hostname === "go.isclix.com" || destination.hostname === "isclix.com") && fallback) {
    return NextResponse.redirect(fallback, 302);
  }

  return NextResponse.redirect(destination, 302);
}
