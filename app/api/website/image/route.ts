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

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost") || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function isAllowedHost(hostname: string) {
  const host = hostname.toLowerCase();
  const configured = (process.env.WEBSITE_IMAGE_ALLOWED_HOSTS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return [...DEFAULT_ALLOWED_HOSTS, ...configured].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function safeUrl(value: string) {
  try {
    const normalized = value.trim().startsWith("//") ? `https:${value.trim()}` : value.trim();
    const url = new URL(normalized);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !isPrivateHost(url.hostname) && isAllowedHost(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

async function fetchImage(target: URL) {
  let current = target;
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await fetch(current.toString(), {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "AgentFlow-Website/1.0",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      cache: "force-cache",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location ? safeUrl(new URL(location, current).toString()) : null;
      if (!next) return null;
      current = next;
      continue;
    }
    return response;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ ok: false, error: "missing_url" }, { status: 400 });

  const target = safeUrl(raw);
  if (!target) return NextResponse.json({ ok: false, error: "blocked_url" }, { status: 400 });

  try {
    const response = await fetchImage(target);
    if (!response) return NextResponse.json({ ok: false, error: "blocked_redirect" }, { status: 502 });
    if (!response.ok) return NextResponse.json({ ok: false, error: "upstream_image_failed", status: response.status }, { status: 502 });

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (!contentType.startsWith("image/")) return NextResponse.json({ ok: false, error: "not_an_image" }, { status: 415 });
    if (contentLength > 8 * 1024 * 1024) return NextResponse.json({ ok: false, error: "image_too_large" }, { status: 413 });

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[website-image] proxy failed", error);
    return NextResponse.json({ ok: false, error: "image_proxy_failed" }, { status: 502 });
  }
}
