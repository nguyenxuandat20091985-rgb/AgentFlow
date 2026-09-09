export type LlmProviderId =
  | "openai"
  | "groq"
  | "gemini"
  | "openrouter"
  | "deepseek"
  | "anthropic";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmRequest = {
  messages: LlmMessage[];
  /** Prefer a provider; router still falls back on failure. */
  prefer?: LlmProviderId;
  temperature?: number;
  maxTokens?: number;
};

export type LlmSuccess = {
  ok: true;
  text: string;
  provider: LlmProviderId;
  model: string;
  id?: string;
};

export type LlmFailure = {
  ok: false;
  provider: LlmProviderId;
  model: string;
  error: string;
  status?: number;
};

export type LlmAttempt = LlmSuccess | LlmFailure;

export type LlmResult = {
  ok: boolean;
  text: string;
  provider: LlmProviderId | "none";
  model: string;
  id?: string;
  attempts: LlmAttempt[];
  error?: string;
};
