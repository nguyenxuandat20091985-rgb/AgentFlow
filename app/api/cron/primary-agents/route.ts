import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runPrimaryAgent, type RuntimeAgentId } from "@/lib/agent-runtime";
import { runtimeEnabledAgents } from "@/lib/ceo/fleet";
import { dispatchEarningMissions } from "@/lib/ceo/earning/dispatch-missions";
import { runMissionAgent } from "@/lib/ceo/earning/run-mission-agents";
import { autoEarningMissions } from "@/lib/ceo/earning/missions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PRIMARY: RuntimeAgentId[] = ["salesbot", "marketing"];

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
  const primaryResults: Array<Record<string, unknown>> = [];
  let dispatchSummary: unknown = null;
  let missionSample: unknown = null;

  try {
    const supabase = getSupabaseAdmin();
    const fleet = runtimeEnabledAgents();

    for (const agent of fleet) {
      try {
        await supabase
          .from("agent_heartbeats")
          .upsert(
            { agent_id: agent.id, status: "running", last_seen_at: timestamp },
            { onConflict: "agent_id" },
          );
      } catch (e) {
        console.warn("[cron/primary-agents] heartbeat", agent.id, e);
      }
    }

    // Distinct daily jobs for every auto-earning agent (no LLM)
    try {
      const d = await dispatchEarningMissions();
      dispatchSummary = {
        count: d.results.length,
        enqueued: d.results.filter((r) => r.action === "enqueued").length,
        results: d.results,
      };
    } catch (e) {
      dispatchSummary = { error: e instanceof Error ? e.message : String(e) };
    }

    // Full runtime only for primary revenue agents
    for (const agentId of PRIMARY) {
      try {
        const run = await runPrimaryAgent(agentId);
        primaryResults.push({
          agentId,
          phase: "runtime",
          status: run.status,
          runId: run.id,
          outputPreview: typeof run.output === "string" ? run.output.slice(0, 160) : run.output,
        });
      } catch (error) {
        primaryResults.push({
          agentId,
          status: "failed",
          error: error instanceof Error ? error.message : "agent_failed",
        });
      }
    }

    // One rotating mission LLM sample (keeps timeout headroom)
    try {
      const missions = autoEarningMissions().filter((m) => m.status === "dispatch_ready");
      if (missions.length) {
        const pick = missions[new Date().getUTCDate() % missions.length];
        missionSample = await runMissionAgent(pick.agentId);
      }
    } catch (e) {
      missionSample = { error: e instanceof Error ? e.message : String(e) };
    }

    return NextResponse.json(
      {
        ok: true,
        executedAt: timestamp,
        mode: "fleet-earning-keepalive",
        heartbeats: fleet.map((a) => a.id),
        dispatch: dispatchSummary,
        primary: primaryResults,
        missionSample,
        note: "All earning agents heartbeated + job-enqueued; primary LLM cycles + 1 rotating mission agent. Revenue only from verified ledger.",
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
