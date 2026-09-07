import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabaseAdminConfigured()) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  try {
    const [dealsResult, ordersResult, ledgerResult, paymentsResult] = await Promise.all([
      supabaseAdmin<Array<Record<string, unknown>>>("commerce_deals?select=*&order=created_at.desc&limit=50"),
      supabaseAdmin<Array<Record<string, unknown>>>("affiliate_orders?select=*&order=created_at.desc&limit=50"),
      supabaseAdmin<Array<Record<string, unknown>>>("revenue_ledger?select=*&order=created_at.desc&limit=100"),
      supabaseAdmin<Array<Record<string, unknown>>>("payment_events?select=id,external_event_id,provider,status,amount,created_at&order=created_at.desc&limit=100"),
    ]);

    const deals = dealsResult ?? [];
    const orders = ordersResult ?? [];
    const ledger = ledgerResult ?? [];
    const payments = paymentsResult ?? [];

    const total = ledger.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const affiliate = orders.reduce((sum, row) => sum + Number(row.commission || 0), 0);

    const paymentById = new Map(payments.map((payment) => [String(payment.id), payment]));
    const history = ledger.map((row) => {
      const eventId = String(row.event_id || "");
      const payment = paymentById.get(eventId);
      return {
        id: String(row.id || eventId),
        transactionCode: String(payment?.external_event_id || eventId),
        amount: Number(row.amount || payment?.amount || 0),
        status: String(payment?.status || "success"),
        provider: String(payment?.provider || "payos"),
        createdAt: String(payment?.created_at || row.created_at || ""),
      };
    });

    return NextResponse.json({
      source: "supabase",
      verticals: [
        { id: "commerce", name: "E-Commerce & Affiliate Autopilot", description: "Database-backed deal and order tracking.", automation: ["Deal discovery", "Content drafts", "Affiliate tracking", "Performance analytics"] },
        { id: "crypto", name: "Crypto Zero-Capital Autopilot", description: "Research and read-only monitoring; no custody or transfers.", automation: ["Campaign research", "Eligibility tracking", "Task checklist", "Read-only portfolio reporting"] },
      ],
      revenue: { commerce: total, crypto: 0, total, currency: "VND" },
      deals,
      orders,
      ledger,
      payments,
      history,
      affiliateCommissions: affiliate,
      safety: "ON",
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[earning] Supabase query failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load earning data" }, { status: 503 });
  }
}
