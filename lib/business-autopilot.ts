export type AutopilotAction = { id: string; agent: string; action: string; status: "ready" | "approval_required"; reason?: string };

const blocked = ["bank transfer", "wire money", "send money", "password", "otp", "internet banking", "credit card number"];

export function planAutopilot(goal: string): { objective: string; actions: AutopilotAction[]; safety: string[] } {
  const text = goal.trim();
  if (!text) throw new Error("objective is required");
  const risky = blocked.some(term => text.toLowerCase().includes(term));
  const actions: AutopilotAction[] = [
    { id: "market", agent: "Market Agent", action: "Research public market signals and rank opportunities", status: "ready" },
    { id: "lead", agent: "Lead Agent", action: "Identify compliant, public-source prospects and segment them", status: "ready" },
    { id: "sales", agent: "Sales Agent", action: "Answer product questions and prepare approved offers", status: "ready" },
    { id: "delivery", agent: "Delivery Agent", action: "Prepare approved digital deliverables and onboarding guidance", status: "ready" },
    { id: "support", agent: "Support Agent", action: "Handle customer questions and escalate exceptions", status: "ready" },
    { id: "revenue", agent: "Revenue Agent", action: "Reconcile confirmed orders and summarize revenue metrics", status: "ready" },
    { id: "approval", agent: "Safety Gate", action: "Review financial, legal, privacy or irreversible actions", status: risky ? "approval_required" : "ready", reason: risky ? "Potentially sensitive financial action detected" : undefined }
  ];
  return { objective: text, actions, safety: ["No access to internet banking or private financial credentials", "No unsolicited bulk messaging or deceptive marketing", "No fabricated orders, reviews, revenue or customer identities", "Financially material or legally sensitive actions require owner approval"] };
}
