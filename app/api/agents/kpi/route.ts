import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-admin";
import { calculateAgentKpis, PRIMARY_AGENT_KPIS } from "@/lib/agent-kpi";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabaseAdminConfigured()) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  try {
    const rows = await supabaseAdmin<Array<{ amount?: number | string | null; agent_id?: string | null }>>(
      "revenue_ledger?select=amount,agent_id&limit=5000"
    );
    const kpis = calculateAgentKpis(rows ?? []);
    const totalTarget = PRIMARY_AGENT_KPIS.reduce((sum, a) => sum + a.target, 0);
    const totalActual = kpis.reduce((sum, a) => sum + a.actual, 0);
    const transactionCounts = Object.fromEntries(PRIMARY_AGENT_KPIS.map(a => [a.agentId, (rows ?? []).filter(r => String(r.agent_id ?? "").toLowerCase() === a.agentId).length]));
    return NextResponse.json({ kpis: kpis.map(k => ({ ...k, transactions: transactionCounts[k.agentId] ?? 0 })), totalTarget, totalActual }, { headers: { "cache-control": "no-store" } });
  } catch (error: any) {
    console.error("[agent-kpi]", { message: error?.message, details: error?.details, hint: error?.hint, code: error?.code });
    return NextResponse.json({ error: "Unable to load KPI data" }, { status: 503 });
  }
}
