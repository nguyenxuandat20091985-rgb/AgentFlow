/** Append-only audit events. */
export const AUDIT_ACTORS = ["owner","ceo","system","agent","factory"] as const;
export type AuditActor = (typeof AUDIT_ACTORS)[number];
export const AUDIT_ACTIONS = [
  "manifest_proposed","manifest_validated","manifest_rejected","sandbox_check",
  "opportunity_recorded","business_case_recorded","lifecycle_transition",
  "kill_switch","budget_breach","permission_denied","read_only_access",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditEvent = {
  id: string; actor: AuditActor; actorId: string | null; action: AuditAction;
  targetType: string; targetId: string | null; result: "ok"|"denied"|"error";
  detail: Record<string, unknown>; createdAt: string;
};
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function isObject(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function asString(v: unknown): string | null { return typeof v === "string" ? v : null; }

export function validateAuditEvent(input: unknown): ValidationResult<AuditEvent> {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ["auditEvent must be an object"] };
  const id = asString(input.id)?.trim() ?? "";
  const actor = asString(input.actor)?.trim().toLowerCase() ?? "";
  const actorId = input.actorId == null ? null : asString(input.actorId);
  const action = asString(input.action)?.trim().toLowerCase() ?? "";
  const targetType = asString(input.targetType)?.trim() ?? "";
  const targetId = input.targetId == null ? null : asString(input.targetId);
  const result = asString(input.result)?.trim().toLowerCase() ?? "";
  const createdAt = asString(input.createdAt) ?? "";
  const detail = isObject(input.detail) ? input.detail : null;
  if (!id) errors.push("id required");
  if (!(AUDIT_ACTORS as readonly string[]).includes(actor)) errors.push("invalid actor");
  if (!(AUDIT_ACTIONS as readonly string[]).includes(action)) errors.push("invalid action");
  if (!targetType) errors.push("targetType required");
  if (!["ok","denied","error"].includes(result)) errors.push("invalid result");
  if (detail === null) errors.push("detail must be object");
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) errors.push("createdAt ISO");
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { id, actor: actor as AuditActor, actorId: actorId == null ? null : String(actorId), action: action as AuditAction, targetType, targetId: targetId == null ? null : String(targetId), result: result as "ok"|"denied"|"error", detail: detail!, createdAt } };
}
