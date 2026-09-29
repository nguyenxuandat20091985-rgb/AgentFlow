/**
 * Agent manifest schema — factory foundation. Pure validation; no activation.
 */
export const AGENT_LIFECYCLE_STATES = [
  "proposed", "sandbox", "validated", "review_required", "approved", "enabled", "paused", "retired",
] as const;
export type AgentLifecycleState = (typeof AGENT_LIFECYCLE_STATES)[number];

export const AGENT_DOMAINS = [
  "orchestration", "website", "facebook", "database", "payment", "security",
  "error_handler", "binance", "support", "analytics", "content", "other",
] as const;
export type AgentDomain = (typeof AGENT_DOMAINS)[number];

export type BudgetPolicy = {
  dailySpendCeilingVnd: number;
  maxConcurrentJobs: number;
  maxJobsPerHour: number;
  requireOwnerApprovalAboveVnd: number;
};

export type AgentManifest = {
  id: string;
  version: string;
  name: string;
  domain: AgentDomain;
  channel: string;
  owner: string;
  branchHint: string;
  capabilities: string[];
  budgetPolicy: BudgetPolicy;
  runtimeEnabled: boolean;
  lifecycle: AgentLifecycleState;
  templateId: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: string;
};

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const ID_RE = /^[a-z][a-z0-9_]{1,31}$/;
const VERSION_RE = /^\d+\.\d+\.\d+$/;
const CHANNEL_RE = /^[a-z][a-z0-9_-]{1,31}$/;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function asString(v: unknown): string | null { return typeof v === "string" ? v : null; }
function asNumber(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) ? v : null; }
function asBoolean(v: unknown): boolean | null { return typeof v === "boolean" ? v : null; }
function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v) || !v.every((i) => typeof i === "string")) return null;
  return v as string[];
}

export function defaultBudgetPolicy(): BudgetPolicy {
  return { dailySpendCeilingVnd: 0, maxConcurrentJobs: 1, maxJobsPerHour: 10, requireOwnerApprovalAboveVnd: 0 };
}

export function validateBudgetPolicy(input: unknown): ValidationResult<BudgetPolicy> {
  if (!isObject(input)) return { ok: false, errors: ["budgetPolicy must be an object"] };
  const errors: string[] = [];
  const dailySpendCeilingVnd = asNumber(input.dailySpendCeilingVnd);
  const maxConcurrentJobs = asNumber(input.maxConcurrentJobs);
  const maxJobsPerHour = asNumber(input.maxJobsPerHour);
  const requireOwnerApprovalAboveVnd = asNumber(input.requireOwnerApprovalAboveVnd);
  if (dailySpendCeilingVnd === null || dailySpendCeilingVnd < 0) errors.push("budgetPolicy.dailySpendCeilingVnd must be non-negative");
  if (maxConcurrentJobs === null || maxConcurrentJobs < 1 || maxConcurrentJobs > 50) errors.push("budgetPolicy.maxConcurrentJobs must be 1..50");
  if (maxJobsPerHour === null || maxJobsPerHour < 1 || maxJobsPerHour > 1000) errors.push("budgetPolicy.maxJobsPerHour must be 1..1000");
  if (requireOwnerApprovalAboveVnd === null || requireOwnerApprovalAboveVnd < 0) errors.push("budgetPolicy.requireOwnerApprovalAboveVnd must be non-negative");
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { dailySpendCeilingVnd: dailySpendCeilingVnd!, maxConcurrentJobs: Math.floor(maxConcurrentJobs!), maxJobsPerHour: Math.floor(maxJobsPerHour!), requireOwnerApprovalAboveVnd: requireOwnerApprovalAboveVnd! } };
}

