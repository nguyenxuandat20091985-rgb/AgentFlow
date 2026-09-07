import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-admin";

export async function GET() {
  if (!supabaseAdminConfigured()) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  try {
    const [dealsResult, ordersResult, ledgerResult] = await Promise.all([
      supabaseAdmin<Array<Record<string, unknown>>>("commerce_deals?select=*&order=created_at.desc&limit=50"),
      supabaseAdmin<Array<Record<string, unknown>>>("affiliate_orders?select=*&order=created_at.desc&limit=50"),
      supabaseAdmin<Array<{amount:number;currency:string;source:string;recorded_at:string}>>("revenue_ledger?select=amount,currency,source,recorded_at&order=recorded_at.desc&limit=100"),
    ]);

    const deals = dealsResult ?? [];
    const orders = ordersResult ?? [];
    const ledger = ledgerResult ?? [];

    const total = ledger.reduce((s, r) => s + Number(r.amount || 0), 0);
    const affiliate = orders.reduce((s, r) => s + Number(r.commission || 0), 0);
    return NextResponse.json({ source: "supabase", verticals: [
      { id: "commerce", name: "E-Commerce & Affiliate Autopilot", description: "Database-backed deal and order tracking.", automation: ["Deal discovery", "Content drafts", "Affiliate tracking", "Performance analytics"] },
      { id: "crypto", name: "Crypto Zero-Capital Autopilot", description: "Research and read-only monitoring; no custody or transfers.", automation: ["Campaign research", "Eligibility tracking", "Task checklist", "Read-only portfolio reporting"] },
    ], revenue: { commerce: total, crypto: 0, total, currency: ledger[0]?.currency || "VND" }, deals, orders, ledger, affiliateCommissions: affiliate, safety: "ON" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load earning data" }, { status: 503 });
  }
}
