/**
 * AI Factory — propose, sandbox, spawn (execute_limited).
 * Never books revenue or moves money.
 */
import {
  assertManifestNotColliding, canTransition, defaultBudgetPolicy, validateAgentManifest,
  type AgentManifest, type AgentLifecycleState,
} from "@/lib/ceo/schemas/agent-manifest";
import { validateOpportunity, type Opportunity } from "@/lib/ceo/schemas/opportunity";
import { validateBusinessCase, type BusinessCase } from "@/lib/ceo/schemas/business-case";
import { validateAuditEvent, type AuditEvent } from "@/lib/ceo/schemas/audit-event";
import { runSandboxChecks, type SandboxReport } from "@/lib/ceo/factory/sandbox";

export type FactoryMode = "observe" | "recommend" | "execute_limited";
export const FACTORY_MODE: FactoryMode = "execute_limited";
export const FACTORY_MANIFEST_QUOTA = 50;

export type ProposedManifestInput = {
  id: string; name: string; domain: string; channel: string;
  owner?: string; capabilities?: string[]; templateId?: string | null; notes?: string;
  budgetPolicy?: Partial<ReturnType<typeof defaultBudgetPolicy>>;
};

export function proposeAgentManifest(input: ProposedManifestInput): { ok: true; manifest: AgentManifest } | { ok: false; errors: string[] } {
  const now = new Date().toISOString();
  const budget = { ...defaultBudgetPolicy(), ...(input.budgetPolicy ?? {}) };
  const candidate = {
    id: String(input.id ?? "").trim().toLowerCase(),
    version: "0.1.0",
    name: String(input.name ?? "").trim(),
    domain: String(input.domain ?? "").trim().toLowerCase(),
    channel: String(input.channel ?? "").trim().toLowerCase(),
    owner: String(input.owner ?? "owner").trim(),
    branchHint: `agent/${String(input.id ?? "").trim().toLowerCase()}-*`,
    capabilities: Array.isArray(input.capabilities) ? input.capabilities : [],
    budgetPolicy: budget,
    runtimeEnabled: false as const,
    lifecycle: "proposed" as AgentLifecycleState,
    templateId: input.templateId ?? null,
    createdAt: now, updatedAt: now, notes: input.notes,
  };
  const validated = validateAgentManifest(candidate, { allowRuntimeEnabled: false });
  if (!validated.ok) return { ok: false, errors: validated.errors };
  const collision = assertManifestNotColliding(validated.value);
  if (!collision.ok) return { ok: false, errors: collision.errors };
  return { ok: true, manifest: validated.value };
}

const memoryStore: {
  manifests: AgentManifest[]; opportunities: Opportunity[]; businessCases: BusinessCase[];
  audit: AuditEvent[]; sandboxReports: SandboxReport[]; globalPaused: boolean;
} = { manifests: [], opportunities: [], businessCases: [], audit: [], sandboxReports: [], globalPaused: false };

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function recordAudit(partial: Omit<AuditEvent, "id" | "createdAt"> & { id?: string; createdAt?: string }): AuditEvent | null {
  const event = { id: partial.id ?? newId("audit"), createdAt: partial.createdAt ?? new Date().toISOString(), ...partial };
  const validated = validateAuditEvent(event);
  if (!validated.ok) return null;
  memoryStore.audit.unshift(validated.value);
  if (memoryStore.audit.length > 500) memoryStore.audit.length = 500;
  return validated.value;
}

export function isGlobalPaused(): boolean { return memoryStore.globalPaused; }

export function setGlobalPaused(paused: boolean, actor: string = "owner"): AuditEvent | null {
  memoryStore.globalPaused = paused;
  return recordAudit({
    actor: "owner", actorId: actor, action: "kill_switch", targetType: "system", targetId: "global",
    result: "ok", detail: { paused, note: "In-process kill switch; production pause also requires fleet.ts flip" },
  });
}

export function getManifest(agentId: string): AgentManifest | undefined {
  return memoryStore.manifests.find((m) => m.id === agentId);
}

