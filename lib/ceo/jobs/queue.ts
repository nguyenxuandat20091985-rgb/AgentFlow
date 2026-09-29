/**
 * CEO job queue — uses existing agent_action_queue when Supabase is configured.
 * Idempotent via dedupe_key. Does not execute agent code in-process.
 */
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase-admin";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "dead" | "cancelled";

export type CeoJob = {
  id?: string;
  agentId: string;
  actionType: string;
  channel: string;
  status: JobStatus;
  priority: "low" | "medium" | "high";
  dedupeKey: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  createdAt?: string;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const memoryJobs: CeoJob[] = [];

function newDedupe(agentId: string, actionType: string, key: string): string {
  return `ceo:${agentId}:${actionType}:${key}`;
}

export async function enqueueJob(input: {
  agentId: string;
  actionType: string;
  channel: string;
  priority?: "low" | "medium" | "high";
  uniqueKey: string;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
}): Promise<{ ok: boolean; job?: CeoJob; error?: string; mode: "supabase" | "memory" }> {
  const job: CeoJob = {
    agentId: input.agentId,
    actionType: input.actionType,
    channel: input.channel,
    status: "pending",
    priority: input.priority ?? "medium",
    dedupeKey: newDedupe(input.agentId, input.actionType, input.uniqueKey),
    payload: input.payload ?? {},
    attempts: 0,
    maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    createdAt: new Date().toISOString(),
  };

  if (!supabaseAdminConfigured()) {
    const existing = memoryJobs.find((j) => j.dedupeKey === job.dedupeKey && j.status === "pending");
    if (existing) return { ok: true, job: existing, mode: "memory" };
    memoryJobs.unshift(job);
    if (memoryJobs.length > 500) memoryJobs.length = 500;
    return { ok: true, job, mode: "memory" };
  }

  try {
    await supabaseAdmin("agent_action_queue?on_conflict=dedupe_key", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        agent_id: job.agentId,
        action_type: job.actionType,
        channel: job.channel,
        status: "pending",
        priority: job.priority,
        dedupe_key: job.dedupeKey,
        payload: { ...job.payload, _ceo: { attempts: 0, maxAttempts: job.maxAttempts } },
      }),
    });
    return { ok: true, job, mode: "supabase" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), mode: "supabase" };
  }
}

export async function listPendingJobs(limit = 50): Promise<{ mode: "supabase" | "memory"; jobs: CeoJob[] }> {
  if (!supabaseAdminConfigured()) {
    return { mode: "memory", jobs: memoryJobs.filter((j) => j.status === "pending").slice(0, limit) };
  }
  try {
    const rows = await supabaseAdmin<Record<string, unknown>[]>(
      `agent_action_queue?status=eq.pending&order=created_at.asc&limit=${limit}`,
    );
    const jobs: CeoJob[] = (rows ?? []).map((r) => ({
      id: String(r.id),
      agentId: String(r.agent_id),
      actionType: String(r.action_type),
      channel: String(r.channel),
      status: "pending",
      priority: (r.priority as CeoJob["priority"]) ?? "medium",
      dedupeKey: String(r.dedupe_key),
      payload: (r.payload as Record<string, unknown>) ?? {},
      attempts: Number((r.payload as { _ceo?: { attempts?: number } } | undefined)?._ceo?.attempts ?? 0),
      maxAttempts: Number((r.payload as { _ceo?: { maxAttempts?: number } } | undefined)?._ceo?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS),
      createdAt: String(r.created_at ?? ""),
    }));
    return { mode: "supabase", jobs };
  } catch {
    return { mode: "supabase", jobs: [] };
  }
}

export function shouldDeadLetter(attempts: number, maxAttempts: number): boolean {
  return attempts >= maxAttempts;
}

export function __resetMemoryJobsForTests() {
  memoryJobs.length = 0;
}
