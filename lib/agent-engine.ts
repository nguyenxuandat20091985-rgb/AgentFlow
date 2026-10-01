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

function extractOpenAIText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const chunks = Array.isArray(data?.output)
    ? data.output.flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    : [];
  const text = chunks
    .filter((item: any) => item?.type === "output_text" && typeof item?.text === "string")
    .map((item: any) => item.text.trim())
    .filter(Boolean)
    .join("\n");
  return text || "";
}

function extractChatText(data: any) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((c: any) => (typeof c?.text === "string" ? c.text : typeof c === "string" ? c : ""))
      .join("\n")
      .trim();
  }
  return "";
}

type ProviderAttempt = {
  provider: string;
  model: string;
  run: (instructions: string) => Promise<{ ok: boolean; id?: string; text: string; error?: string }>;
};

function buildProviders(): ProviderAttempt[] {
  const list: ProviderAttempt[] = [];

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    list.push({
      provider: "openai",
      model,
      run: async (instructions) => {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: instructions }],
            temperature: 0.3,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          return { ok: false, text: "", error: data?.error?.message || `openai_http_${response.status}` };
        }
        const text = extractChatText(data) || extractOpenAIText(data);
        if (!text) return { ok: false, text: "", error: "openai_empty_output" };
        return { ok: true, id: data?.id, text };
      },
    });
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    list.push({
      provider: "groq",
      model,
      run: async (instructions) => {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: instructions }],
            temperature: 0.3,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          return { ok: false, text: "", error: data?.error?.message || `groq_http_${response.status}` };
        }
        const text = extractChatText(data);
        if (!text) return { ok: false, text: "", error: "groq_empty_output" };
        return { ok: true, id: data?.id, text };
      },
    });
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey) {
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    list.push({
      provider: "openrouter",
      model,
      run: async (instructions) => {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://agentflow-khaki-rho.vercel.app",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: instructions }],
            temperature: 0.3,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          return { ok: false, text: "", error: data?.error?.message || `openrouter_http_${response.status}` };
        }
        const text = extractChatText(data);
        if (!text) return { ok: false, text: "", error: "openrouter_empty_output" };
        return { ok: true, id: data?.id, text };
      },
    });
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey) {
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    list.push({
      provider: "deepseek",
      model,
      run: async (instructions) => {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: instructions }],
            temperature: 0.3,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          return { ok: false, text: "", error: data?.error?.message || `deepseek_http_${response.status}` };
        }
        const text = extractChatText(data);
        if (!text) return { ok: false, text: "", error: "deepseek_empty_output" };
        return { ok: true, id: data?.id, text };
      },
    });
  }

  return list;
}

export async function executeAgent(input: AgentInput): Promise<AgentResult> {
  const goal = input.goal.trim();
  const agent = input.agent?.trim() || "Planner";
  if (!goal) throw new Error("goal is required");

  const providers = buildProviders();
  if (!providers.length) {
    return {
      id: `agent-${Date.now()}`,
      agent,
      goal,
      status: "configuration_required",
      output: "No LLM API keys configured (OPENAI/GROQ/OPENROUTER/DEEPSEEK).",
      provider: "none",
      model: "none",
    };
  }

  const instructions = `You are the ${agent} agent in AgentFlow. Be practical, concise, evidence-based, and execution-oriented.\nGoal: ${goal}\n${input.context ? `Context: ${input.context}` : ""}`;

  const errors: string[] = [];
  for (const p of providers) {
    try {
      const result = await p.run(instructions);
      if (result.ok && result.text) {
        return {
          id: result.id || `agent-${Date.now()}`,
          agent,
          goal,
          status: "completed",
          output: result.text,
          provider: p.provider,
          model: p.model,
        };
      }
      errors.push(`${p.provider}: ${result.error || "failed"}`);
    } catch (e) {
      errors.push(`${p.provider}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    id: `agent-${Date.now()}`,
    agent,
    goal,
    status: "failed",
    output: `All LLM providers failed. ${errors.join(" | ")}`,
    provider: providers[0]?.provider || "none",
    model: providers[0]?.model || "none",
  };
}
