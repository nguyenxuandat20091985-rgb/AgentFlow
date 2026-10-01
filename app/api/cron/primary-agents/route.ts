import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runPrimaryAgent, type RuntimeAgentId } from "@/lib/agent-runtime";
import { runtimeEnabledAgents } from "@/lib/ceo/fleet";
import { autoEarningMissions } from "@/lib/ceo/earning/missions";
import { runMissionAgent } from "@/lib/ceo/earning/run-mission-agents";
import { dispatchEarningMissions } from "@/lib/ceo/earning/dispatch-missions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PRIMARY: RuntimeAgentId[] = ["salesbot", "marketing"];
const MISSION_BATCH = 5;

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
  const missionResults: Array<Record<string, unknown>> = [];
  let dispatchSummary: unknown = null;

  try {
    const supabase = getSupabaseAdmin();

    // Heartbeat every runtime-enabled earning agent so Owner shows them online.
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

    // Primary revenue agents — full deterministic runtime + LLM plan
    for (const agentId of PRIMARY) {
      try {
        const run = await runPrimaryAgent(agentId);
        primaryResults.push({
          agentId,
          phase: "runtime",
          status: run.status,
          runId: run.id,
          outputPreview: typeof run.output === "string" ? run.output.slice(0, 200) : run.output,
        });
      } catch (error) {
        primaryResults.push({
          agentId,
          status: "failed",
          error: error instanceof Error ? error.message : "agent_failed",
        });
      }
    }

    // Enqueue distinct jobs for all auto-earning missions
    try {
      const d = await dispatchEarningMissions();
      dispatchSummary = {
        count: d.results.length,
        enqueued: d.results.filter((r) => r.action === "enqueued").length,
      };
    } catch (e) {
      dispatchSummary = { error: e instanceof Error ? e.message : String(e) };
    }

    // Rotate mission agents (5 per run) so all get LLM cycles across days
    const missionAgents = autoEarningMissions().filter((m) => m.status === "dispatch_ready");
    const offset = new Date().getUTCDate() % Math.max(1, missionAgents.length);
    const batch: typeof missionAgents = [];
    for (let i = 0; i < Math.min(MISSION_BATCH, missionAgents.length); i++) {
      batch.push(missionAgents[(offset + i) % missionAgents.length]);
    }

    for (const m of batch) {
      try {
        const r = await runMissionAgent(m.agentId);
        missionResults.push(r as unknown as Record<string, unknown>);
      } catch (error) {
        missionResults.push({
          agentId: m.agentId,
          status: "failed",
          error: error instanceof Error ? error.message : "mission_failed",
        });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        executedAt: timestamp,
        mode: "fleet-earning-keepalive",
        heartbeats: fleet.map((a) => a.id),
        primary: primaryResults,
        missionsBatch: missionResults,
        dispatch: dispatchSummary,
        note: "All earning agents heartbeated; primary + rotating mission agents planned. Revenue only from verified ledger.",
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
