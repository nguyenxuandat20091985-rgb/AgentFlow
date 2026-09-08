import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getWebsiteCatalog } from "@/lib/website-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    revalidateTag("website-catalog");
    const catalog = await getWebsiteCatalog();
    return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString(), count: catalog.length });
  } catch (error) {
    console.error("[website-refresh] failed", error);
    return NextResponse.json({ ok: false, error: "website_refresh_failed" }, { status: 500 });
  }
}
