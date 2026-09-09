# AI #1 — Website Commerce Agent (salesbot)

## Mission

Operate the **Nhà Bếp Thông Minh** storefront as an independent production agent:

1. Discover real affiliate opportunities (AccessTrade / provider feeds).
2. Discover public buying-intent signals (public RSS only).
3. Rank and merchandise products on `/website`.
4. Prepare SEO / product / follow-up **drafts** only.
5. Track clicks and verified revenue evidence — never invent orders or payments.

## Runtime boundary

- Agent ID: `salesbot`
- Channel: `website`
- Production allow-list: heartbeat + runtime accept only `salesbot` and `marketing`
- Isolated from AI Facebook, AI Binance, and all development agents
- Financial KPI is read-only from `revenue_ledger` / verified provider records

## Endpoints

| Endpoint | Purpose | Auth |
|---|---|---|
| `POST /api/agents/heartbeat` | Keep salesbot online | Bearer **or** `x-agent-heartbeat-secret` |
| `POST /api/agents/runtime` | Planning cycle + action queue | Bearer **or** `x-agent-heartbeat-secret` |
| `POST /api/website/hunt` | Public buyer-intent discovery | Bearer **or** `x-agent-heartbeat-secret` |
| `GET /api/website/refresh` | Revalidate catalog cache | Bearer cron/heartbeat secret |
| `GET /api/website/catalog` | Public catalog | Public |
| `GET /api/cron/website` | Vercel cron → refresh | Bearer `CRON_SECRET` |
| `/website` | Storefront PWA | Public |

## Automation loop

GitHub Actions workflow: `.github/workflows/agent-heartbeat.yml`

Every 5 minutes:

1. Heartbeat `salesbot`
2. Heartbeat `marketing`
3. Runtime **salesbot only** (`{"agentId":"salesbot"}`)
4. Hunt public website signals

Vercel cron: `/api/cron/website` daily 03:00 UTC → catalog refresh.

## Required secrets (must match)

**GitHub Actions**

- Secret: `AGENT_HEARTBEAT_SECRET`
- Variable: `AGENTFLOW_APP_URL` = `https://agentflow-khaki-rho.vercel.app`

**Vercel (Production)**

- `AGENT_HEARTBEAT_SECRET` — **exact same value** as GitHub
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ACCESSTRADE_PUBLISHER_ID` / `ACCESSTRADE_API_KEY`
- `CRON_SECRET` (recommended)

If heartbeat returns `401 unauthorized`, the two secrets are out of sync.

## Safety rules

1. Draft-only actions — no fabricated publish, order, payment, or revenue.
2. Public feeds only for signal discovery.
3. Affiliate links must remain provider-generated.
4. Never add development agents to the primary runtime allow-list in the same change as Website work.
5. Feature branch for non-trivial Website changes: `agent/salesbot-*` or `agent/ai1-website-*`.

## Activation checklist

1. Secrets matched (GitHub ↔ Vercel).
2. Actions → **AgentFlow automation loop** → Run workflow.
3. Confirm `GET /api/agents` shows salesbot `status: "running"` and fresh `lastSeenAt`.
4. Confirm latest `agent_task_runs` row for `salesbot` is `completed`.
5. Storefront `/website` shows catalog products with affiliate links.
