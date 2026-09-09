# AI #2 — Facebook Growth Agent

## Mission

Operate the Nhà Bếp Thông Minh Facebook funnel as an independent production agent:

1. Source real affiliate opportunities from provider feeds and active campaigns.
2. Prepare useful Fanpage content and publish only through an authorized Facebook Page access token.
3. Discover public buying-intent signals from configured public feeds.
4. Turn qualified signals into contextual advice drafts and approval-only outbound actions.
5. Track confirmed Page posts, touchpoints, outbound comments, affiliate clicks, verified orders and verified commission separately.

## Runtime boundary

- Agent ID: `marketing`
- Channel: `facebook`
- Heartbeat remains part of the primary runtime allow-list.
- AI Website (`salesbot`) remains independent; this agent's new tables and routes are Facebook-specific.
- AI #3 Binance remains isolated from this production path.

## Publishing

`/api/facebook/publish` validates `AGENT_HEARTBEAT_SECRET`, checks the configured Page token, applies `FACEBOOK_DAILY_POST_LIMIT` (default 5), publishes one pending campaign action, and records a provider-confirmed `page_post` activity event.

## Outbound discovery

`/api/facebook/hunt` reads only public configured RSS/Atom feeds (safe defaults are public search feeds), scores purchase intent, stores deduplicated signals and creates `facebook_outbound_advice_draft` actions.

The outbound action is **approval-only**. The system does not scrape private groups, bypass Meta permissions, impersonate users, or mass-post comments.

If Meta later grants an officially supported public-community endpoint to this app, it can be added as a separate adapter without changing the existing signal schema or Fanpage publisher.

## KPI

The metrics endpoint `/api/facebook/metrics` exposes:

- Fanpage posts confirmed
- public buying-intent touchpoints
- high-intent signals
- outbound comment attempts / confirmed surviving comments
- affiliate clicks recorded by the Facebook activity pipeline
- verified affiliate orders
- verified commission

Revenue remains read-only evidence from the existing financial ledger/order integrations.
