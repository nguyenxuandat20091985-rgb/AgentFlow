/**
 * Turn missions into queue work / opportunities. Never books revenue.
 */
import { EARNING_MISSIONS, type EarningMission } from "@/lib/ceo/earning/missions";
import { enqueueJob } from "@/lib/ceo/jobs/queue";
import { factoryRecordOpportunity } from "@/lib/ceo/factory";
import { persistOpportunity } from "@/lib/ceo/persistence/store";
import { buildOpportunityFromSignal } from "@/lib/ceo/opportunity/engine";

export type DispatchResult = {
  agentId: string;
  mission: string;
  action: "enqueued" | "opportunity" | "skipped";
  detail?: string;
};

function runtimeActionType(mission: EarningMission, action: string): string | null {
  if (mission.agentId === "salesbot") {
    if (action.includes("merchandising")) return "website_affiliate_merchandising_draft";
    if (action.includes("seo")) return "website_seo_content_brief";
    if (action.includes("tier_a")) return "website_tier_a_publish_candidate";
    return "website_affiliate_merchandising_draft";
  }
  if (mission.agentId === "marketing") {
    if (action.includes("page_content")) return "facebook_page_content_draft";
    if (action.includes("buyer_intent")) return "facebook_buyer_intent_scan";
    return "facebook_page_content_draft";
  }
  return null;
}

export async function dispatchEarningMissions(options?: {
  includeDraftOpportunities?: boolean;
  limit?: number;
}): Promise<{ ok: true; results: DispatchResult[] }> {
  const includeDraft = options?.includeDraftOpportunities !== false;
  const results: DispatchResult[] = [];
  const day = new Date().toISOString().slice(0, 10);

  for (const mission of EARNING_MISSIONS) {
    if (mission.status === "blocked") {
      results.push({ agentId: mission.agentId, mission: mission.title, action: "skipped", detail: "blocked" });
      continue;
    }

    if (mission.status === "active_runtime") {
      const action = mission.dailyActions[0] ?? "daily_cycle";
      const actionType = runtimeActionType(mission, action);
      if (!actionType) {
        results.push({ agentId: mission.agentId, mission: mission.title, action: "skipped", detail: "no_action_map" });
        continue;
      }
      const enq = await enqueueJob({
        agentId: mission.agentId,
        actionType,
        channel: mission.agentId === "marketing" ? "facebook" : "website",
        uniqueKey: `${day}:${actionType}`,
        priority: "high",
        payload: {
          mission: mission.title,
          model: mission.model,
          howEarns: mission.howEarns,
          source: "ceo_earning_missions",
          execution: "draft_or_existing_runtime",
        },
      });
      results.push({
        agentId: mission.agentId,
        mission: mission.title,
        action: enq.ok ? "enqueued" : "skipped",
        detail: enq.ok ? enq.mode : enq.error,
      });
      continue;
    }

    if (includeDraft && mission.status === "draft_only") {
      const built = buildOpportunityFromSignal({
        id: `opp_mission_${mission.agentId}_${day}`,
        title: mission.title,
        summary: `${mission.howEarns}. Actions: ${mission.dailyActions.join(", ")}`,
        domain: mission.model,
        provider: "earning_missions",
        confidence: 0.35,
      });
      if (built.ok) {
        const rec = factoryRecordOpportunity(built.opportunity);
        if (rec.ok) await persistOpportunity(rec.value);
        results.push({
          agentId: mission.agentId,
          mission: mission.title,
          action: "opportunity",
          detail: "forecast_only_not_revenue",
        });
      } else {
        results.push({ agentId: mission.agentId, mission: mission.title, action: "skipped", detail: "validate_failed" });
      }
    }
  }

  return { ok: true, results: results.slice(0, options?.limit ?? 100) };
}
