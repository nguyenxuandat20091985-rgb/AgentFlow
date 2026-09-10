import { NextRequest, NextResponse } from "next/server";
import { getWebsiteCatalog } from "@/lib/website-catalog";

export const runtime = "nodejs";
export const revalidate = 3600;

const DEFAULT_ALLOWED_HOSTS = [
  "shopee.vn",
  "lazada.vn",
  "accesstrade.vn",
  "susercontent.com",
  "alicdn.com",
  "img.lazcdn.com",
  "lzd-img-global.slatic.net",
  "cf.shopee.vn",
  "down-vn.img.susercontent.com",
  "hstatic.net",
  "product.hstatic.net",
  "images-na.ssl-images-amazon.com",
];

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost") || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function hostMatches(hostname: string, domains: string[]) {
  const host = hostname.toLowerCase();
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function configuredHosts(name: string) {
  return (process.env[name] || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function safeUrl(value: string, allowed: string[]) {
  try {
    const normalized = value.trim().startsWith("//") ? `https:${value.trim()}` : value.trim();
    const url = new URL(normalized);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !isPrivateHost(url.hostname) && hostMatches(url.hostname, allowed) ? url : null;
  } catch {
    return null;
  }
}

// AccessTrade supplies the image URL. The browser does not fetch that CDN
// directly; wsrv.nl fetches and caches the public image, avoiding broken
// hotlink/CDN/TLS behavior while keeping the catalog source unchanged.
function imageCdnUrl(source: URL) {
  const params = new URLSearchParams({ url: source.toString(), w: "900", h: "900", fit: "cover", output: "webp", q: "85" });
  return `https://images.weserv.nl/?${params.toString()}`;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  const productId = request.nextUrl.searchParams.get("productId");

  if (!raw && !productId) return NextResponse.json({ ok: false, error: "missing_url" }, { status: 400 });

  try {
    let target: URL | null = null;

    // Resolve by productId on the server so the image always comes from the
    // current AccessTrade catalog rather than a client-supplied arbitrary URL.
    if (productId) {
      const product = (await getWebsiteCatalog()).find((item) => item.id === productId);
      target = product?.image ? new URL(product.image) : null;
    }

    if (!target && raw) {
      const allowedImages = [...DEFAULT_ALLOWED_HOSTS, ...configuredHosts("WEBSITE_IMAGE_ALLOWED_HOSTS")];
      target = safeUrl(raw, allowedImages);
    }

    if (!target || target.protocol !== "https:" && target.protocol !== "http:" || isPrivateHost(target.hostname)) {
      return NextResponse.json({ ok: false, error: "blocked_url" }, { status: 400 });
    }

    return NextResponse.redirect(imageCdnUrl(target), 307);
  } catch (error) {
    console.error("[website-image] image CDN redirect failed", error);
    return NextResponse.json({ ok: false, error: "image_proxy_failed" }, { status: 502 });
  }
}
