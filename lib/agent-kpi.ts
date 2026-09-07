export const PRIMARY_AGENT_KPIS = [
  { agentId: "salesbot", name: "SalesBot", target: 15_000_000 },
  { agentId: "marketing", name: "Marketing", target: 15_000_000 },
] as const;

export type LedgerRow = { amount?: number | string | null; agent_id?: string | null };

export function calculateAgentKpis(rows: LedgerRow[]) {
  return PRIMARY_AGENT_KPIS.map((agent) => {
    const actual = rows
      .filter((row) => String(row.agent_id ?? "").toLowerCase() === agent.agentId)
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const progress = Math.min(100, (actual / agent.target) * 100);
    return { ...agent, actual, remaining: Math.max(0, agent.target - actual), progress };
  });
}
