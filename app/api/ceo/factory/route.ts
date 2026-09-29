import { NextResponse } from "next/server";
import {
  factoryPropose,
  factoryRecordBusinessCase,
  factoryRecordOpportunity,
  factoryRunSandbox,
  getFactorySnapshot,
  FACTORY_MODE,
} from "@/lib/ceo/factory";
import { isOwnerAuthorized, unauthorizedResponse, ownerAuthConfigured } from "@/lib/ceo/security/owner-auth";
import { persistManifest, persistOpportunity, persistBusinessCase, getPersistenceMode } from "@/lib/ceo/persistence/store";
import { generateAgentStubSource, proposedPathsForAgent } from "@/lib/ceo/templates/agent-stub";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = getFactorySnapshot();
    return NextResponse.json(
      {
        ok: true,
        ...snapshot,
        persistence: getPersistenceMode(),
        authConfigured: ownerAuthConfigured(),
        isolation: "Factory failure must not stop salesbot/marketing heartbeats",
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[CEO_FACTORY]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Factory unavailable",
        mode: FACTORY_MODE,
        isolation: "Factory failure must not stop salesbot/marketing heartbeats",
      },
      { status: 503 },
    );
  }
}

type PostBody = { action?: string; payload?: unknown };

export async function POST(request: Request) {
  try {
    if (!isOwnerAuthorized(request)) {
      return unauthorizedResponse("unauthorized — Bearer AGENT_HEARTBEAT_SECRET or x-owner-secret required for mutating factory actions");
    }

    const body = (await request.json().catch(() => ({}))) as PostBody;
    const action = String(body.action ?? "").trim().toLowerCase();

    if (action === "propose_manifest") {
      const result = factoryPropose((body.payload ?? {}) as Parameters<typeof factoryPropose>[0]);
      if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
      const persisted = await persistManifest(result.manifest);
      return NextResponse.json({
        ok: true, action, mode: FACTORY_MODE, manifest: result.manifest, persistence: persisted,
        note: "Proposed only. runtimeEnabled=false. Owner must review and flip fleet registry to enable.",
      });
    }

    if (action === "sandbox_check") {
      const agentId = String((body.payload as { agentId?: string } | undefined)?.agentId ?? "").trim();
      if (!agentId) return NextResponse.json({ ok: false, errors: ["payload.agentId required"] }, { status: 400 });
      const result = factoryRunSandbox(agentId);
      if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
      if (result.manifest) await persistManifest(result.manifest);
      return NextResponse.json({
        ok: true, action, report: result.report, manifest: result.manifest,
        note: "Sandbox is static validation only; does not enable production runtime",
      });
    }

    if (action === "build_stub") {
      const payload = (body.payload ?? {}) as { id?: string; name?: string; domain?: string; channel?: string; goal?: string };
      const id = String(payload.id ?? "").trim().toLowerCase();
      if (!id) return NextResponse.json({ ok: false, errors: ["payload.id required"] }, { status: 400 });
      const source = generateAgentStubSource({
        id, name: String(payload.name ?? id), domain: String(payload.domain ?? "other"),
        channel: String(payload.channel ?? "other"), goal: String(payload.goal ?? "Draft-only agent"),
      });
      return NextResponse.json({
        ok: true, action, paths: proposedPathsForAgent(id), source,
        note: "Source text only — not written to disk, not executed, not deployed",
      });
    }

    if (action === "record_opportunity") {
      const result = factoryRecordOpportunity(body.payload);
      if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
      const persisted = await persistOpportunity(result.value);
      return NextResponse.json({ ok: true, action, opportunity: result.value, persistence: persisted, note: "Hypothesis only — isRealizedRevenue=false" });
    }

    if (action === "record_business_case") {
      const result = factoryRecordBusinessCase(body.payload);
      if (!result.ok) return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
      const persisted = await persistBusinessCase(result.value);
      return NextResponse.json({ ok: true, action, businessCase: result.value, persistence: persisted, note: "Forecast only — isRealizedRevenue=false" });
    }

    return NextResponse.json({
      ok: false,
      error: "Unknown action. Use propose_manifest | sandbox_check | build_stub | record_opportunity | record_business_case",
      mode: FACTORY_MODE,
    }, { status: 400 });
  } catch (error) {
    console.error("[CEO_FACTORY_POST]", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Factory request failed",
      isolation: "Factory failure must not stop salesbot/marketing heartbeats",
    }, { status: 500 });
  }
}
