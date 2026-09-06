export type AgentInput = { goal: string; context?: string; agent?: string };
export type AgentResult = {
  id: string;
  agent: string;
  goal: string;
  status: "completed" | "configuration_required" | "failed";
  output: string;
  provider: string;
  model: string;
};

export async function executeAgent(input: AgentInput): Promise<AgentResult> {
  const goal = input.goal.trim();
  const agent = input.agent?.trim() || "Planner";
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
  if (!goal) throw new Error("goal is required");
  if (!apiKey) return { id:`agent-${Date.now()}`, agent, goal, status:"configuration_required", output:"OPENAI_API_KEY is not configured in the server environment.", provider:"openai", model };

  const instructions = `You are the ${agent} agent in AgentFlow. Be practical, concise, and execution-oriented.\nGoal: ${goal}\n${input.context ? `Context: ${input.context}` : ""}`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method:"POST",
    headers:{"Content-Type":"application/json", Authorization:`Bearer ${apiKey}`},
    body:JSON.stringify({ model, input: instructions })
  });
  const data = await response.json();
  if (!response.ok) return { id:`agent-${Date.now()}`, agent, goal, status:"failed", output:data?.error?.message || "OpenAI request failed", provider:"openai", model };
  const output = typeof data.output_text === "string" ? data.output_text : "The model returned no text output.";
  return { id:data.id || `agent-${Date.now()}`, agent, goal, status:"completed", output, provider:"openai", model };
}
