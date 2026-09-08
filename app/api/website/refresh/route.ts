import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getWebsiteCatalog } from "@/lib/website-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const workerSecret = process.env.AGENT_HEARTBEAT_SECRET;
  const allowed = [cronSecret, workerSecret].filter(Boolean).map((value) => `Bearer ${value}`);

  if (allowed.length > 0 && !allowed.includes(auth || "")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Keep this compatible with the installed Next.js cache API.
    revalidateTag("website-catalog");
    const catalog = await getWebsiteCatalog();

    return NextResponse.json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      count: catalog.length,
    });
  } catch (error) {
    console.error("[website-refresh] failed", error);
    return NextResponse.json(
      { ok: false, error: "website_refresh_failed" },
      { status: 500 },
    );
  }
}
