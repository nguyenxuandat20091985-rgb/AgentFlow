import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runPrimaryAgent, type RuntimeAgentId } from "@/lib/agent-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIMARY: RuntimeAgentId[] = ["salesbot", "marketing"];
const HEARTBEAT_MAX_AGE_MS = 10 * 60 * 1000;

function authorized(request: NextRequest) {
  const expected = process.env.AGENT_HEARTBEAT_SECRET?.trim();
  const legacy = request.headers.get("x-agent-heartbeat-secret")?.trim();
  const authorization = request.headers.get("authorization")?.trim() || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  return Boolean(expected && (legacy === expected || bearer === expected));
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "AgentFlow primary runtime",
    endpoint: "/api/agents/runtime",
    method: "POST",
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const requested = (await request.json().catch(() => ({}))) as { agentId?: string };
    const ids = requested.agentId
      ? [requested.agentId.toLowerCase() as RuntimeAgentId]
      : PRIMARY;

    if (ids.some((id) => !PRIMARY.includes(id))) {
      return NextResponse.json({ ok: false, error: "agent_not_allowed", allowed: PRIMARY }, { status: 403 });
    }

    const { data: heartbeats, error: heartbeatError } = await supabase
      .from("agent_heartbeats")
      .select("agent_id,status,last_seen_at")
      .in("agent_id", ids);

    if (heartbeatError) {
      console.error("[agent-runtime] heartbeat lookup failed", heartbeatError);
      return NextResponse.json({ ok: false, error: "heartbeat_lookup_failed", details: heartbeatError.message }, { status: 500 });
    }

    const now = Date.now();
    const results = [];

    for (const id of ids) {
      const heartbeat = heartbeats?.find((row) => row.agent_id === id);
      const lastSeen = heartbeat?.last_seen_at ? Date.parse(heartbeat.last_seen_at) : 0;
      const fresh = heartbeat?.status === "running" && Number.isFinite(lastSeen) && now - lastSeen <= HEARTBEAT_MAX_AGE_MS;

      if (!fresh) {
        results.push({ agentId: id, status: "skipped", reason: "heartbeat_not_fresh" });
        continue;
      }

      try {
        const result = await runPrimaryAgent(id);
        results.push({ agentId: id, status: result.status, runId: result.id, output: result.output });
      } catch (error) {
        console.error("[agent-runtime] agent execution failed", { agentId: id, error });
        results.push({ agentId: id, status: "failed", error: error instanceof Error ? error.message : "agent_execution_failed" });
      }
    }

    return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), results }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[agent-runtime] configuration/runtime error", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "runtime_failed" }, { status: 500 });
  }
}
