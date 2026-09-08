import { NextResponse } from "next/server";
import { getWebsiteCatalog } from "@/lib/website-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getWebsiteCatalog();
    return NextResponse.json({ ok: true, updatedAt: new Date().toISOString(), count: catalog.length, items: catalog });
  } catch (error) {
    console.error("[website-catalog-api] failed", error);
    return NextResponse.json({ ok: false, error: "catalog_unavailable" }, { status: 500 });
  }
}
