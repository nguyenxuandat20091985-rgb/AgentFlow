import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIMARY = new Set(["salesbot", "marketing"]);

type DbError = { message?: string; details?: string; hint?: string; code?: string };

export async function GET() {
  const configured = Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return NextResponse.json(
    {
      ok: true,
      service: "AgentFlow heartbeat",
      endpoint: "/api/agents/heartbeat",
      method: "POST",
      status: "ready",
      supabaseConfigured: configured,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const suppliedSecret = request.headers.get("x-agent-heartbeat-secret");
    const expectedSecret = process.env.AGENT_HEARTBEAT_SECRET;
    if (!expectedSecret || suppliedSecret !== expectedSecret) {
      console.warn("[agent-heartbeat] unauthorized", {
        hasSecret: Boolean(suppliedSecret),
        hasExpectedSecret: Boolean(expectedSecret),
      });
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as { agentId?: unknown } | null;
    const agentId = String(body?.agentId ?? "").trim().toLowerCase();
    if (!PRIMARY.has(agentId)) {
      return NextResponse.json(
        { ok: false, error: "agent_not_allowed", allowed: [...PRIMARY] },
        { status: 403 },
      );
    }

    const timestamp = new Date().toISOString();
    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (error) {
      const e = error as Error;
      console.error("[agent-heartbeat] configuration error", {
        message: e.message,
        hasUrl: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      });
      return NextResponse.json({ ok: false, error: "supabase_configuration_error" }, { status: 500 });
    }

    try {
      const { data, error } = await supabase
        .from("agent_heartbeats")
        .upsert(
          { agent_id: agentId, status: "running", last_seen_at: timestamp },
          { onConflict: "agent_id" },
        )
        .select("agent_id,status,last_seen_at")
        .single();

      if (error) {
        const e = error as DbError;
        console.error("[agent-heartbeat] Supabase database error", {
          message: e.message,
          details: e.details,
          hint: e.hint,
          code: e.code,
          table: "agent_heartbeats",
          agentId,
        });
        return NextResponse.json(
          { ok: false, error: "database_error", database: { message: e.message, details: e.details, hint: e.hint, code: e.code } },
          { status: 500 },
        );
      }

      console.info("[agent-heartbeat] accepted", { agentId, status: data?.status, lastSeenAt: data?.last_seen_at });
      return NextResponse.json({ ok: true, heartbeat: data }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      const e = error as DbError;
      console.error("[agent-heartbeat] Supabase request exception", {
        message: e.message,
        details: e.details,
        hint: e.hint,
        code: e.code,
        table: "agent_heartbeats",
        agentId,
      });
      return NextResponse.json({ ok: false, error: "database_exception" }, { status: 500 });
    }
  } catch (error) {
    const e = error as DbError;
    console.error("[agent-heartbeat] unexpected error", {
      message: e.message,
      details: e.details,
      hint: e.hint,
      code: e.code,
    });
    return NextResponse.json({ ok: false, error: "heartbeat_failed" }, { status: 500 });
  }
}
