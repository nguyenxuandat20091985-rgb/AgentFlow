/**
 * Turn missions into queue work. Never books revenue.
 */
import { autoEarningMissions, type EarningMission } from "@/lib/ceo/earning/missions";
import { enqueueJob } from "@/lib/ceo/jobs/queue";

export type DispatchResult = {
  agentId: string;
  mission: string;
  action: "enqueued" | "skipped";
  detail?: string;
};

function actionTypeFor(mission: EarningMission, action: string): string {
  const a = action.toLowerCase();
  if (mission.agentId === "salesbot") {
    if (a.includes("merchandising")) return "website_affiliate_merchandising_draft";
    if (a.includes("seo")) return "website_seo_content_brief";
    if (a.includes("tier_a")) return "website_tier_a_publish_candidate";
    return "website_affiliate_merchandising_draft";
  }
  if (mission.agentId === "marketing") {
    if (a.includes("page_content")) return "facebook_page_content_draft";
    if (a.includes("buyer_intent")) return "facebook_buyer_intent_scan";
    return "facebook_page_content_draft";
  }
  // One stable action type per agent/day — distinct monetization workstreams
  return `${mission.agentId}_${action}`;
}

export async function dispatchEarningMissions(options?: {
  includeDraftOpportunities?: boolean;
  limit?: number;
}): Promise<{ ok: true; results: DispatchResult[] }> {
  const results: DispatchResult[] = [];
  const day = new Date().toISOString().slice(0, 10);
  const missions = autoEarningMissions();

  for (const mission of missions) {
    const action = mission.dailyActions[0] ?? "daily_cycle";
    const actionType = actionTypeFor(mission, action);
    const enq = await enqueueJob({
      agentId: mission.agentId,
      actionType,
      channel: mission.channel,
      uniqueKey: `${day}:${actionType}`,
      priority: mission.status === "active_runtime" ? "high" : "medium",
      payload: {
        mission: mission.title,
        model: mission.model,
        howEarns: mission.howEarns,
        dailyActions: mission.dailyActions,
        kpi: mission.kpi,
        source: "ceo_earning_missions",
        execution: "auto_draft",
        neverBookRevenue: true,
      },
    });
    results.push({
      agentId: mission.agentId,
      mission: mission.title,
      action: enq.ok ? "enqueued" : "skipped",
      detail: enq.ok ? enq.mode : enq.error,
    });
  }

  return { ok: true, results: results.slice(0, options?.limit ?? 100) };
}
