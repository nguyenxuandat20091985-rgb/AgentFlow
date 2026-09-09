import { runLlm } from "@/lib/llm/router";
import type { LlmProviderId } from "@/lib/llm/types";

export type AgentInput = {
  goal: string;
  context?: string;
  agent?: string;
  /** Optional preferred provider (still falls back). */
  preferProvider?: LlmProviderId;
};

export type AgentResult = {
  id: string;
  agent: string;
  goal: string;
  status: "completed" | "configuration_required" | "failed";
  output: string;
  provider: string;
  model: string;
  attempts?: Array<{ provider: string; ok: boolean; error?: string }>;
};

export async function executeAgent(input: AgentInput): Promise<AgentResult> {
  const goal = input.goal.trim();
  const agent = input.agent?.trim() || "Planner";
  if (!goal) throw new Error("goal is required");

  const system = `You are the ${agent} agent in AgentFlow. Be practical, concise, evidence-based, and execution-oriented. Reply in the same language as the goal when possible.`;
  const user = `Goal: ${goal}${input.context ? `\n\nContext:\n${input.context}` : ""}`;

  const result = await runLlm({
    prefer: input.preferProvider,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  if (!result.ok && result.error?.includes("No LLM API keys")) {
    return {
      id: `agent-${Date.now()}`,
      agent,
      goal,
      status: "configuration_required",
      output: result.error,
      provider: "none",
      model: "",
      attempts: result.attempts.map((a) => ({
        provider: a.provider,
        ok: a.ok,
        error: a.ok ? undefined : a.error,
      })),
    };
  }

  if (!result.ok) {
    return {
      id: `agent-${Date.now()}`,
      agent,
      goal,
      status: "failed",
      output: result.error || "All LLM providers failed",
      provider: result.provider,
      model: result.model,
      attempts: result.attempts.map((a) => ({
        provider: a.provider,
        ok: a.ok,
        error: a.ok ? undefined : a.error,
      })),
    };
  }

  return {
    id: result.id || `agent-${Date.now()}`,
    agent,
    goal,
    status: "completed",
    output: result.text,
    provider: result.provider,
    model: result.model,
    attempts: result.attempts.map((a) => ({
      provider: a.provider,
      ok: a.ok,
      error: a.ok ? undefined : a.error,
    })),
  };
}
