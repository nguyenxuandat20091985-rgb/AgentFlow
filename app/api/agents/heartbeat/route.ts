import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIMARY = new Set(["salesbot", "marketing"]);

type SupabaseError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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
        hasExpectedSecret: Boolean(expectedSecret),
      });
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error("[agent-heartbeat] invalid JSON", error);
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    const agentId = String(
      body && typeof body === "object" && "agentId" in body
        ? (body as { agentId?: unknown }).agentId ?? ""
        : "",
    ).trim().toLowerCase();

    if (!PRIMARY.has(agentId)) {
      return NextResponse.json(
        { ok: false, error: "agent_not_allowed", allowed: [...PRIMARY] },
        { status: 403 },
      );
    }

    const timestamp = new Date().toISOString();

    // Keep Supabase setup and the database write inside the guarded block so
    // missing server env vars and schema/database errors are visible in Vercel.
    let supabase;
    try {
      supabase = getSupabase();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("[agent-heartbeat] Supabase configuration error", {
        message: err?.message,
        hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      });
      return NextResponse.json(
        { ok: false, error: "supabase_configuration_error" },
        { status: 500 },
      );
    }

    try {
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
        const dbError = error as SupabaseError;
        console.error("[agent-heartbeat] Supabase database error", {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
          table: "agent_heartbeats",
          operation: "upsert",
          agentId,
        });

        return NextResponse.json(
          {
            ok: false,
            error: "database_error",
            database: {
              message: dbError.message,
              details: dbError.details,
              hint: dbError.hint,
              code: dbError.code,
            },
          },
          { status: 500 },
        );
      }

      console.info("[agent-heartbeat] accepted", {
        agentId,
        status: data?.status,
        lastSeenAt: data?.last_seen_at,
      });

      return NextResponse.json(
        { ok: true, heartbeat: data },
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error: unknown) {
      const dbError = error as SupabaseError;
      console.error("[agent-heartbeat] Supabase request exception", {
        message: dbError?.message,
        details: dbError?.details,
        hint: dbError?.hint,
        code: dbError?.code,
        table: "agent_heartbeats",
        operation: "upsert",
        agentId,
      });

      return NextResponse.json(
        { ok: false, error: "database_exception" },
        { status: 500 },
      );
    }
  } catch (error: unknown) {
    const err = error as SupabaseError;
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
