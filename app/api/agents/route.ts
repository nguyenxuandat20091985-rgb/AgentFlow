import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const names = [
  ["SalesBot", "Website affiliate commerce"], ["SupportAI", "Customer support"], ["DataAnalyzer", "Data intelligence"], ["ContentWriter", "Content production"], ["ChatBot", "Conversation automation"],
  ["LeadGen", "Lead generation"], ["EmailAI", "Email automation"], ["SocialMedia", "Social publishing"], ["Analytics", "Business analytics"], ["CRM", "Customer relationship"],
  ["Billing", "Billing operations"], ["Inventory", "Inventory operations"], ["Research", "Research & evidence"], ["Design", "Design production"], ["Code", "Software engineering"],
  ["QA", "Quality assurance"], ["HR", "People operations"], ["Finance", "Finance analysis"], ["Marketing", "Facebook growth & affiliate marketing"], ["CustomerService", "Customer service"],
] as const;

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let heartbeats: Record<string, any> = {};

  if (url && key) {
    try {
      const supabase = createClient(url, key);
      const { data, error } = await supabase
        .from("agent_heartbeats")
        .select("agent_id,status,last_seen_at")
        .in("agent_id", names.map(([name]) => name.toLowerCase()));
      if (error) throw error;
      for (const row of data ?? []) heartbeats[row.agent_id] = row;
    } catch (error: any) {
      console.error("[agents] heartbeat read failed", { message: error?.message, details: error?.details, hint: error?.hint, code: error?.code });
    }
  }

  const staleMs = 10 * 60 * 1000;
  const agents = names.map(([name, role]) => {
    const id = name.toLowerCase();
    const hb = heartbeats[id];
    const lastSeenAt = hb?.last_seen_at ?? null;
    const lastSeen = lastSeenAt ? Date.parse(String(lastSeenAt)) : 0;
    const fresh = Number.isFinite(lastSeen) && lastSeen > 0 && Date.now() - lastSeen <= staleMs;
    const running = fresh && String(hb?.status ?? "").toLowerCase() === "running";
    return {
      id,
      name,
      role,
      model: "gpt-5.6-luna",
      status: running ? "running" : "stopped",
      statusSource: hb ? "heartbeat" : "no-heartbeat",
      lastSeenAt,
    };
  });

  return NextResponse.json(agents, { headers: { "cache-control": "no-store" } });
}
