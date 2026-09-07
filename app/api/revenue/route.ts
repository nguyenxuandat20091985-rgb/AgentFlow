import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const [ledger, payments, orders] = await Promise.all([
      supabaseAdmin<Array<{amount:number;currency:string;source:string;recorded_at:string}>>("revenue_ledger?select=amount,currency,source,recorded_at&order=recorded_at.desc&limit=100"),
      supabaseAdmin<Array<{amount:number;currency:string;status:string;provider:string;verified_at:string;external_event_id:string}>>("payment_events?select=amount,currency,status,provider,verified_at,external_event_id&order=verified_at.desc&limit=100"),
      supabaseAdmin<Array<{status:string;commission:number;currency:string;network:string;created_at:string}>>("affiliate_orders?select=status,commission,currency,network,created_at&order=created_at.desc&limit=100"),
    ]);
    const total = ledger.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const commissions = orders.reduce((sum, row) => sum + Number(row.commission || 0), 0);
    return NextResponse.json({ total, commissions, ledger, payments, orders, source: "supabase" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Revenue unavailable", configured: false }, { status: 503 });
  }
}
