# AgentFlow

AgentFlow is a lightweight AI-agent control center for registering agents, launching workflow runs, and monitoring execution state.

## What is included

- Responsive web dashboard built with Next.js App Router and TypeScript.
- Agent registry API at `GET /api/agents`.
- Run control API at `GET/POST /api/runs` with JSON validation.
- Recent-run and agent status views.
- One-click run creation from the dashboard.
- GitHub Actions CI that installs dependencies and verifies a production build.
- No secrets are committed; environment files are ignored.

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
      -> /api/agents  -> agent registry
      -> /api/runs    -> workflow run control plane
```

The current MVP deliberately keeps storage in process so the control-plane contract can be validated without coupling the project to a database. The next production layer should replace the in-memory run store with durable persistence and connect the run endpoint to the chosen LLM/tool execution backend.

## Deployment

The app is compatible with standard Next.js hosting, including Vercel. Set production secrets through the hosting provider rather than committing `.env` files.
