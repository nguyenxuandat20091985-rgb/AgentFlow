import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runtimeEnabledAgents } from "@/lib/ceo/fleet";
import { dispatchEarningMissions } from "@/lib/ceo/earning/dispatch-missions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  if (request.headers.get("x-vercel-cron") === "1") return true;
  const cronSecret = process.env.CRON_SECRET?.trim();
  const heartbeatSecret = process.env.AGENT_HEARTBEAT_SECRET?.trim();
  const auth = request.headers.get("authorization")?.trim() || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (cronSecret && bearer === cronSecret) return true;
  if (heartbeatSecret && bearer === heartbeatSecret) return true;
  if (!cronSecret && !heartbeatSecret) return true;
  return false;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const timestamp = new Date().toISOString();

  try {
    const supabase = getSupabaseAdmin();
    const fleet = runtimeEnabledAgents();
    const heartbeatResults: Array<{ agentId: string; ok: boolean; error?: string }> = [];

    for (const agent of fleet) {
      try {
        const { error } = await supabase
          .from("agent_heartbeats")
          .upsert(
            { agent_id: agent.id, status: "running", last_seen_at: timestamp },
            { onConflict: "agent_id" },
          );
        heartbeatResults.push({ agentId: agent.id, ok: !error, error: error?.message });
      } catch (e) {
        heartbeatResults.push({
          agentId: agent.id,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const dispatch = await dispatchEarningMissions();

    return NextResponse.json(
      {
        ok: true,
        executedAt: timestamp,
        mode: "fleet-heartbeat-dispatch",
        heartbeats: heartbeatResults,
        dispatch: {
          count: dispatch.results.length,
          enqueued: dispatch.results.filter((r) => r.action === "enqueued").length,
          results: dispatch.results,
        },
        note: "All earning agents heartbeated and received distinct daily jobs. Heavy LLM runtime is separate; revenue only from verified ledger.",
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[cron/primary-agents]", error);
    return NextResponse.json(
      {
        ok: false,
        executedAt: timestamp,
        error: error instanceof Error ? error.message : "primary_agents_cron_failed",
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
