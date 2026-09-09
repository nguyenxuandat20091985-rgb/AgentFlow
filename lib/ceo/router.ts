import { dispatchableAgents, getFleetAgent, type FleetAgent } from "./fleet";

export type CeoAssignment = {
  id: string;
  agentId: string;
  agentName: string;
  channel: string;
  domain: string;
  title: string;
  status: "assigned" | "queued" | "rejected";
  reason: string;
};

export type CeoDispatchPlan = {
  ok: true;
  ceo: "AI CEO";
  task: string;
  priority: string;
  assignments: CeoAssignment[];
  rejected: Array<{ agentId: string; reason: string }>;
  message: string;
  isolation: string;
};

function inferAgentIds(task: string, selected: string[]): string[] {
  if (selected.length) {
    return selected.map((s) => s.toLowerCase().replace(/\s+/g, ""));
  }
  const text = task.toLowerCase();
  const ids: string[] = [];
  if (/website|storefront|seo|affiliate.*web|nhà bếp|deal web/.test(text)) ids.push("salesbot");
  if (/facebook|fanpage|meta|ads|social fb/.test(text)) ids.push("marketing");
  if (!ids.length) {
    // Default: only primary live agents, never registry-only
    ids.push("salesbot");
  }
  return [...new Set(ids)];
}

/**
 * Safe router: only assign to dispatchable + runtimeEnabled agents.
 * Never invent execution — only planning assignments for owner/automation.
 */
export function buildCeoDispatchPlan(input: {
  task: string;
  agents?: string[];
  priority?: string;
}): CeoDispatchPlan {
  const task = input.task.trim();
  const priority = input.priority || "normal";
  const requested = inferAgentIds(task, input.agents ?? []);
  const allowed = new Map(dispatchableAgents().map((a) => [a.id, a]));
  const assignments: CeoAssignment[] = [];
  const rejected: Array<{ agentId: string; reason: string }> = [];

  requested.forEach((rawId, index) => {
    const id = rawId.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const normalized =
      id === "salesbot" || id === "aiwebsite" || id === "website"
        ? "salesbot"
        : id === "marketing" || id === "aifacebook" || id === "facebook"
          ? "marketing"
          : id;

    const agent: FleetAgent | undefined = allowed.get(normalized) ?? getFleetAgent(normalized);
    if (!agent) {
      rejected.push({ agentId: normalized, reason: "Unknown agent id" });
      return;
    }
    if (!agent.runtimeEnabled || !agent.dispatchEnabled) {
      rejected.push({
        agentId: agent.id,
        reason: `Agent registry-only (runtimeEnabled=${agent.runtimeEnabled}, dispatchEnabled=${agent.dispatchEnabled}). Activate on isolated branch first.`,
      });
      return;
    }

    assignments.push({
      id: `ceo-${Date.now()}-${index}`,
      agentId: agent.id,
      agentName: agent.name,
      channel: agent.channel,
      domain: agent.domain,
      title: index === 0 ? "Phân tích & lập kế hoạch domain" : "Thực thi trong channel riêng",
      status: index === 0 ? "assigned" : "queued",
      reason: "Allowed by CEO router allow-list",
    });
  });

  return {
    ok: true,
    ceo: "AI CEO",
    task,
    priority,
    assignments,
    rejected,
    message: assignments.length
      ? `AI CEO đã phân công ${assignments.length} AI trong allow-list runtime.`
      : "AI CEO không phân công agent nào — không có agent runtimeEnabled phù hợp.",
    isolation: "Assignments never cross channels; registry-only agents are rejected.",
  };
}
