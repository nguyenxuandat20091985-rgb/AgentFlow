import { NextResponse } from "next/server";

const names = [
  ["SalesBot", "Sales & conversion"], ["SupportAI", "Customer support"], ["DataAnalyzer", "Data intelligence"], ["ContentWriter", "Content production"], ["ChatBot", "Conversation automation"],
  ["LeadGen", "Lead generation"], ["EmailAI", "Email automation"], ["SocialMedia", "Social publishing"], ["Analytics", "Business analytics"], ["CRM", "Customer relationship"],
  ["Billing", "Billing operations"], ["Inventory", "Inventory operations"], ["Research", "Research & evidence"], ["Design", "Design production"], ["Code", "Software engineering"],
  ["QA", "Quality assurance"], ["HR", "People operations"], ["Finance", "Finance analysis"], ["Marketing", "Marketing automation"], ["CustomerService", "Customer service"]
] as const;

// Runtime status must come from a persisted heartbeat when available.
// Until a heartbeat table/worker is configured, never claim an agent is running.
const agents = names.map(([name, role]) => ({
  id: name.toLowerCase(),
  name,
  role,
  model: "gpt-5.6-luna",
  status: "stopped" as const,
  statusSource: "heartbeat-not-configured",
}));

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json(agents, { headers: { "cache-control": "no-store" } });
}
