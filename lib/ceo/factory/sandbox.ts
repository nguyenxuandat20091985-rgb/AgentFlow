/**
 * Sandbox validation for proposed agent manifests.
 * Static checks only — no shell, no network, no secrets.
 */
import type { AgentManifest } from "@/lib/ceo/schemas/agent-manifest";
import { RESERVED_AGENT_IDS } from "@/lib/ceo/schemas/agent-manifest";

export type SandboxCheck = { name: string; ok: boolean; detail: string };
export type SandboxReport = { agentId: string; passed: boolean; checks: SandboxCheck[]; checkedAt: string };

const FORBIDDEN_CAPABILITIES = [
  "shell", "exec", "sudo", "wallet", "private_key", "withdraw", "transfer_funds",
  "change_payment", "merge_pr", "deploy_production", "read_all_secrets", "impersonate_owner",
];

export function runSandboxChecks(manifest: AgentManifest): SandboxReport {
  const checks: SandboxCheck[] = [];

  checks.push({
    name: "runtime_disabled",
    ok: manifest.runtimeEnabled === false,
    detail: manifest.runtimeEnabled ? "FAIL: runtimeEnabled must be false" : "runtimeEnabled=false",
  });
  checks.push({
    name: "not_reserved_id",
    ok: !RESERVED_AGENT_IDS.has(manifest.id),
    detail: RESERVED_AGENT_IDS.has(manifest.id) ? `FAIL: id ${manifest.id} reserved` : "id not reserved",
  });
  checks.push({
    name: "branch_hint",
    ok: manifest.branchHint.startsWith(`agent/${manifest.id}`),
    detail: manifest.branchHint.startsWith(`agent/${manifest.id}`) ? `branchHint=${manifest.branchHint}` : `FAIL: must start with agent/${manifest.id}`,
  });
  checks.push({
    name: "budget_non_negative",
    ok: manifest.budgetPolicy.dailySpendCeilingVnd >= 0 && manifest.budgetPolicy.maxConcurrentJobs >= 1 && manifest.budgetPolicy.maxJobsPerHour >= 1,
    detail: "budget policy bounds",
  });

  const forbidden = manifest.capabilities.map((c) => c.toLowerCase()).filter((c) => FORBIDDEN_CAPABILITIES.some((f) => c.includes(f)));
  checks.push({
    name: "no_forbidden_capabilities",
    ok: forbidden.length === 0,
    detail: forbidden.length === 0 ? "no forbidden capabilities" : `FAIL: ${forbidden.join(", ")}`,
  });
  checks.push({
    name: "lifecycle_sandboxable",
    ok: ["proposed", "sandbox", "validated"].includes(manifest.lifecycle),
    detail: `lifecycle=${manifest.lifecycle}`,
  });
  checks.push({
    name: "zero_default_spend",
    ok: manifest.budgetPolicy.dailySpendCeilingVnd === 0,
    detail: manifest.budgetPolicy.dailySpendCeilingVnd === 0 ? "daily spend ceiling is 0" : `WARN: ceiling=${manifest.budgetPolicy.dailySpendCeilingVnd}`,
  });

  const hardFails = checks.filter((c) => c.name !== "zero_default_spend" && !c.ok);
  return {
    agentId: manifest.id,
    passed: hardFails.length === 0,
    checks,
    checkedAt: new Date().toISOString(),
  };
}