export function validateAgentManifest(input: unknown, options?: { allowRuntimeEnabled?: boolean }): ValidationResult<AgentManifest> {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ["manifest must be an object"] };
  const id = asString(input.id)?.trim().toLowerCase() ?? "";
  const version = asString(input.version)?.trim() ?? "";
  const name = asString(input.name)?.trim() ?? "";
  const domain = asString(input.domain)?.trim().toLowerCase() ?? "";
  const channel = asString(input.channel)?.trim().toLowerCase() ?? "";
  const owner = asString(input.owner)?.trim() ?? "";
  const branchHint = asString(input.branchHint)?.trim() ?? "";
  const capabilities = asStringArray(input.capabilities);
  const runtimeEnabled = asBoolean(input.runtimeEnabled);
  const lifecycle = asString(input.lifecycle)?.trim().toLowerCase() ?? "";
  const templateId = input.templateId === null || input.templateId === undefined ? null : asString(input.templateId);
  const createdAt = asString(input.createdAt) ?? "";
  const updatedAt = asString(input.updatedAt) ?? "";
  const notes = input.notes === undefined ? undefined : asString(input.notes) ?? undefined;

  if (!ID_RE.test(id)) errors.push("id must match /^[a-z][a-z0-9_]{1,31}$/");
  if (!VERSION_RE.test(version)) errors.push("version must be semver X.Y.Z");
  if (!name || name.length > 80) errors.push("name is required (max 80 chars)");
  if (!(AGENT_DOMAINS as readonly string[]).includes(domain)) errors.push(`domain must be one of: ${AGENT_DOMAINS.join(", ")}`);
  if (!CHANNEL_RE.test(channel)) errors.push("channel must match /^[a-z][a-z0-9_-]{1,31}$/");
  if (!owner || owner.length > 80) errors.push("owner is required (max 80 chars)");
  if (!branchHint.startsWith("agent/")) errors.push("branchHint must start with agent/");
  if (capabilities === null) errors.push("capabilities must be a string array");
  if (runtimeEnabled === null) errors.push("runtimeEnabled must be a boolean");
  if (!(AGENT_LIFECYCLE_STATES as readonly string[]).includes(lifecycle)) errors.push(`lifecycle must be one of: ${AGENT_LIFECYCLE_STATES.join(", ")}`);
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) errors.push("createdAt must be ISO timestamp");
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) errors.push("updatedAt must be ISO timestamp");

  const budgetResult = validateBudgetPolicy(input.budgetPolicy ?? defaultBudgetPolicy());
  if (!budgetResult.ok) errors.push(...budgetResult.errors);

  if (runtimeEnabled === true && !options?.allowRuntimeEnabled) {
    errors.push("runtimeEnabled must be false for factory-proposed manifests; enable only via fleet registry after owner review");
  }
  if (lifecycle === "enabled" && runtimeEnabled !== true) errors.push("lifecycle=enabled requires runtimeEnabled=true");
  if (lifecycle === "proposed" && runtimeEnabled === true) errors.push("lifecycle=proposed cannot have runtimeEnabled=true");
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      id, version, name, domain: domain as AgentDomain, channel, owner, branchHint,
      capabilities: capabilities ?? [],
      budgetPolicy: budgetResult.ok ? budgetResult.value : defaultBudgetPolicy(),
      runtimeEnabled: runtimeEnabled!, lifecycle: lifecycle as AgentLifecycleState,
      templateId, createdAt, updatedAt, notes,
    },
  };
}

export const RESERVED_AGENT_IDS = new Set([
  "ceo", "salesbot", "marketing", "binancescout", "supportai", "dataanalyzer",
  "contentwriter", "chatbot", "leadgen", "emailai", "socialmedia", "analytics",
  "crm", "billing", "inventory", "research", "design", "code", "qa", "hr", "finance", "customerservice",
]);

export function assertManifestNotColliding(manifest: AgentManifest): ValidationResult<true> {
  if (RESERVED_AGENT_IDS.has(manifest.id)) {
    return { ok: false, errors: [`agent id "${manifest.id}" is reserved`] };
  }
  return { ok: true, value: true };
}

const TRANSITIONS: Record<AgentLifecycleState, AgentLifecycleState[]> = {
  proposed: ["sandbox", "retired"],
  sandbox: ["validated", "proposed", "retired"],
  validated: ["review_required", "sandbox", "retired"],
  review_required: ["approved", "sandbox", "retired"],
  approved: ["enabled", "paused", "retired"],
  enabled: ["paused", "retired"],
  paused: ["enabled", "retired"],
  retired: [],
};

export function canTransition(from: AgentLifecycleState, to: AgentLifecycleState): { allowed: boolean; reason: string } {
  if (from === to) return { allowed: true, reason: "no-op" };
  const allowed = TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) return { allowed: false, reason: `transition ${from} → ${to} is not permitted` };
  if (to === "enabled") return { allowed: false, reason: "enabled requires owner fleet registry flip, not factory" };
  return { allowed: true, reason: "ok" };
}
