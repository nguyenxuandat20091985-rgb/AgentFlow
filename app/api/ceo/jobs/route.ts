import { NextResponse } from "next/server";
import { enqueueJob, listPendingJobs } from "@/lib/ceo/jobs/queue";
import { isOwnerAuthorized, unauthorizedResponse } from "@/lib/ceo/security/owner-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await listPendingJobs(50);
  return NextResponse.json({
    ok: true,
    mode: result.mode,
    jobs: result.jobs,
    note: "Jobs are pending work items; workers must be allow-listed. No auto financial actions.",
  });
}

export async function POST(request: Request) {
  if (!isOwnerAuthorized(request)) return unauthorizedResponse();
  const body = (await request.json().catch(() => ({}))) as {
    agentId?: string;
    actionType?: string;
    channel?: string;
    uniqueKey?: string;
    priority?: "low" | "medium" | "high";
    payload?: Record<string, unknown>;
  };
  const agentId = String(body.agentId ?? "").trim().toLowerCase();
  const actionType = String(body.actionType ?? "").trim();
  const channel = String(body.channel ?? "ceo").trim();
  const uniqueKey = String(body.uniqueKey ?? Date.now()).trim();
  if (!agentId || !actionType) {
    return NextResponse.json({ ok: false, error: "agentId and actionType required" }, { status: 400 });
  }
  const banned = ["withdraw", "transfer", "change_payment", "charge", "purchase_ads"];
  if (banned.some((b) => actionType.toLowerCase().includes(b))) {
    return NextResponse.json({ ok: false, error: "financial action types are not enqueueable" }, { status: 403 });
  }
  const result = await enqueueJob({
    agentId,
    actionType,
    channel,
    uniqueKey,
    priority: body.priority,
    payload: body.payload,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, job: result.job, mode: result.mode });
}
