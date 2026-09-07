import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type LedgerRow = { amount: number; created_at: string };
type PaymentRow = { amount: number; status: string; provider: string; external_event_id: string; created_at: string };
type OrderRow = { status: string; commission: number; currency: string; network: string; created_at: string };

export async function GET() {
  try {
    const [ledgerResult, paymentsResult, ordersResult] = await Promise.all([
      supabaseAdmin<LedgerRow[]>("revenue_ledger?select=amount,created_at&order=created_at.desc&limit=100"),
      supabaseAdmin<PaymentRow[]>("payment_events?select=amount,status,provider,external_event_id,created_at&order=created_at.desc&limit=100"),
      supabaseAdmin<OrderRow[]>("affiliate_orders?select=status,commission,currency,network,created_at&order=created_at.desc&limit=100"),
    ]);

    const ledger = ledgerResult ?? [];
    const payments = paymentsResult ?? [];
    const orders = ordersResult ?? [];
    const total = ledger.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const commissions = orders.reduce((sum, row) => sum + Number(row.commission || 0), 0);

    return NextResponse.json(
      { total, commissions, ledger, payments, orders, source: "supabase" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Revenue unavailable", configured: false },
      { status: 503 },
    );
  }
}
