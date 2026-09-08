# AI #3 — Binance Zero-Capital Scout

AI #3 is isolated from the two production agents (`salesbot` / Website and `marketing` / Facebook).

## Mission

Find and organize legitimate Binance-related opportunities that can be pursued without depositing capital, such as official education/campaign/task/referral opportunities when the account is actually eligible.

## Execution boundary

AI #3 is **research/orchestration only**:

- reads public Binance market/API health information;
- creates research/eligibility tasks in `agent_action_queue`;
- records its runtime in `agent_task_runs`;
- never places orders;
- never withdraws or transfers assets;
- never requests or stores seed phrases/private keys;
- never enables trading or withdrawal permissions;
- never counts an estimated reward or account balance as revenue.

A reward becomes financially recognized only after a provider-confirmed event is integrated into the project's verified accounting path.

## API

`POST /api/agents/binance-scout` requires the existing `AGENT_HEARTBEAT_SECRET` in `x-agent-heartbeat-secret`.

`GET /api/agents/binance-scout` is a read-only health/capability endpoint.

## Zero-capital rule

"Vốn 0 đồng" means the agent must reject opportunities whose conditions require a deposit, paid trade, liquidity provision, or other capital commitment. It can still track an opportunity for manual review if the terms change.

The agent does not guarantee income. Actual earnings depend on eligibility, provider terms, and confirmed reward events.
