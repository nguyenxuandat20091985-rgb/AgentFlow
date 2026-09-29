/**
 * Budget guard — admits or denies job starts. Does not move money.
 */
export type SpendSample = { agentId: string; amountVnd: number; at: string };
export type BudgetDecision = { allowed: boolean; reason: string; agentSpentToday: number; globalSpentToday: number };

const samples: SpendSample[] = [];

function startOfUtcDay(d = new Date()): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function spentToday(agentId?: string): number {
  const day = startOfUtcDay();
  return samples
    .filter((s) => {
      const t = Date.parse(s.at);
      if (!Number.isFinite(t) || t < day) return false;
      return agentId ? s.agentId === agentId : true;
    })
    .reduce((sum, s) => sum + s.amountVnd, 0);
}

export function checkBudget(opts: {
  agentId: string;
  proposedCostVnd: number;
  agentDailyCeilingVnd: number;
  globalDailyCeilingVnd: number;
}): BudgetDecision {
  const proposed = Math.max(0, Number(opts.proposedCostVnd) || 0);
  const agentSpent = spentToday(opts.agentId);
  const globalSpent = spentToday();

  if (proposed > 0 && opts.agentDailyCeilingVnd <= 0) {
    return { allowed: false, reason: "agent daily ceiling is 0; spend denied", agentSpentToday: agentSpent, globalSpentToday: globalSpent };
  }
  if (agentSpent + proposed > opts.agentDailyCeilingVnd) {
    return { allowed: false, reason: `agent budget would exceed ceiling (${agentSpent + proposed} > ${opts.agentDailyCeilingVnd})`, agentSpentToday: agentSpent, globalSpentToday: globalSpent };
  }
  if (globalSpent + proposed > opts.globalDailyCeilingVnd && opts.globalDailyCeilingVnd > 0) {
    return { allowed: false, reason: `global budget would exceed ceiling (${globalSpent + proposed} > ${opts.globalDailyCeilingVnd})`, agentSpentToday: agentSpent, globalSpentToday: globalSpent };
  }
  return { allowed: true, reason: "within budget", agentSpentToday: agentSpent, globalSpentToday: globalSpent };
}

export function recordSpend(agentId: string, amountVnd: number, at?: string) {
  samples.push({ agentId, amountVnd: Math.max(0, amountVnd), at: at ?? new Date().toISOString() });
  if (samples.length > 10_000) samples.splice(0, samples.length - 10_000);
}

export function __resetBudgetForTests() { samples.length = 0; }
