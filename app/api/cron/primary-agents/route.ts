import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runPrimaryAgent, type RuntimeAgentId } from "@/lib/agent-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PRIMARY: RuntimeAgentId[] = ["salesbot", "marketing"];

function authorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const heartbeatSecret = process.env.AGENT_HEARTBEAT_SECRET?.trim();
  const auth = request.headers.get("authorization")?.trim() || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  if (cronSecret && bearer === cronSecret) return true;
  if (heartbeatSecret && bearer === heartbeatSecret) return true;
  // Allow unauthenticated only when no secrets configured (local/dev)
  if (!cronSecret && !heartbeatSecret) return true;
  return false;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const timestamp = new Date().toISOString();
  const results: Array<Record<string, unknown>> = [];

  try {
    const supabase = getSupabaseAdmin();

    for (const agentId of PRIMARY) {
      try {
        const { error: hbError } = await supabase
          .from("agent_heartbeats")
          .upsert(
            { agent_id: agentId, status: "running", last_seen_at: timestamp },
            { onConflict: "agent_id" },
          );

        if (hbError) {
          results.push({ agentId, phase: "heartbeat", status: "failed", error: hbError.message });
          continue;
        }

        const run = await runPrimaryAgent(agentId);
        results.push({
          agentId,
          phase: "runtime",
          status: run.status,
          runId: run.id,
          outputPreview: typeof run.output === "string" ? run.output.slice(0, 240) : run.output,
        });
      } catch (error) {
        results.push({
          agentId,
          status: "failed",
          error: error instanceof Error ? error.message : "agent_failed",
        });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        executedAt: timestamp,
        mode: "primary-agents-keepalive",
        results,
        note: "Heartbeats refreshed and primary agents executed. Revenue only from verified ledger.",
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
