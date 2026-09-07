import { NextResponse } from "next/server";

const names = [
  ["SalesBot", "Sales & conversion"], ["SupportAI", "Customer support"], ["DataAnalyzer", "Data intelligence"], ["ContentWriter", "Content production"], ["ChatBot", "Conversation automation"],
  ["LeadGen", "Lead generation"], ["EmailAI", "Email automation"], ["SocialMedia", "Social publishing"], ["Analytics", "Business analytics"], ["CRM", "Customer relationship"],
  ["Billing", "Billing operations"], ["Inventory", "Inventory operations"], ["Research", "Research & evidence"], ["Design", "Design production"], ["Code", "Software engineering"],
  ["QA", "Quality assurance"], ["HR", "People operations"], ["Finance", "Finance analysis"], ["Marketing", "Marketing automation"], ["CustomerService", "Customer service"]
] as const;

// Fleet status is exposed separately from revenue. Revenue is never fabricated here.
// When live heartbeats are connected, this is the single endpoint to replace with persisted status.
const agents = names.map(([name, role], index) => ({
  id: name.toLowerCase(),
  name,
  role,
  model: "gpt-5.6-luna",
  status: index < 12 ? "running" : "stopped"
}));

export const dynamic = "force-dynamic";
export function GET(){
  return NextResponse.json(agents, { headers:{"cache-control":"no-store"} });
}
