import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { discoverFacebookSignals } from "@/lib/facebook-hunter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.AGENT_HEARTBEAT_SECRET;
  const auth = request.headers.get("authorization") || "";
  const supplied = request.headers.get("x-agent-heartbeat-secret");
  return Boolean(expected && (supplied === expected || auth === `Bearer ${expected}`));
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const signals = await discoverFacebookSignals(40);
    if (!signals.length) return NextResponse.json({ ok: true, status: "idle", discovered: 0, persisted: 0 });

    const rows = signals.map((signal) => ({
      source: signal.source,
      source_url: signal.source_url,
      external_id: signal.external_id,
      title: signal.title,
      body: signal.body,
      intent_score: signal.intent_score,
      matched_terms: signal.matched_terms,
      status: "new",
      channel: "facebook",
    }));

    const persisted = await supabaseAdmin<unknown[]>("facebook_signals?on_conflict=external_id", {
      method: "POST",
      headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
      body: JSON.stringify(rows),
    });

    const fresh = Array.isArray(persisted) ? persisted : [];
    if (fresh.length) {
      await supabaseAdmin("agent_action_queue?on_conflict=dedupe_key", {
        method: "POST",
        headers: { Prefer: "return=minimal,resolution=ignore-duplicates" },
        body: JSON.stringify(fresh.map((row: any) => ({
          agent_id: "marketing",
          action_type: "facebook_outbound_advice_draft",
          channel: "facebook",
          status: "pending",
          priority: Number(row.intent_score ?? 0) >= 60 ? "high" : "medium",
          source_type: "facebook_public_signal",
          source_id: String(row.id),
          dedupe_key: `marketing:facebook_outbound_advice_draft:${String(row.id)}`,
          payload: { signalId: row.id, sourceUrl: row.source_url, title: row.title, body: row.body, intentScore: row.intent_score, matchedTerms: row.matched_terms, execution: "approval_only", guidance: "Provide 80% useful advice and at most 20% product/affiliate guidance; do not mass-comment or bypass group permissions." },
        }))),
      });
    }

    return NextResponse.json({ ok: true, status: "processed", discovered: signals.length, persisted: fresh.length, agentId: "marketing" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[facebook-hunt]", error);
    return NextResponse.json({ ok: false, error: "facebook_hunt_failed" }, { status: 502 });
  }
}
