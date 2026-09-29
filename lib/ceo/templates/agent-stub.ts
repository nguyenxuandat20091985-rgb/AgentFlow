/**
 * Agent code template generator — produces source text only.
 * Never executed in the API process. Intended for PR/sandbox review.
 */

export type AgentStubInput = {
  id: string;
  name: string;
  domain: string;
  channel: string;
  goal: string;
};

/** Generate a minimal isolated agent module stub (string only). */
export function generateAgentStubSource(input: AgentStubInput): string {
  const safeId = input.id.replace(/[^a-z0-9_]/g, "");
  const nameLit = JSON.stringify(input.name);
  const domainLit = JSON.stringify(input.domain);
  const channelLit = JSON.stringify(input.channel);
  const goalLit = JSON.stringify(input.goal);
  // Build source with concatenation so nested template literals are not type-checked as host TS.
  const lines = [
    "/**",
    ` * Auto-generated agent stub for ${input.name} (${safeId}).`,
    ` * Domain: ${input.domain} | Channel: ${input.channel}`,
    " * DO NOT enable in production until review + fleet.ts flip.",
    " * DO NOT import production secrets.",
    " */",
    "",
    "export const AGENT_META = {",
    `  id: "${safeId}",`,
    `  name: ${nameLit},`,
    `  domain: ${domainLit},`,
    `  channel: ${channelLit},`,
    "  runtimeEnabled: false as const,",
    `  goal: ${goalLit},`,
    "} as const;",
    "",
    "/** Draft-only run — no side effects, no network, no payments. */",
    "export async function runDraft(context: { goal?: string } = {}): Promise<{ ok: true; output: string }> {",
    "  const goal = context.goal ?? AGENT_META.goal;",
    "  return {",
    "    ok: true,",
    "    output: '[' + AGENT_META.id + '] draft-only response for: ' + goal + '. No external calls executed.',",
    "  };",
    "}",
    "",
  ];
  return lines.join("\n");
}

/** Paths the stub would own under isolation rules. */
export function proposedPathsForAgent(id: string): string[] {
  const safeId = id.replace(/[^a-z0-9_]/g, "");
  return [`lib/agents/${safeId}/index.ts`, `docs/agents/${safeId}.md`];
}
