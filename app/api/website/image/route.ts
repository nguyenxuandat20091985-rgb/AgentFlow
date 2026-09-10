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
    // Normalize legacy HTTP catalog URLs to HTTPS so an HTTPS storefront is
    // never blocked by the browser's mixed-content protection.
    if (url.protocol === "http:") url.protocol = "https:";
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !isPrivateHost(url.hostname) && hostMatches(url.hostname, allowed) ? url : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  const productId = request.nextUrl.searchParams.get("productId");

  if (!raw && !productId) return NextResponse.json({ ok: false, error: "missing_url" }, { status: 400 });

  try {
    const allowedImages = [...DEFAULT_ALLOWED_HOSTS, ...configuredHosts("WEBSITE_IMAGE_ALLOWED_HOSTS")];
    let target: URL | null = null;

    // Resolve by productId on the server so the image always comes from the
    // current catalog rather than trusting an arbitrary client URL.
    if (productId) {
      const product = (await getWebsiteCatalog()).find((item) => item.id === productId);
      if (product?.image) target = safeUrl(product.image, allowedImages);
    }

    if (!target && raw) target = safeUrl(raw, allowedImages);

    if (!target || target.protocol !== "https:" || isPrivateHost(target.hostname)) {
      return NextResponse.json({ ok: false, error: "blocked_url" }, { status: 400 });
    }

    // Do not depend on a third-party image proxy. The previous wsrv.nl
    // redirect was returning a blank image on some mobile networks. The
    // catalog image CDN already supports HTTPS, so send the browser directly
    // to the validated source URL.
    return NextResponse.redirect(target.toString(), 307);
  } catch (error) {
    console.error("[website-image] image redirect failed", error);
    return NextResponse.json({ ok: false, error: "image_proxy_failed" }, { status: 502 });
  }
}
