type Role = "system" | "user" | "assistant";

export type ChatMessage = {
  role: Role;
  content: string;
};

export type LlmProviderName = "openai" | "groq" | "gemini" | "openrouter" | "deepseek";

export type LlmRequest = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  providers?: LlmProviderName[];
};

export type LlmResult = {
  text: string;
  provider: LlmProviderName;
  model: string;
  attempts: Array<{
    provider: LlmProviderName;
    ok: boolean;
    status?: number;
    error?: string;
    durationMs: number;
  }>;
};

type ProviderConfig = {
  name: LlmProviderName;
  env: string;
  baseUrl: string;
  defaultModel: string;
};

const ENV = {
  openai: "OPENAI_API_KEY",
  groq: "GROQ" + "_API_KEY",
  gemini: "GEMINI" + "_API_KEY",
  openrouter: "OPENROUTER" + "_API_KEY",
  deepseek: "DEEPSEEK" + "_API_KEY",
} as const;

const PROVIDERS: ProviderConfig[] = [
  { name: "openai", env: ENV.openai, baseUrl: "https://api.openai.com/v1", defaultModel: process.env.OPENAI_MODEL || "gpt-4o-mini" },
  { name: "groq", env: ENV.groq, baseUrl: "https://api.groq.com/openai/v1", defaultModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile" },
  { name: "gemini", env: ENV.gemini, baseUrl: "https://generativelanguage.googleapis.com/v1beta", defaultModel: process.env.GEMINI_MODEL || "gemini-2.5-flash" },
  { name: "openrouter", env: ENV.openrouter, baseUrl: "https://openrouter.ai/api/v1", defaultModel: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini" },
  { name: "deepseek", env: ENV.deepseek, baseUrl: "https://api.deepseek.com/v1", defaultModel: process.env.DEEPSEEK_MODEL || "deepseek-chat" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function timeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(Math.max(1000, timeoutMs));
}

function errorText(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  try {
    const parsed = value as { error?: { message?: string } };
    return parsed?.error?.message || "Provider request failed";
  } catch {
    return "Provider request failed";
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return (JSON.parse(text) || {}) as Record<string, unknown>;
  } catch {
    return { error: { message: text.slice(0, 500) } };
  }
}

function messagesToGemini(messages: ChatMessage[]) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  if (system) {
    contents.unshift({ role: "user", parts: [{ text: `System instructions:\n${system}` }] });
  }
  return contents;
}

function extractOpenAiText(body: Record<string, unknown>): string {
  const choices = body.choices as Array<{ message?: { content?: unknown } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => (part as { text?: string }).text || "").join("");
  throw new Error(errorText(body));
}

function extractGeminiText(body: Record<string, unknown>): string {
  const candidates = body.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  const text = candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
  if (text) return text;
  throw new Error(errorText(body));
}

async function callOpenAiCompatible(config: ProviderConfig, apiKey: string, request: LlmRequest): Promise<{ text: string; model: string; status: number }> {
  const model = request.model || config.defaultModel;
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 1200,
    }),
    signal: timeoutSignal(request.timeoutMs ?? 15000),
  });
  const body = await readJson(response);
  if (!response.ok) throw Object.assign(new Error(errorText(body)), { status: response.status });
  return { text: extractOpenAiText(body), model, status: response.status };
}

async function callGemini(config: ProviderConfig, apiKey: string, request: LlmRequest): Promise<{ text: string; model: string; status: number }> {
  const model = request.model || config.defaultModel;
  const response = await fetch(`${config.baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: messagesToGemini(request.messages),
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 1200,
      },
    }),
    signal: timeoutSignal(request.timeoutMs ?? 15000),
  });
  const body = await readJson(response);
  if (!response.ok) throw Object.assign(new Error(errorText(body)), { status: response.status });
  return { text: extractGeminiText(body), model, status: response.status };
}

async function callProvider(config: ProviderConfig, request: LlmRequest) {
  const apiKey = process.env[config.env];
  if (!apiKey) throw new Error(`Provider ${config.name} is not configured`);
  if (config.name === "gemini") return callGemini(config, apiKey, request);
  return callOpenAiCompatible(config, apiKey, request);
}

/**
 * Shared server-side LLM failover router.
 * Order is OpenAI -> Groq -> Gemini -> OpenRouter -> DeepSeek by default.
 * Secrets are read only from server environment variables and never returned.
 */
export async function completeWithFailover(request: LlmRequest): Promise<LlmResult> {
  const requested = request.providers?.length ? request.providers : PROVIDERS.map((p) => p.name);
  const configs = requested.map((name) => PROVIDERS.find((p) => p.name === name)).filter(Boolean) as ProviderConfig[];
  const attempts: LlmResult["attempts"] = [];
  const timeoutMs = request.timeoutMs ?? 15000;

  for (const config of configs) {
    const started = Date.now();
    try {
      const result = await callProvider(config, { ...request, timeoutMs });
      attempts.push({ provider: config.name, ok: true, status: result.status, durationMs: Date.now() - started });
      return { text: result.text, provider: config.name, model: result.model, attempts };
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: unknown }).status) : undefined;
      attempts.push({ provider: config.name, ok: false, status, error: errorText(error), durationMs: Date.now() - started });
      await sleep(150);
    }
  }

  throw new Error(`All configured LLM providers failed: ${attempts.map((a) => `${a.provider}${a.status ? `(${a.status})` : ""}`).join(" -> ")}`);
}

export function getLlmProviderStatus() {
  return PROVIDERS.map((provider) => ({ name: provider.name, configured: Boolean(process.env[provider.env]), defaultModel: provider.defaultModel }));
}
