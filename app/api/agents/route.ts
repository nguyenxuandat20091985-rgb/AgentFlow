import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const names = [
  ["SalesBot", "Website affiliate commerce", true, "AI Website", "Website operations"], ["SupportAI", "Customer support", false, "AI Support", "Customer support"], ["DataAnalyzer", "Data intelligence", false, "AI Data", "Data intelligence"], ["ContentWriter", "Content production", false, "AI Content", "Content production"], ["ChatBot", "Conversation automation", false, "AI Chat", "Conversation automation"],
  ["LeadGen", "Lead generation", false, "AI LeadGen", "Lead generation"], ["EmailAI", "Email automation", false, "AI Email", "Email automation"], ["SocialMedia", "Social publishing", false, "AI Social", "Social publishing"], ["Analytics", "Business analytics", false, "AI Analytics", "Business analytics"], ["CRM", "Customer relationship", false, "AI CRM", "Customer relationship"],
  ["Billing", "Billing operations", false, "AI Billing", "Billing operations"], ["Inventory", "Inventory operations", false, "AI Inventory", "Inventory operations"], ["Research", "Research & evidence", false, "AI Research", "Research & evidence"], ["Design", "Design production", false, "AI Design", "Design production"], ["Code", "Software engineering", false, "AI Code", "Software engineering"],
  ["QA", "Quality assurance", false, "AI QA", "Quality assurance"], ["HR", "People operations", false, "AI HR", "People operations"], ["Finance", "Finance analysis", false, "AI Finance", "Finance analysis"], ["Marketing", "Facebook growth & affiliate marketing", true, "AI Facebook", "Facebook growth & affiliate marketing"], ["CustomerService", "Customer service", false, "AI Customer Service", "Customer service"],
] as const;

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let heartbeats: Record<string, any> = {};
  let lastRuns: Record<string, any> = {};

  if (url && key) {
    try {
      const supabase = createClient(url, key);
      const [heartbeatResult, runResult] = await Promise.all([
        supabase.from("agent_heartbeats").select("agent_id,status,last_seen_at").in("agent_id", names.map(([name]) => name.toLowerCase())),
        supabase.from("agent_task_runs").select("agent_id,task_type,status,created_at").in("agent_id", ["salesbot", "marketing"]).order("created_at", { ascending: false }).limit(20),
      ]);
      if (heartbeatResult.error) throw heartbeatResult.error;
      for (const row of heartbeatResult.data ?? []) heartbeats[row.agent_id] = row;
      for (const row of runResult.data ?? []) if (!lastRuns[row.agent_id]) lastRuns[row.agent_id] = row;
      if (runResult.error) console.warn("[agents] latest task read failed", runResult.error.message);
    } catch (error: any) {
      console.error("[agents] status read failed", { message: error?.message, details: error?.details, hint: error?.hint, code: error?.code });
    }
  }

  const staleMs = 10 * 60 * 1000;
  const agents = names.map(([legacyName, role, runtimeEnabled, displayName, workstream]) => {
    const id = legacyName.toLowerCase();
    const hb = heartbeats[id];
    const lastSeenAt = hb?.last_seen_at ?? null;
    const lastSeen = lastSeenAt ? Date.parse(String(lastSeenAt)) : 0;
    const fresh = Number.isFinite(lastSeen) && lastSeen > 0 && Date.now() - lastSeen <= staleMs;
    const running = runtimeEnabled && fresh && String(hb?.status ?? "").toLowerCase() === "running";
    const lastRun = lastRuns[id] ?? null;
    const currentTask = running
      ? id === "salesbot" ? "Đang quét deal & tối ưu website" : id === "marketing" ? "Đang phân tích & chuẩn bị nội dung Facebook" : workstream
      : runtimeEnabled ? "Chờ heartbeat / chu kỳ tiếp theo" : "Chưa kích hoạt — khu vực phát triển riêng";

    return {
      id,
      name: displayName,
      legacyName,
      role,
      workstream,
      model: "gpt-5.6-luna",
      status: running ? "running" : "stopped",
      statusSource: hb ? "heartbeat" : "no-heartbeat",
      runtimeEnabled,
      isolated: true,
      protectedFromOtherAgents: runtimeEnabled,
      currentTask,
      lastSeenAt,
      lastRun: lastRun ? { taskType: lastRun.task_type, status: lastRun.status, createdAt: lastRun.created_at } : null,
    };
  });

  return NextResponse.json(agents, { headers: { "cache-control": "no-store" } });
}
