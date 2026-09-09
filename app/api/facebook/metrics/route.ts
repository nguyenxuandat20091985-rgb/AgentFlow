import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = process.env.AGENT_HEARTBEAT_SECRET;
  const auth = request.headers.get("authorization") || "";
  const supplied = request.headers.get("x-agent-heartbeat-secret");
  return Boolean(expected && (supplied === expected || auth === `Bearer ${expected}`));
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const [events, signals, orders] = await Promise.all([
      supabaseAdmin<any[]>("facebook_activity_events?select=event_type,status,created_at&order=created_at.desc&limit=5000"),
      supabaseAdmin<any[]>("facebook_signals?select=id,status,intent_score,created_at&order=created_at.desc&limit=5000"),
      supabaseAdmin<any[]>("affiliate_orders?select=id,commission,status,created_at&order=created_at.desc&limit=5000"),
    ]);
    const list = events ?? [];
    const signalList = signals ?? [];
    const posted = list.filter((e) => e.event_type === "page_post" && e.status === "confirmed").length;
    const touchpoints = signalList.length;
    const highIntent = signalList.filter((s) => Number(s.intent_score ?? 0) >= 60).length;
    const comments = list.filter((e) => e.event_type === "outbound_comment");
    const survivingComments = comments.filter((e) => e.status === "confirmed").length;
    const clicks = list.filter((e) => e.event_type === "affiliate_click").length;
    const validOrders = (orders ?? []).filter((o) => ["confirmed", "completed", "paid"].includes(String(o.status ?? "").toLowerCase()));
    const commission = validOrders.reduce((sum, o) => sum + Number(o.commission ?? 0), 0);
    return NextResponse.json({ ok: true, agentId: "marketing", kpi: { pagePosts: posted, touchpoints, highIntentSignals: highIntent, outboundComments: comments.length, survivingComments, commentSurvivalRate: comments.length ? survivingComments / comments.length : 0, affiliateClicks: clicks, verifiedOrders: validOrders.length, verifiedCommission: commission } }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[facebook-metrics]", error);
    return NextResponse.json({ ok: false, error: "facebook_metrics_unavailable" }, { status: 503 });
  }
}
