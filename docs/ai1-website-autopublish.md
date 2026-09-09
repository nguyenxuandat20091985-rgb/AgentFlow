# AI Website — Phase 2 Tier A Autopublish

## Goal

Full loop on **owned channels** so the owner only reads reports:

```text
discover → draft → AI CEO approve → auto-publish Tier A → report
```

## What auto-publishes

| destinationId | Auto? |
|---|---|
| `owned_storefront` | Yes |
| `owned_blog` | Yes |
| `public_signal_reply` | No (needs Tier B connector) |
| `manual_external` | No |

## APIs

- `POST /api/website/outreach` — build drafts
- `POST /api/ceo/outreach-review` — CEO review **and** Tier A publish
- `POST /api/website/autopublish` — publish any remaining `ceo_approved` Tier A
- `GET /api/website/posts` — public list
- Public pages: `/website/posts`, `/website/posts/[slug]`

## Required Supabase table

Run `docs/sql/website_published_posts.sql` once in Supabase.

## Proof of publish

A publish is only real when all exist:

- `published_url`
- `published_at`
- `provider_response_id`

Queue status becomes `published` with payload.publish filled.

## Isolation

- salesbot / website only
- No Facebook, Zalo, marketplace auto-post
