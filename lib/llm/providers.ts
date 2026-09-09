import type { LlmFailure, LlmMessage, LlmProviderId, LlmRequest, LlmSuccess } from "./types";

function systemAndUser(messages: LlmMessage[]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n")
    .trim();
  const userParts = messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n\n");
  return { system, user: userParts || messages.map((m) => m.content).join("\n") };
}

async function postJson(url: string, apiKey: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

function chatTextFromOpenAiStyle(data: any): string {
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((c: any) => (typeof c?.text === "string" ? c.text : typeof c === "string" ? c : ""))
      .join("")
      .trim();
  }
  if (typeof data?.output_text === "string") return data.output_text.trim();
  return "";
}

/** OpenAI Responses API, fallback Chat Completions. */
export async function callOpenAI(req: LlmRequest): Promise<LlmSuccess | LlmFailure> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) {
    return { ok: false, provider: "openai", model, error: "OPENAI_API_KEY missing" };
  }

  const { system, user } = systemAndUser(req.messages);
  const input = system ? `${system}\n\n${user}` : user;

  // Prefer Responses API (project default)
  {
    const { response, data } = await postJson("https://api.openai.com/v1/responses", apiKey, {
      model,
      input,
    });
    if (response.ok) {
      const text =
        (typeof data?.output_text === "string" && data.output_text.trim()) ||
        (Array.isArray(data?.output)
          ? data.output
              .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
              .filter((c: any) => c?.type === "output_text" && typeof c?.text === "string")
              .map((c: any) => c.text.trim())
              .join("\n")
          : "");
      if (text) return { ok: true, text, provider: "openai", model, id: data?.id };
    }
    // If rate limit / error, try chat completions before giving up
    if (response.status !== 429 && response.status < 500 && !response.ok) {
      // continue to chat
    }
  }

  const { response, data } = await postJson("https://api.openai.com/v1/chat/completions", apiKey, {
    model,
    messages: req.messages,
    temperature: req.temperature ?? 0.4,
    max_tokens: req.maxTokens ?? 1200,
  });
  if (!response.ok) {
    return {
      ok: false,
      provider: "openai",
      model,
      status: response.status,
      error: data?.error?.message || `OpenAI HTTP ${response.status}`,
    };
  }
  const text = chatTextFromOpenAiStyle(data);
  if (!text) return { ok: false, provider: "openai", model, error: "empty output" };
  return { ok: true, text, provider: "openai", model, id: data?.id };
}

/** Groq — OpenAI-compatible, fast. */
export async function callGroq(req: LlmRequest): Promise<LlmSuccess | LlmFailure> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  if (!apiKey) return { ok: false, provider: "groq", model, error: "GROQ_API_KEY missing" };

  const { response, data } = await postJson("https://api.groq.com/openai/v1/chat/completions", apiKey, {
    model,
    messages: req.messages,
    temperature: req.temperature ?? 0.4,
    max_tokens: req.maxTokens ?? 1200,
  });
  if (!response.ok) {
    return {
      ok: false,
      provider: "groq",
      model,
      status: response.status,
      error: data?.error?.message || `Groq HTTP ${response.status}`,
    };
  }
  const text = chatTextFromOpenAiStyle(data);
  if (!text) return { ok: false, provider: "groq", model, error: "empty output" };
  return { ok: true, text, provider: "groq", model, id: data?.id };
}

/** Google Gemini generateContent. */
export async function callGemini(req: LlmRequest): Promise<LlmSuccess | LlmFailure> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  if (!apiKey) return { ok: false, provider: "gemini", model, error: "GEMINI_API_KEY missing" };

  const { system, user } = systemAndUser(req.messages);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: req.temperature ?? 0.4,
      maxOutputTokens: req.maxTokens ?? 1200,
    },
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      provider: "gemini",
      model,
      status: response.status,
      error: data?.error?.message || `Gemini HTTP ${response.status}`,
    };
  }
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
  if (!text) return { ok: false, provider: "gemini", model, error: "empty output" };
  return { ok: true, text, provider: "gemini", model, id: data?.candidates?.[0]?.citationMetadata ? undefined : data?.responseId };
}

