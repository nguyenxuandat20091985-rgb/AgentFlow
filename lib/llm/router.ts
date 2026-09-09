import { PROVIDER_CALLERS, configuredProviders } from "./providers";
import type { LlmAttempt, LlmProviderId, LlmRequest, LlmResult } from "./types";

const DEFAULT_ORDER: LlmProviderId[] = [
  "groq",
  "gemini",
  "openai",
  "openrouter",
  "deepseek",
  "anthropic",
];

function parseOrder(): LlmProviderId[] {
  const raw = process.env.LLM_PROVIDER_ORDER || "";
  if (!raw.trim()) return DEFAULT_ORDER;
  const parts = raw
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as LlmProviderId[];
  const valid = parts.filter((p) => p in PROVIDER_CALLERS);
  return valid.length ? valid : DEFAULT_ORDER;
}

/**
 * Multi-provider LLM router with automatic fallback.
 * Skips providers without API keys; on rate-limit/error tries the next.
 */
export async function runLlm(req: LlmRequest): Promise<LlmResult> {
  const configured = new Set(configuredProviders());
  const order = parseOrder().filter((id) => configured.has(id));

  // Prefer provider first if configured
  if (req.prefer && configured.has(req.prefer)) {
    const rest = order.filter((id) => id !== req.prefer);
    order.splice(0, order.length, req.prefer, ...rest);
  }

  if (!order.length) {
    return {
      ok: false,
      text: "",
      provider: "none",
      model: "",
      attempts: [],
      error:
        "No LLM API keys configured. Set one of: GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, DEEPSEEK_API_KEY, ANTHROPIC_API_KEY",
    };
  }

  const attempts: LlmAttempt[] = [];

  for (const id of order) {
    const caller = PROVIDER_CALLERS[id];
    try {
      const result = await caller(req);
      attempts.push(result);
      if (result.ok) {
        return {
          ok: true,
          text: result.text,
          provider: result.provider,
          model: result.model,
          id: result.id,
          attempts,
        };
      }
    } catch (error) {
      attempts.push({
        ok: false,
        provider: id,
        model: "",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const last = attempts[attempts.length - 1];
  return {
    ok: false,
    text: "",
    provider: "none",
    model: "",
    attempts,
    error:
      (last && !last.ok && last.error) ||
      `All ${attempts.length} LLM providers failed`,
  };
}

export function llmStatus() {
  return {
    configured: configuredProviders(),
    order: parseOrder().filter((id) => configuredProviders().includes(id)),
    envHints: {
      GROQ_API_KEY: Boolean(process.env.GROQ_API_KEY),
      GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      OPENROUTER_API_KEY: Boolean(process.env.OPENROUTER_API_KEY),
      DEEPSEEK_API_KEY: Boolean(process.env.DEEPSEEK_API_KEY),
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
      LLM_PROVIDER_ORDER: process.env.LLM_PROVIDER_ORDER || "groq,gemini,openai,openrouter,deepseek,anthropic",
    },
  };
}
