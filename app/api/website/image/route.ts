import { NextRequest, NextResponse } from "next/server";

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

const DEFAULT_MERCHANT_HOSTS = ["30shinestore.com"];

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

async function fetchImage(target: URL) {
  const allowed = [...DEFAULT_ALLOWED_HOSTS, ...configuredHosts("WEBSITE_IMAGE_ALLOWED_HOSTS")];
  let current = target;
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await fetch(current.toString(), {
      headers: { Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8", "User-Agent": "AgentFlow-Website/1.0" },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      cache: "force-cache",
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location ? safeUrl(new URL(location, current).toString(), allowed) : null;
      if (!next) return null;
      current = next;
      continue;
    }
    return response;
  }
  return null;
}

async function findOgImage(merchant: URL) {
  const response = await fetch(merchant.toString(), {
    headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "Mozilla/5.0 (compatible; AgentFlow-Website/1.0)" },
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
    cache: "force-cache",
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    const allowed = [...DEFAULT_MERCHANT_HOSTS, ...configuredHosts("WEBSITE_MERCHANT_ALLOWED_HOSTS")];
    const next = location ? safeUrl(new URL(location, merchant).toString(), allowed) : null;
    if (!next) return null;
    return findOgImage(next);
  }
  if (!response.ok) return null;
  const html = (await response.text()).slice(0, 2_000_000);
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
  ];
  const allowedImages = [...DEFAULT_ALLOWED_HOSTS, ...configuredHosts("WEBSITE_IMAGE_ALLOWED_HOSTS"), ...DEFAULT_MERCHANT_HOSTS, ...configuredHosts("WEBSITE_MERCHANT_ALLOWED_HOSTS")];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const candidate = match?.[1];
    if (candidate) {
      const image = safeUrl(new URL(candidate, merchant).toString(), allowedImages);
      if (image) return image;
    }
  }
  return null;
}

async function respondWithImage(response: Response) {
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (!contentType.startsWith("image/") || contentLength > 8 * 1024 * 1024) return null;
  return new NextResponse(response.body, { status: 200, headers: { "Content-Type": contentType, "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", "X-Content-Type-Options": "nosniff" } });
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  const rawFallback = request.nextUrl.searchParams.get("fallback");
  if (!raw) return NextResponse.json({ ok: false, error: "missing_url" }, { status: 400 });

  const allowedImages = [...DEFAULT_ALLOWED_HOSTS, ...configuredHosts("WEBSITE_IMAGE_ALLOWED_HOSTS")];
  const target = safeUrl(raw, allowedImages);
  if (!target) return NextResponse.json({ ok: false, error: "blocked_url" }, { status: 400 });

  try {
    const direct = await fetchImage(target);
    const directResult = direct ? await respondWithImage(direct) : null;
    if (directResult) return directResult;

    if (rawFallback) {
      const merchantAllowed = [...DEFAULT_MERCHANT_HOSTS, ...configuredHosts("WEBSITE_MERCHANT_ALLOWED_HOSTS")];
      const merchant = safeUrl(rawFallback, merchantAllowed);
      if (merchant) {
        const ogImage = await findOgImage(merchant);
        if (ogImage) {
          const fallbackResponse = await fetchImage(ogImage);
          const fallbackResult = fallbackResponse ? await respondWithImage(fallbackResponse) : null;
          if (fallbackResult) return fallbackResult;
        }
      }
    }

    return NextResponse.json({ ok: false, error: "image_unavailable" }, { status: 502 });
  } catch (error) {
    console.error("[website-image] proxy failed", error);
    return NextResponse.json({ ok: false, error: "image_proxy_failed" }, { status: 502 });
  }
}
