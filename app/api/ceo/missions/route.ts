import { NextResponse } from "next/server";
import { EARNING_MISSIONS, missionsByStatus } from "@/lib/ceo/earning/missions";
import { dispatchEarningMissions } from "@/lib/ceo/earning/dispatch-missions";
import { runAllMissionAgents } from "@/lib/ceo/earning/run-mission-agents";
import { isOwnerAuthorized, unauthorizedResponse } from "@/lib/ceo/security/owner-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({
    ok: true,
    missions: EARNING_MISSIONS,
    activeRuntime: missionsByStatus("active_runtime"),
    dispatchReady: missionsByStatus("dispatch_ready"),
    draftOnly: missionsByStatus("draft_only"),
    blocked: missionsByStatus("blocked"),
    note: "Each agent has a distinct earning mission. active_runtime + dispatch_ready auto-enqueue jobs; never book fake revenue.",
  });
}

export async function POST(request: Request) {
  if (!isOwnerAuthorized(request)) return unauthorizedResponse();
  const body = (await request.json().catch(() => ({}))) as {
    includeDraftOpportunities?: boolean;
    runAgents?: boolean;
    limit?: number;
  };
  const result = await dispatchEarningMissions({
    includeDraftOpportunities: body.includeDraftOpportunities !== false,
  });
  let runs: unknown = null;
  if (body.runAgents) {
    runs = await runAllMissionAgents({ limit: body.limit ?? 8 });
  }
  return NextResponse.json({
    ...result,
    runs,
    note: "Enqueued distinct work for all auto-earning agents. Optional runAgents executes LLM planning for dispatch_ready batch.",
  });
}
