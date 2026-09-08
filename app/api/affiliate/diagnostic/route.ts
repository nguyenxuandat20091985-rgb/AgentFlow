import { NextResponse } from "next/server";
import { fetchAccessTradeDatafeeds } from "@/lib/accesstrade";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Safe AccessTrade connectivity diagnostic.
 *
 * This endpoint never returns the API key or the full provider payload.
 * It is protected by the same worker secret used by the automation loop.
 */
export async function GET(request: Request) {
  const expectedSecret = process.env.AGENT_HEARTBEAT_SECRET?.trim();
  const suppliedSecret = request.headers.get("x-agent-heartbeat-secret")?.trim();

  if (!expectedSecret || !suppliedSecret || suppliedSecret !== expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const startedAt = Date.now();
  const configured = Boolean(process.env.ACCESSTRADE_API_KEY?.trim());
  const baseUrl = (process.env.ACCESSTRADE_API_BASE || "https://api.accesstrade.vn").replace(/\/$/, "");

  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        provider: "AccessTrade",
        configured: false,
        error: "ACCESSTRADE_API_KEY is not configured",
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const items = await fetchAccessTradeDatafeeds({
      discountOnly: false,
      limit: 20,
    });

    const sample = items.slice(0, 5).map((item) => ({
      productId: item.product_id ?? null,
      sku: item.sku ?? null,
      name: item.name ?? null,
      price: item.price ?? null,
      discount: item.discount ?? null,
      discountRate: item.discount_rate ?? null,
      domain: item.domain ?? null,
      category: item.category ?? null,
      campaign: item.campaign ?? null,
      hasAffiliateLink: Boolean(item.aff_link),
      hasImage: Boolean(item.image),
    }));

    return NextResponse.json(
      {
        ok: true,
        provider: "AccessTrade",
        configured: true,
        endpoint: `${baseUrl}/v1/datafeeds`,
        response: {
          reachable: true,
          itemCount: items.length,
          sample,
        },
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "AccessTrade request failed";
    console.error("[accesstrade-diagnostic] provider request failed", {
      message,
      baseUrl,
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        ok: false,
        provider: "AccessTrade",
        configured: true,
        endpoint: `${baseUrl}/v1/datafeeds`,
        response: {
          reachable: false,
          error: message,
        },
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
