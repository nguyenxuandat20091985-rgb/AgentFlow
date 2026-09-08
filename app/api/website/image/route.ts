import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 3600;

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local") || host.endsWith(".internal");
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ ok: false, error: "missing_url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }

  if (!(target.protocol === "https:" || target.protocol === "http:") || isBlockedHost(target.hostname)) {
    return NextResponse.json({ ok: false, error: "blocked_url" }, { status: 400 });
  }

  try {
    const response = await fetch(target.toString(), {
      headers: { Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      cache: "force-cache",
    });

    if (!response.ok) return NextResponse.json({ ok: false, error: "upstream_image_failed", status: response.status }, { status: 502 });

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return NextResponse.json({ ok: false, error: "not_an_image" }, { status: 415 });

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[website-image] proxy failed", error);
    return NextResponse.json({ ok: false, error: "image_proxy_failed" }, { status: 502 });
  }
}
