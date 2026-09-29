/**
 * Persistence adapter for factory entities.
 * Prefer Supabase when configured; fall back to in-memory (non-durable).
 * Never writes revenue_ledger from factory paths.
 */
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-admin";
import type { AgentManifest } from "@/lib/ceo/schemas/agent-manifest";
import type { Opportunity } from "@/lib/ceo/schemas/opportunity";
import type { BusinessCase } from "@/lib/ceo/schemas/business-case";
import type { AuditEvent } from "@/lib/ceo/schemas/audit-event";

export type PersistenceMode = "supabase" | "memory";

export function getPersistenceMode(): PersistenceMode {
  return supabaseAdminConfigured() ? "supabase" : "memory";
}

function mapManifestToRow(m: AgentManifest) {
  return {
    id: m.id, version: m.version, name: m.name, domain: m.domain, channel: m.channel,
    owner: m.owner, branch_hint: m.branchHint, capabilities: m.capabilities,
    budget_policy: m.budgetPolicy, runtime_enabled: m.runtimeEnabled, lifecycle: m.lifecycle,
    template_id: m.templateId, notes: m.notes ?? null, created_at: m.createdAt, updated_at: m.updatedAt,
  };
}

export async function persistManifest(m: AgentManifest): Promise<{ ok: boolean; mode: PersistenceMode; error?: string }> {
  const mode = getPersistenceMode();
  if (mode === "memory") return { ok: true, mode };
  try {
    await supabaseAdmin("agent_manifests?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(mapManifestToRow(m)),
    });
    return { ok: true, mode };
  } catch (e) {
    return { ok: false, mode, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function loadManifests(limit = 50): Promise<{ mode: PersistenceMode; items: AgentManifest[] }> {
  const mode = getPersistenceMode();
  if (mode === "memory") return { mode, items: [] };
  try {
    const rows = await supabaseAdmin<Record<string, unknown>[]>(`agent_manifests?select=*&order=updated_at.desc&limit=${limit}`);
    const items: AgentManifest[] = (rows ?? []).map((row) => ({
      id: String(row.id), version: String(row.version), name: String(row.name),
      domain: row.domain as AgentManifest["domain"], channel: String(row.channel), owner: String(row.owner),
      branchHint: String(row.branch_hint ?? ""),
      capabilities: Array.isArray(row.capabilities) ? (row.capabilities as string[]) : [],
      budgetPolicy: (row.budget_policy as AgentManifest["budgetPolicy"]),
      runtimeEnabled: Boolean(row.runtime_enabled),
      lifecycle: row.lifecycle as AgentManifest["lifecycle"],
      templateId: row.template_id == null ? null : String(row.template_id),
      createdAt: String(row.created_at), updatedAt: String(row.updated_at),
      notes: row.notes == null ? undefined : String(row.notes),
    }));
    return { mode, items };
  } catch {
    return { mode, items: [] };
  }
}

export async function persistOpportunity(o: Opportunity): Promise<{ ok: boolean; mode: PersistenceMode; error?: string }> {
  const mode = getPersistenceMode();
  if (mode === "memory") return { ok: true, mode };
  try {
    await supabaseAdmin("opportunities?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: o.id, title: o.title, summary: o.summary, domain: o.domain, status: o.status,
        source: o.source, assumptions: o.assumptions,
        estimated_monthly_revenue_vnd: o.estimatedMonthlyRevenueVnd,
        estimated_monthly_cost_vnd: o.estimatedMonthlyCostVnd,
        is_realized_revenue: false, decided_by: o.decidedBy, decision_notes: o.decisionNotes,
        created_at: o.createdAt, updated_at: o.updatedAt,
      }),
    });
    return { ok: true, mode };
  } catch (e) {
    return { ok: false, mode, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function persistBusinessCase(b: BusinessCase): Promise<{ ok: boolean; mode: PersistenceMode; error?: string }> {
  const mode = getPersistenceMode();
  if (mode === "memory") return { ok: true, mode };
  try {
    await supabaseAdmin("business_cases?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: b.id, opportunity_id: b.opportunityId, title: b.title, status: b.status,
        assumptions: b.assumptions,
        projected_gross_monthly_vnd: b.projectedGrossMonthlyVnd,
        projected_net_monthly_vnd: b.projectedNetMonthlyVnd,
        confidence_interval_low_vnd: b.confidenceIntervalLowVnd,
        confidence_interval_high_vnd: b.confidenceIntervalHighVnd,
        classification: "forecast_only", is_realized_revenue: false,
        reviewed_by: b.reviewedBy, created_at: b.createdAt, updated_at: b.updatedAt,
      }),
    });
    return { ok: true, mode };
  } catch (e) {
    return { ok: false, mode, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function persistAuditEvent(a: AuditEvent): Promise<{ ok: boolean; mode: PersistenceMode; error?: string }> {
  const mode = getPersistenceMode();
  if (mode === "memory") return { ok: true, mode };
  try {
    await supabaseAdmin("ceo_audit_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: a.id, actor: a.actor, actor_id: a.actorId, action: a.action,
        target_type: a.targetType, target_id: a.targetId, result: a.result,
        detail: a.detail, created_at: a.createdAt,
      }),
    });
    return { ok: true, mode };
  } catch (e) {
    return { ok: false, mode, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function loadAuditEvents(limit = 50): Promise<{ mode: PersistenceMode; items: AuditEvent[] }> {
  const mode = getPersistenceMode();
  if (mode === "memory") return { mode, items: [] };
  try {
    const rows = await supabaseAdmin<Record<string, unknown>[]>(`ceo_audit_events?select=*&order=created_at.desc&limit=${limit}`);
    const items: AuditEvent[] = (rows ?? []).map((row) => ({
      id: String(row.id),
      actor: row.actor as AuditEvent["actor"],
      actorId: row.actor_id == null ? null : String(row.actor_id),
      action: row.action as AuditEvent["action"],
      targetType: String(row.target_type),
      targetId: row.target_id == null ? null : String(row.target_id),
      result: row.result as AuditEvent["result"],
      detail: (row.detail as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at),
    }));
    return { mode, items };
  } catch {
    return { mode, items: [] };
  }
}
