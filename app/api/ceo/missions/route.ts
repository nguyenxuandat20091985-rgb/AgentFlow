import { NextResponse } from "next/server";
import { EARNING_MISSIONS, missionsByStatus } from "@/lib/ceo/earning/missions";
import { dispatchEarningMissions } from "@/lib/ceo/earning/dispatch-missions";
import { isOwnerAuthorized, unauthorizedResponse } from "@/lib/ceo/security/owner-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    missions: EARNING_MISSIONS,
    activeRuntime: missionsByStatus("active_runtime"),
    draftOnly: missionsByStatus("draft_only"),
    note: "Each agent has a distinct earning mission. Only active_runtime executes in production loops. Draft missions never book revenue.",
  });
}

export async function POST(request: Request) {
  if (!isOwnerAuthorized(request)) return unauthorizedResponse();
  const body = (await request.json().catch(() => ({}))) as { includeDraftOpportunities?: boolean };
  const result = await dispatchEarningMissions({
    includeDraftOpportunities: body.includeDraftOpportunities !== false,
  });
  return NextResponse.json({
    ok: true,
    ...result,
    note: "Enqueued runtime work for salesbot/marketing; other agents logged as opportunities only until runtimeEnabled.",
  });
}
