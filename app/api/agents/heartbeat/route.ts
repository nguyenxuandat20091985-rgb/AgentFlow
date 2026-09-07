import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const PRIMARY = new Set(["salesbot", "marketing"]);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agentId = String(body.agentId ?? "").toLowerCase();
    const heartbeatSecret = request.headers.get("x-agent-heartbeat-secret");
    if (!PRIMARY.has(agentId)) return NextResponse.json({ error: "agent_not_allowed" }, { status: 403 });
    if (!process.env.AGENT_HEARTBEAT_SECRET || heartbeatSecret !== process.env.AGENT_HEARTBEAT_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("agent_heartbeats")
      .upsert({ agent_id: agentId, status: "running", last_seen_at: new Date().toISOString() }, { onConflict: "agent_id" })
      .select("agent_id,status,last_seen_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, heartbeat: data }, { headers: { "cache-control": "no-store" } });
  } catch (error: any) {
    console.error("[agent-heartbeat]", { message: error?.message, details: error?.details, hint: error?.hint, code: error?.code });
    return NextResponse.json({ error: "heartbeat_failed" }, { status: 500 });
  }
}
