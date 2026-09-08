import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { BINANCE_AGENT_ID, buildScoutQueue, getBinancePublicHealth, ZERO_CAPITAL_RULES } from "@/lib/binance-scout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.AGENT_HEARTBEAT_SECRET;
  const supplied = request.headers.get("x-agent-heartbeat-secret");
  return Boolean(expected && supplied && supplied === expected);
}

export async function GET() {
  const health = await getBinancePublicHealth();
  return NextResponse.json({
    ok: true,
    agentId: BINANCE_AGENT_ID,
    name: "AI #3 — Binance Zero-Capital Scout",
    mode: "research_only",
    capitalRequired: 0,
    binance: health,
    rules: ZERO_CAPITAL_RULES,
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const health = await getBinancePublicHealth();
    const queue = buildScoutQueue();
    const inserted = await supabaseAdmin<unknown[]>("agent_action_queue", {
      method: "POST",
      headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
      body: JSON.stringify(queue),
    });

    const output = {
      agentId: BINANCE_AGENT_ID,
      mode: "research_only",
      capitalRequired: 0,
      binance: health,
      queued: Array.isArray(inserted) ? inserted.length : 0,
      candidates: queue.length,
      note: "Candidates are not earnings. No trade, withdrawal, transfer, or revenue is executed by this agent.",
    };

    await supabaseAdmin("agent_task_runs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        agent_id: BINANCE_AGENT_ID,
        task_type: "binance_zero_capital_scout",
        status: "completed",
        input_snapshot: { checkedAt: new Date().toISOString(), mode: "research_only" },
        output,
      }),
    });

    return NextResponse.json({ ok: true, ...output }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[binance-scout] failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "binance_scout_failed" }, { status: 500 });
  }
}
