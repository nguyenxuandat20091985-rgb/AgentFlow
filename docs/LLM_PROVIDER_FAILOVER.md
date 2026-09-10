# LLM Provider Failover Contract

AgentFlow uses one server-side LLM provider router so individual agents do not implement their own fallback chains.

## Default order

1. OpenAI (`OPENAI_API_KEY`)
2. Groq (`GROQ_API_KEY`)
3. Gemini (`GEMINI_API_KEY`)
4. OpenRouter (`OPENROUTER_API_KEY`)
5. DeepSeek (`DEEPSEEK_API_KEY`)

The order can be overridden per request with an explicit provider list.

## Failure isolation

A provider failure is contained inside the current LLM request. The router records a sanitized attempt summary and moves to the next configured provider. API keys and authorization headers are never returned to callers and must never be logged.

Timeouts, HTTP 429, HTTP 5xx, transport errors, invalid responses, and missing provider configuration all cause failover. If every provider fails, the request fails closed with a generic summary of provider names/statuses; no secret material is included.

## Agent contract

Agents should import `completeWithFailover` from `lib/llm/provider-router.ts` rather than calling provider APIs directly. This keeps provider credentials, fallback policy, timeout behavior, and model selection centralized.

## Environment

Required only for providers that should participate. Supported variables:

- `OPENAI_API_KEY` / optional `OPENAI_MODEL`
- `GROQ_API_KEY` / optional `GROQ_MODEL`
- `GEMINI_API_KEY` / optional `GEMINI_MODEL`
- `OPENROUTER_API_KEY` / optional `OPENROUTER_MODEL`
- `DEEPSEEK_API_KEY` / optional `DEEPSEEK_MODEL`

Existing deployments with only some keys configured remain valid; unconfigured providers are skipped automatically.
