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
import { spawnAgent, spawnCatalogBatch, SPAWN_CATALOG, type SpawnSpec } from "@/lib/ceo/factory/spawn";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const snapshot = getFactorySnapshot();
    return NextResponse.json(
      {
        ok: true,
        ...snapshot,
        spawnCatalog: SPAWN_CATALOG.map((s) => ({ id: s.id, name: s.name, title: s.title })),
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
        note: "Proposed. Use spawn_agent to enable + assign earning mission.",
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
        note: "Sandbox is static validation only",
      });
    }

    if (action === "spawn_agent") {
      const payload = (body.payload ?? {}) as {
        id?: string; name?: string; domain?: string; channel?: string;
        title?: string; howEarns?: string; model?: string; dailyActions?: string[]; kpi?: string;
      };
      const id = String(payload.id ?? "").trim().toLowerCase();
      if (!id) return NextResponse.json({ ok: false, errors: ["payload.id required"] }, { status: 400 });
      const fromCatalog = SPAWN_CATALOG.find((s) => s.id === id);
      const model = (payload.model || fromCatalog?.model || "seo_content") as SpawnSpec["model"];
      const result = await spawnAgent({
        id,
        name: String(payload.name ?? fromCatalog?.name ?? id),
        domain: String(payload.domain ?? fromCatalog?.domain ?? "other"),
        channel: String(payload.channel ?? fromCatalog?.channel ?? "other"),
        title: String(payload.title ?? fromCatalog?.title ?? id),
        howEarns: String(payload.howEarns ?? fromCatalog?.howEarns ?? "Draft earning workflow"),
        model,
        dailyActions: Array.isArray(payload.dailyActions) && payload.dailyActions.length
          ? payload.dailyActions
          : fromCatalog?.dailyActions ?? ["daily_draft"],
        kpi: String(payload.kpi ?? fromCatalog?.kpi ?? "drafts_produced"),
      });
      return NextResponse.json({
        ...result,
        action,
        note: "Spawn enables agent + mission + job. Never books revenue.",
      }, { status: result.ok ? 200 : 400 });
    }

    if (action === "spawn_catalog") {
      const limit = Number((body.payload as { limit?: number } | undefined)?.limit ?? 8);
      const batch = await spawnCatalogBatch(Math.min(20, Math.max(1, limit)));
      return NextResponse.json({
        ...batch,
        action,
        note: "Spawned next-wave catalog agents with distinct earning jobs.",
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
        note: "Source text only — not written to disk by default",
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
      error: "Unknown action. Use propose_manifest | sandbox_check | spawn_agent | spawn_catalog | build_stub | record_opportunity | record_business_case",
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
