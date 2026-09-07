import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const names = [
  ["SalesBot", "Sales & conversion"], ["SupportAI", "Customer support"], ["DataAnalyzer", "Data intelligence"], ["ContentWriter", "Content production"], ["ChatBot", "Conversation automation"],
  ["LeadGen", "Lead generation"], ["EmailAI", "Email automation"], ["SocialMedia", "Social publishing"], ["Analytics", "Business analytics"], ["CRM", "Customer relationship"],
  ["Billing", "Billing operations"], ["Inventory", "Inventory operations"], ["Research", "Research & evidence"], ["Design", "Design production"], ["Code", "Software engineering"],
  ["QA", "Quality assurance"], ["HR", "People operations"], ["Finance", "Finance analysis"], ["Marketing", "Marketing automation"], ["CustomerService", "Customer service"]
] as const;

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let heartbeats: Record<string, any> = {};

  if (url && key) {
    try {
      const supabase = createClient(url, key);
      const { data, error } = await supabase.from("agent_heartbeats").select("agent_id,status,last_seen_at").in("agent_id", ["salesbot", "marketing"]);
      if (error) throw error;
      for (const row of data ?? []) heartbeats[row.agent_id] = row;
    } catch (error: any) {
      console.error("[agents] heartbeat read failed", { message: error?.message, details: error?.details, hint: error?.hint, code: error?.code });
    }
  }

  const staleMs = 90_000;
  const agents = names.map(([name, role]) => {
    const id = name.toLowerCase();
    const hb = heartbeats[id];
    const fresh = hb?.last_seen_at && Date.now() - Date.parse(hb.last_seen_at) <= staleMs;
    const isPrimary = id === "salesbot" || id === "marketing";
    return {
      id, name, role, model: "gpt-5.6-luna",
      status: isPrimary && fresh && hb.status === "running" ? "running" : "stopped",
      statusSource: isPrimary && fresh ? "heartbeat" : "heartbeat-not-active",
      lastSeenAt: hb?.last_seen_at ?? null,
    };
  });

  return NextResponse.json(agents, { headers: { "cache-control": "no-store" } });
}
