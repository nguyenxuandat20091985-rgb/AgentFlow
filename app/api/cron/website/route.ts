import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getWebsiteCatalog } from "@/lib/website-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (secret && !isVercelCron && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    revalidateTag("website-catalog");
    const catalog = await getWebsiteCatalog();
    return NextResponse.json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      count: catalog.length,
      cron: "website",
      mode: "in-process",
    });
  } catch (error) {
    console.error("[website-cron] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "website_cron_failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
