# AgentFlow — Multi LLM providers

`executeAgent` uses **lib/llm/router.ts**: thử lần lượt các nhà cung cấp đã cấu hình key. Một nhà bị rate-limit → nhảy sang nhà tiếp theo.

## Thứ tự mặc định

```text
groq → gemini → openai → openrouter → deepseek → anthropic
```

Đổi bằng biến:

```bash
LLM_PROVIDER_ORDER=groq,gemini,openai,openrouter,deepseek,anthropic
```

## Biến môi trường (Vercel Production + Preview)

| Key | Provider | Model mặc định |
|-----|----------|----------------|
| `GROQ_API_KEY` | Groq | `GROQ_MODEL` hoặc `llama-3.3-70b-versatile` |
| `GEMINI_API_KEY` hoặc `GOOGLE_API_KEY` | Google Gemini | `GEMINI_MODEL` hoặc `gemini-2.0-flash` |
| `OPENAI_API_KEY` | OpenAI | `OPENAI_MODEL` hoặc `gpt-4o-mini` |
| `OPENROUTER_API_KEY` | OpenRouter | `OPENROUTER_MODEL` hoặc `openai/gpt-4o-mini` |
| `DEEPSEEK_API_KEY` | DeepSeek | `DEEPSEEK_MODEL` hoặc `deepseek-chat` |
| `ANTHROPIC_API_KEY` | Anthropic | `ANTHROPIC_MODEL` hoặc `claude-3-5-haiku-latest` |

## Kiểm tra

```text
GET https://agentflow-khaki-rho.vercel.app/api/llm/status
```

Trả về provider nào đã có key (không lộ secret).

## Lấy key nhanh

- Groq: https://console.groq.com/keys
- Gemini: https://aistudio.google.com/apikey
- OpenAI: https://platform.openai.com/api-keys
- OpenRouter: https://openrouter.ai/keys
- DeepSeek: https://platform.deepseek.com/
- Anthropic: https://console.anthropic.com/

Sau khi thêm key trên Vercel → **Redeploy** production.
