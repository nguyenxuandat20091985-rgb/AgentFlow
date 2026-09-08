import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.AGENTFLOW_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    return NextResponse.json({ ok: false, error: "missing_app_url" }, { status: 500 });
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/website/refresh`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
    return NextResponse.json(body, { status: response.ok ? 200 : 502 });
  } catch (error) {
    console.error("[website-cron] failed", error);
    return NextResponse.json({ ok: false, error: "website_cron_failed" }, { status: 500 });
  }
}
