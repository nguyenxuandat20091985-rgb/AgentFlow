import { executeAgent } from "@/lib/agent-engine";

export const PRIMARY_RUNTIME_TASKS = {
  salesbot: {
    name: "SalesBot revenue operations",
    goal: "Review the current sales pipeline and produce the next conversion actions. Prioritize legitimate leads, follow-ups, open orders, and customer-service actions. Do not invent customers, payments, orders, or revenue. Only recommend actions that the connected system can actually execute or that require owner approval.",
  },
  marketing: {
    name: "Marketing growth operations",
    goal: "Review the current marketing pipeline and produce the next measurable growth actions. Prioritize approved content distribution, campaign optimization, lead generation, and conversion opportunities. Do not fabricate traffic, leads, sales, payments, or revenue. Flag actions requiring owner approval.",
  },
} as const;

export type RuntimeAgentId = keyof typeof PRIMARY_RUNTIME_TASKS;

export async function runPrimaryAgent(agentId: RuntimeAgentId) {
  const task = PRIMARY_RUNTIME_TASKS[agentId];
  return executeAgent({
    agent: agentId === "salesbot" ? "SalesBot" : "Marketing",
    goal: task.goal,
    context: `AgentFlow controlled runtime cycle. Task: ${task.name}. This cycle is planning/execution orchestration only; never claim a payment or revenue event unless it is confirmed by the payment system and revenue ledger.`,
  });
}
