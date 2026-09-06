# AgentFlow

AgentFlow is a lightweight AI-agent control center for registering agents, launching workflow runs, and executing model-backed agent tasks.

## Current capabilities

- Responsive Next.js App Router + TypeScript dashboard.
- Agent registry: Planner, Researcher, Builder, Reviewer.
- `GET /api/agents` registry endpoint.
- `GET/POST /api/runs` workflow run control plane.
- `POST /api/agent` server-side agent execution endpoint.
- OpenAI Responses API adapter with server-only credentials.
- Agent Console in the dashboard for submitting goals and displaying model output.
- Runtime `/api/health` capability check.
- GitHub Actions CI and no committed secrets.

## Enable live AI

Configure `OPENAI_API_KEY` in the Vercel project environment. Optionally set `OPENAI_MODEL`; the default is `gpt-5.6-luna`. The browser never receives the API key.

The application intentionally reports `configuration_required` when the key is absent instead of pretending a model execution occurred.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For a production check:

```bash
npm run build
npm start
```

## Architecture

```text
Browser
  -> Next.js dashboard
      -> /api/agent -> server-side OpenAI Responses API
      -> /api/agents -> agent registry
      -> /api/runs -> workflow run control plane
```

The run store is currently in-memory. A production persistence layer (for example Supabase/Postgres), authentication, durable queue/worker execution, tool permissions, memory/RAG, and observability should be added before treating this as a multi-user production platform.

## Deployment

The GitHub repository is linked to the Vercel project, so pushes to `main` trigger production deployments. Secrets must be configured in Vercel rather than committed to Git.
