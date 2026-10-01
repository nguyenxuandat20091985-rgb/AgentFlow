# Runtime operations

## Primary agents (SalesBot + Marketing)

- Endpoint: `GET /api/cron/primary-agents`
- Auth: Vercel Cron (`x-vercel-cron: 1`) or `Bearer CRON_SECRET` / `AGENT_HEARTBEAT_SECRET`
- Effect: upsert heartbeats to `running`, then `runPrimaryAgent` for each
- Schedule: hourly via `vercel.json`

## Autopilot earning

- Endpoint: `GET /api/autopilot/cron`
- Runs AccessTrade product selection + mission dispatch
- Schedule: hourly at :30

## Owner checks

- `/owner` — online agents, verified revenue
- `/api/ceo/missions` — mission registry
- `/api/ceo/jobs` — pending queue

Revenue is never booked from cron; only verified ledger entries count.
