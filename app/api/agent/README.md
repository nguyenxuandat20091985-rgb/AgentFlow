# Agent execution contract

`POST /api/agent` accepts JSON `{ "goal": string, "context"?: string, "agent"?: string }`.

The API never exposes provider credentials to the browser. It reads `OPENAI_API_KEY` and optional `OPENAI_MODEL` only from the server environment. If the key is missing, the endpoint returns a deterministic configuration status instead of pretending an AI call happened.
