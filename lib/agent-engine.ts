export type AgentInput = {
  goal: string;
  context?: string;
  agent?: string;
};

export type AgentResult = {
  id: string;
  agent: string;
  goal: string;
  status: "completed" | "configuration_required";
  output: string;
  provider: string;
  model: string;
};

export function executeAgent(input: AgentInput): AgentResult {
  const goal = input.goal.trim();
  const agent = input.agent?.trim() || "Planner";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!goal) throw new Error("goal is required");
  if (!apiKey) {
    return {
      id: `agent-${Date.now()}`,
      agent,
      goal,
      status: "configuration_required",
      output: "Agent engine is ready, but OPENAI_API_KEY is not configured. Add the key in the deployment environment to enable live model execution.",
      provider: "openai",
      model: process.env.OPENAI_MODEL || "gpt-5"
    };
  }

  return {
    id: `agent-${Date.now()}`,
    agent,
    goal,
    status: "configuration_required",
    output: "The execution boundary is configured for OpenAI. The provider adapter is intentionally kept server-side; connect the OpenAI Responses API here when the production model/key policy is approved.",
    provider: "openai",
    model: process.env.OPENAI_MODEL || "gpt-5"
  };
}
