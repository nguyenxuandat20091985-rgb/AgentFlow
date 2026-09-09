# AI Website — Outreach Planner (Phase 1)

Branch: `agent/salesbot-outreach`  
Agent: **salesbot only** · Channel: **website** · Mode: **draft_only**

## What this does

1. Reads public buyer-intent signals (existing website hunter).
2. Matches AccessTrade affiliate products.
3. Builds **helpful post/reply drafts** with provider affiliate links.
4. Enqueues `website_outreach_post_draft` into `agent_action_queue` for operator review.

## What this does NOT do

- Does **not** auto-post to Facebook, Instagram, TikTok, Zalo, Shopee, Lazada, Tiki, or any blocked host.
- Does **not** log in, scrape private areas, mass-comment, or impersonate.
- Does **not** invent orders, payments, or revenue.

## API

`POST|GET /api/website/outreach`

Auth: `Authorization: Bearer $AGENT_HEARTBEAT_SECRET` **or** `x-agent-heartbeat-secret`.

Query: `?persist=0` to preview without writing the queue.

## Destinations (allow-list)

Defaults in `lib/website-outreach/policy.ts`:

| id | Kind | Auto-post |
|---|---|---|
| owned_storefront | On-site content | No (draft) |
| owned_blog | Owned SEO/comparison | No (draft) |
| public_signal_reply | Public RSS reply draft (e.g. reddit.com host allow) | No — manual after rule check |
| manual_external | Operator-chosen forums/apps | No |

Override via env `WEBSITE_OUTREACH_DESTINATIONS` (JSON array of partial overrides by `id`).

## Isolation

- Code lives under `lib/website-outreach/*` and `app/api/website/outreach`.
- Runtime queue rows always `agent_id=salesbot`, `channel=website`.
- Marketing / Facebook agents are never written by this module.
- Feature branch naming: `agent/salesbot-outreach*`.

## Operator workflow

1. Automation or manual call to `/api/website/outreach`.
2. Review pending rows in `agent_action_queue` where `action_type=website_outreach_post_draft`.
3. Verify community rules / owned-site fit.
4. Publish **manually** (or via a future authorized connector — not in phase 1).
