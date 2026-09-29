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

export function generateAgentStubSource(input: AgentStubInput): string {
  const safeId = input.id.replace(/[^a-z0-9_]/g, "");
  return `/**
 * Auto-generated agent stub for ${input.name} (${safeId}).
 * Domain: ${input.domain} | Channel: ${input.channel}
 * DO NOT enable in production until review + fleet.ts flip.
 * DO NOT import production secrets.
 */

export const AGENT_META = {
  id: "${safeId}",
  name: ${JSON.stringify(input.name)},
  domain: ${JSON.stringify(input.domain)},
  channel: ${JSON.stringify(input.channel)},
  runtimeEnabled: false as const,
  goal: ${JSON.stringify(input.goal)},
} as const;

/** Draft-only run — no side effects, no network, no payments. */
export async function runDraft(context: { goal?: string } = {}): Promise<{ ok: true; output: string }> {
  const goal = context.goal ?? AGENT_META.goal;
  return {
    ok: true,
    output: \`[${AGENT_META.id}] draft-only response for: ${goal}. No external calls executed.\`,
  };
}
`;
}

export function proposedPathsForAgent(id: string): string[] {
  const safeId = id.replace(/[^a-z0-9_]/g, "");
  return [`lib/agents/${safeId}/index.ts`, `docs/agents/${safeId}.md`];
}
