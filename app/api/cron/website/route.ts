import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resolveBaseUrl(request: Request): string | null {
  const fromEnv =
    process.env.AGENTFLOW_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  try {
    const u = new URL(request.url);
    if (u.origin && u.origin !== "null") return u.origin;
  } catch {
    /* ignore */
  }
  return null;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  // Vercel Cron sends x-vercel-cron; also allow Bearer secret when set
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (secret && !isVercelCron && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = resolveBaseUrl(request);
  if (!baseUrl) {
    return NextResponse.json({ ok: false, error: "missing_app_url" }, { status: 500 });
  }

  try {
    const headers: Record<string, string> = { "cache-control": "no-store" };
    if (secret) headers.Authorization = `Bearer ${secret}`;
    if (isVercelCron) headers["x-vercel-cron"] = "1";

    const response = await fetch(`${baseUrl}/api/website/refresh`, {
      headers,
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
    return NextResponse.json(
      { ...body, baseUrl, cron: "website" },
      { status: response.ok ? 200 : 502 },
    );
  } catch (error) {
    console.error("[website-cron] failed", error);
    return NextResponse.json(
      { ok: false, error: "website_cron_failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
