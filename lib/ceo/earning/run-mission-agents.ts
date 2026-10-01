/**
 * Lightweight planning cycle for mission agents (not salesbot/marketing primary runtime).
 * Produces actionable drafts via LLM; never books revenue.
 */
import { executeAgent } from "@/lib/agent-engine";
import { autoEarningMissions, getMission, type EarningMission } from "@/lib/ceo/earning/missions";
import { enqueueJob } from "@/lib/ceo/jobs/queue";

export type MissionRunResult = {
  agentId: string;
  mission: string;
  status: "completed" | "failed" | "skipped";
  provider?: string;
  outputPreview?: string;
  error?: string;
};

function buildGoal(mission: EarningMission): string {
  return [
    `You are AgentFlow agent "${mission.agentId}" running mission "${mission.title}".`,
    `Monetization model: ${mission.model}.`,
    `How this earns money: ${mission.howEarns}.`,
    `KPI: ${mission.kpi}.`,
    `Today produce concrete drafts for: ${mission.dailyActions.join(", ")}.`,
    "Rules: only legal digital monetization; no fake orders/clicks/reviews; no bank transfers;",
    "never claim revenue was earned unless a verified ledger/provider record exists;",
    "output prioritized next actions with exact draft content the operator can publish.",
  ].join(" ");
}

export async function runMissionAgent(agentId: string): Promise<MissionRunResult> {
  const mission = getMission(agentId);
  if (!mission || mission.status === "blocked") {
    return { agentId, mission: mission?.title ?? agentId, status: "skipped", error: "blocked_or_missing" };
  }
  if (mission.status !== "dispatch_ready" && mission.status !== "active_runtime") {
    return { agentId, mission: mission.title, status: "skipped", error: "not_auto" };
  }

  const day = new Date().toISOString().slice(0, 10);
  const action = mission.dailyActions[0] ?? "daily_cycle";
  await enqueueJob({
    agentId: mission.agentId,
    actionType: `${mission.agentId}_${action}`,
    channel: mission.channel,
    uniqueKey: `${day}:run:${action}`,
    priority: "medium",
    payload: {
      mission: mission.title,
      howEarns: mission.howEarns,
      source: "mission_agent_run",
      execution: "auto_draft",
      neverBookRevenue: true,
    },
  });

  try {
    const result = await executeAgent({
      agent: mission.agentId,
      goal: buildGoal(mission),
      context: `Channel=${mission.channel}. FeedsAgents=${(mission.feedsAgents ?? []).join(",") || "none"}. Date=${day}.`,
    });
    return {
      agentId,
      mission: mission.title,
      status: result.status === "completed" ? "completed" : "failed",
      provider: result.provider,
      outputPreview: result.output.slice(0, 280),
      error: result.status === "completed" ? undefined : result.output.slice(0, 200),
    };
  } catch (e) {
    return {
      agentId,
      mission: mission.title,
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Run all dispatch_ready agents (excludes salesbot/marketing primary path by default). */
export async function runAllMissionAgents(options?: {
  includePrimary?: boolean;
  limit?: number;
}): Promise<{ ok: true; results: MissionRunResult[] }> {
  const includePrimary = options?.includePrimary === true;
  const limit = options?.limit ?? 20;
  const list = autoEarningMissions()
    .filter((m) => {
      if (!includePrimary && (m.agentId === "salesbot" || m.agentId === "marketing")) return false;
      return m.status === "dispatch_ready";
    })
    .slice(0, limit);

  const results: MissionRunResult[] = [];
  for (const m of list) {
    results.push(await runMissionAgent(m.agentId));
  }
  return { ok: true, results };
}
