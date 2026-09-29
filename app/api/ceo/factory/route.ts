import { NextResponse } from "next/server";
import {
  factoryPropose, factoryRecordBusinessCase, factoryRecordOpportunity,
  factoryRunSandbox, getFactorySnapshot, FACTORY_MODE,
} from "@/lib/ceo/factory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = getFactorySnapshot();
    return NextResponse.json({ ok: true, ...snapshot, isolation: "Factory failure must not stop salesbot/marketing heartbeats" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[CEO_FACTORY]", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Factory unavailable", mode: FACTORY_MODE, isolation: "Factory failure must not stop salesbot/marketing heartbeats" }, { status: 503 });
  }
}

type PostBody = { action?: string; payload?: unknown };

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PostBody;
    const action = String(body.action ?? "").trim().toLowerCase();

    if (action === "propose_manifest") {
      const result = factoryPropose((body.payload ?? {}) as Parameters<typeof factoryPropose>[0]);
      if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
      return NextResponse.json({ ok: true, action, mode: FACTORY_MODE, manifest: result.manifest, note: "Proposed only. runtimeEnabled=false. Owner must review and flip fleet registry to enable." });
    }
    if (action === "sandbox_check") {
      const agentId = String((body.payload as { agentId?: string } | undefined)?.agentId ?? "").trim();
      if (!agentId) return NextResponse.json({ ok: false, errors: ["payload.agentId required"] }, { status: 400 });
      const result = factoryRunSandbox(agentId);
      if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
      return NextResponse.json({ ok: true, action, report: result.report, manifest: result.manifest, note: "Sandbox is static validation only; does not enable production runtime" });
    }
    if (action === "record_opportunity") {
      const result = factoryRecordOpportunity(body.payload);
      if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
      return NextResponse.json({ ok: true, action, opportunity: result.value, note: "Hypothesis only — isRealizedRevenue=false" });
    }
    if (action === "record_business_case") {
      const result = factoryRecordBusinessCase(body.payload);
      if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
      return NextResponse.json({ ok: true, action, businessCase: result.value, note: "Forecast only — isRealizedRevenue=false" });
    }
    return NextResponse.json({ ok: false, error: "Unknown action. Use propose_manifest | sandbox_check | record_opportunity | record_business_case", mode: FACTORY_MODE }, { status: 400 });
  } catch (error) {
    console.error("[CEO_FACTORY_POST]", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Factory request failed", isolation: "Factory failure must not stop salesbot/marketing heartbeats" }, { status: 500 });
  }
}