export function factoryPropose(input: ProposedManifestInput) {
  if (memoryStore.globalPaused) {
    recordAudit({ actor: "factory", actorId: "factory", action: "manifest_rejected", targetType: "agent_manifest", targetId: input.id ?? null, result: "denied", detail: { reason: "global kill switch active" } });
    return { ok: false as const, errors: ["Global kill switch is active; proposals denied"] };
  }
  const id = String(input.id ?? "").trim().toLowerCase();
  const existing = memoryStore.manifests.find((m) => m.id === id);
  if (existing) {
    return { ok: true as const, manifest: existing };
  }
  if (memoryStore.manifests.length >= FACTORY_MANIFEST_QUOTA) {
    return { ok: false as const, errors: [`Factory quota exceeded (${FACTORY_MANIFEST_QUOTA})`] };
  }
  const result = proposeAgentManifest(input);
  if (!result.ok) {
    recordAudit({ actor: "factory", actorId: "factory", action: "manifest_rejected", targetType: "agent_manifest", targetId: input.id ?? null, result: "denied", detail: { errors: result.errors } });
    return result;
  }
  memoryStore.manifests.unshift(result.manifest);
  recordAudit({ actor: "factory", actorId: "factory", action: "manifest_proposed", targetType: "agent_manifest", targetId: result.manifest.id, result: "ok", detail: { version: result.manifest.version, lifecycle: result.manifest.lifecycle } });
  return result;
}

export function factoryRunSandbox(agentId: string) {
  const manifest = memoryStore.manifests.find((m) => m.id === agentId);
  if (!manifest) return { ok: false as const, errors: [`manifest ${agentId} not found`] };
  const report = runSandboxChecks(manifest);
  memoryStore.sandboxReports.unshift(report);
  if (report.passed && manifest.lifecycle === "proposed") {
    const t = canTransition(manifest.lifecycle, "sandbox");
    if (t.allowed) { manifest.lifecycle = "sandbox"; manifest.updatedAt = new Date().toISOString(); }
  }
  recordAudit({ actor: "factory", actorId: "factory", action: "sandbox_check", targetType: "agent_manifest", targetId: agentId, result: report.passed ? "ok" : "denied", detail: { passed: report.passed, checks: report.checks.map((c) => ({ name: c.name, ok: c.ok })) } });
  return { ok: true as const, report, manifest };
}

export function factoryRecordOpportunity(input: unknown) {
  const validated = validateOpportunity(input);
  if (!validated.ok) return validated;
  memoryStore.opportunities.unshift(validated.value);
  recordAudit({ actor: "ceo", actorId: "ceo", action: "opportunity_recorded", targetType: "opportunity", targetId: validated.value.id, result: "ok", detail: { status: validated.value.status, isRealizedRevenue: false } });
  return validated;
}

export function factoryRecordBusinessCase(input: unknown) {
  const validated = validateBusinessCase(input);
  if (!validated.ok) return validated;
  memoryStore.businessCases.unshift(validated.value);
  recordAudit({ actor: "ceo", actorId: "ceo", action: "business_case_recorded", targetType: "business_case", targetId: validated.value.id, result: "ok", detail: { classification: validated.value.classification, isRealizedRevenue: false, projectedNetMonthlyVnd: validated.value.projectedNetMonthlyVnd } });
  return validated;
}

export function getFactorySnapshot() {
  return {
    mode: FACTORY_MODE,
    phase: 3 as const,
    globalPaused: memoryStore.globalPaused,
    quota: FACTORY_MANIFEST_QUOTA,
    note: "execute_limited: propose → sandbox → spawn enable + mission. Never books revenue or deploys arbitrary code.",
    manifests: memoryStore.manifests.slice(0, 50),
    opportunities: memoryStore.opportunities.slice(0, 50),
    businessCases: memoryStore.businessCases.slice(0, 50),
    audit: memoryStore.audit.slice(0, 50),
    sandboxReports: memoryStore.sandboxReports.slice(0, 20),
    counts: {
      manifests: memoryStore.manifests.length, opportunities: memoryStore.opportunities.length,
      businessCases: memoryStore.businessCases.length, audit: memoryStore.audit.length,
      sandboxReports: memoryStore.sandboxReports.length,
    },
  };
}

export function __resetFactoryStoreForTests() {
  memoryStore.manifests = []; memoryStore.opportunities = []; memoryStore.businessCases = [];
  memoryStore.audit = []; memoryStore.sandboxReports = []; memoryStore.globalPaused = false;
}
