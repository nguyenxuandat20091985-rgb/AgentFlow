import { NextResponse } from "next/server";
import { buildOpportunityFromSignal, buildDraftBusinessCase, recommendContinueOrStop } from "@/lib/ceo/opportunity/engine";
import { factoryRecordOpportunity, factoryRecordBusinessCase, getFactorySnapshot } from "@/lib/ceo/factory";
import { isOwnerAuthorized, unauthorizedResponse } from "@/lib/ceo/security/owner-auth";
import { persistOpportunity, persistBusinessCase } from "@/lib/ceo/persistence/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const snap = getFactorySnapshot();
  return NextResponse.json({
    ok: true,
    opportunities: snap.opportunities,
    businessCases: snap.businessCases,
    note: "All items are hypothesis/forecast — never realized revenue",
  });
}

export async function POST(request: Request) {
  if (!isOwnerAuthorized(request)) return unauthorizedResponse();
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    title?: string;
    summary?: string;
    domain?: string;
    sourceUrl?: string;
    opportunityId?: string;
  };
  const action = String(body.action ?? "discover").toLowerCase();

  if (action === "discover") {
    const built = buildOpportunityFromSignal({
      title: String(body.title ?? "Untitled opportunity"),
      summary: String(body.summary ?? "No summary"),
      domain: String(body.domain ?? "other"),
      sourceUrl: body.sourceUrl,
    });
    if (!built.ok) return NextResponse.json({ ok: false, errors: built.errors }, { status: 400 });
    const recorded = factoryRecordOpportunity(built.opportunity);
    if (!recorded.ok) return NextResponse.json({ ok: false, errors: recorded.errors }, { status: 400 });
    await persistOpportunity(recorded.value);
    return NextResponse.json({ ok: true, opportunity: recorded.value });
  }

  if (action === "business_case") {
    const built = buildDraftBusinessCase({
      title: String(body.title ?? "Draft case"),
      opportunityId: body.opportunityId ?? null,
    });
    if (!built.ok) return NextResponse.json({ ok: false, errors: built.errors }, { status: 400 });
    const recorded = factoryRecordBusinessCase(built.businessCase);
    if (!recorded.ok) return NextResponse.json({ ok: false, errors: recorded.errors }, { status: 400 });
    await persistBusinessCase(recorded.value);
    const rec = recommendContinueOrStop(recorded.value);
    return NextResponse.json({ ok: true, businessCase: recorded.value, recommendation: rec });
  }

  return NextResponse.json({ ok: false, error: "action must be discover | business_case" }, { status: 400 });
}
