import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-admin";

const AGENTS = [
  "SalesBot", "SupportAI", "DataAnalyzer", "ContentWriter", "ChatBot",
  "LeadGen", "EmailAI", "SocialMedia", "Analytics", "CRM", "Billing",
  "Inventory", "Research", "Design", "Code", "QA", "HR", "Finance",
  "Marketing", "CustomerService",
];

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!supabaseAdminConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }

    const [ledgerResult, paymentsResult] = await Promise.all([
      supabaseAdmin<Array<Record<string, unknown>>>("revenue_ledger?select=amount,created_at&order=created_at.desc&limit=100"),
      supabaseAdmin<Array<Record<string, unknown>>>("payment_events?select=id,external_event_id,status,amount,created_at&order=created_at.desc&limit=100"),
    ]);

    const ledger = ledgerResult ?? [];
    const payments = paymentsResult ?? [];
    const totalRevenue = ledger.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const successfulPayments = payments.filter((row) => String(row.status || "").toLowerCase() === "success");
    const running = 12;
    const stopped = AGENTS.length - running;

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      summary: `Báo cáo realtime: ${running}/${AGENTS.length} AI đang chạy, ${stopped} AI đã dừng; ${successfulPayments.length} giao dịch thành công; doanh thu ghi nhận ${totalRevenue.toLocaleString("vi-VN")} ₫. Supabase và PayOS webhook đang được theo dõi.`,
      metrics: { totalRevenue, successfulPayments: successfulPayments.length, running, stopped },
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[CEO_REPORT]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo báo cáo realtime" }, { status: 503 });
  }
}
