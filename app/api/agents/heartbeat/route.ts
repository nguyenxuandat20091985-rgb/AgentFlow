import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIMARY = new Set(["salesbot", "marketing"]);

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Public health-check. This intentionally does not require the heartbeat secret.
 * A browser GET should return JSON rather than the application's HTML homepage.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "AgentFlow heartbeat",
      endpoint: "/api/agents/heartbeat",
      method: "POST",
      status: "ready",
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const heartbeatSecret = request.headers.get("x-agent-heartbeat-secret");
    const expectedSecret = process.env.AGENT_HEARTBEAT_SECRET;

    if (!expectedSecret || heartbeatSecret !== expectedSecret) {
      console.warn("[agent-heartbeat] unauthorized request", {
        hasSecret: Boolean(heartbeatSecret),
      });
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    const agentId = String(
      body && typeof body === "object" && "agentId" in body
        ? (body as { agentId?: unknown }).agentId ?? ""
        : "",
    ).toLowerCase();

    if (!PRIMARY.has(agentId)) {
      return NextResponse.json(
        { ok: false, error: "agent_not_allowed", allowed: [...PRIMARY] },
        { status: 403 },
      );
    }

    const supabase = getSupabase();
    const timestamp = new Date().toISOString();

    const { data, error } = await supabase
      .from("agent_heartbeats")
      .upsert(
        {
          agent_id: agentId,
          status: "running",
          last_seen_at: timestamp,
        },
        { onConflict: "agent_id" },
      )
      .select("agent_id,status,last_seen_at")
      .single();

    if (error) {
      console.error("[agent-heartbeat] Supabase error", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { ok: false, error: "database_error", code: error.code },
        { status: 500 },
      );
    }

    console.info("[agent-heartbeat] accepted", {
      agentId,
      status: data.status,
      lastSeenAt: data.last_seen_at,
    });

    return NextResponse.json(
      { ok: true, heartbeat: data },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    console.error("[agent-heartbeat] unexpected error", {
      message: err?.message,
      details: err?.details,
      hint: err?.hint,
      code: err?.code,
    });

    return NextResponse.json(
      { ok: false, error: "heartbeat_failed" },
      { status: 500 },
    );
  }
}