/** OpenRouter — many models behind one key. */
export async function callOpenRouter(req: LlmRequest): Promise<LlmSuccess | LlmFailure> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  if (!apiKey) return { ok: false, provider: "openrouter", model, error: "OPENROUTER_API_KEY missing" };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.AGENTFLOW_APP_URL || "https://agentflow-khaki-rho.vercel.app",
      "X-Title": "AgentFlow",
    },
    body: JSON.stringify({
      model,
      messages: req.messages,
      temperature: req.temperature ?? 0.4,
      max_tokens: req.maxTokens ?? 1200,
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      provider: "openrouter",
      model,
      status: response.status,
      error: data?.error?.message || `OpenRouter HTTP ${response.status}`,
    };
  }
  const text = chatTextFromOpenAiStyle(data);
  if (!text) return { ok: false, provider: "openrouter", model, error: "empty output" };
  return { ok: true, text, provider: "openrouter", model, id: data?.id };
}

/** DeepSeek — OpenAI-compatible. */
export async function callDeepSeek(req: LlmRequest): Promise<LlmSuccess | LlmFailure> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!apiKey) return { ok: false, provider: "deepseek", model, error: "DEEPSEEK_API_KEY missing" };

  const { response, data } = await postJson("https://api.deepseek.com/chat/completions", apiKey, {
    model,
    messages: req.messages,
    temperature: req.temperature ?? 0.4,
    max_tokens: req.maxTokens ?? 1200,
  });
  if (!response.ok) {
    return {
      ok: false,
      provider: "deepseek",
      model,
      status: response.status,
      error: data?.error?.message || `DeepSeek HTTP ${response.status}`,
    };
  }
  const text = chatTextFromOpenAiStyle(data);
  if (!text) return { ok: false, provider: "deepseek", model, error: "empty output" };
  return { ok: true, text, provider: "deepseek", model, id: data?.id };
}

/** Anthropic Claude messages API. */
export async function callAnthropic(req: LlmRequest): Promise<LlmSuccess | LlmFailure> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
  if (!apiKey) return { ok: false, provider: "anthropic", model, error: "ANTHROPIC_API_KEY missing" };

  const system = req.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n")
    .trim();
  const messages = req.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 1200,
      temperature: req.temperature ?? 0.4,
      system: system || undefined,
      messages: messages.length ? messages : [{ role: "user", content: "Hello" }],
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      provider: "anthropic",
      model,
      status: response.status,
      error: data?.error?.message || `Anthropic HTTP ${response.status}`,
    };
  }
  const text = (data?.content || [])
    .map((c: any) => (c?.type === "text" ? c.text : ""))
    .join("")
    .trim();
  if (!text) return { ok: false, provider: "anthropic", model, error: "empty output" };
  return { ok: true, text, provider: "anthropic", model, id: data?.id };
}

export const PROVIDER_CALLERS: Record<
  LlmProviderId,
  (req: LlmRequest) => Promise<LlmSuccess | LlmFailure>
> = {
  openai: callOpenAI,
  groq: callGroq,
  gemini: callGemini,
  openrouter: callOpenRouter,
  deepseek: callDeepSeek,
  anthropic: callAnthropic,
};

export function configuredProviders(): LlmProviderId[] {
  const checks: Array<[LlmProviderId, boolean]> = [
    ["groq", Boolean(process.env.GROQ_API_KEY)],
    ["gemini", Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)],
    ["openai", Boolean(process.env.OPENAI_API_KEY)],
    ["openrouter", Boolean(process.env.OPENROUTER_API_KEY)],
    ["deepseek", Boolean(process.env.DEEPSEEK_API_KEY)],
    ["anthropic", Boolean(process.env.ANTHROPIC_API_KEY)],
  ];
  return checks.filter(([, ok]) => ok).map(([id]) => id);
}
