# AI Website — Outreach Planner (Phase 1) + AI CEO Review

Branch history: `agent/salesbot-outreach` → `agent/ceo-outreach-review`  
Agent: **salesbot** drafts · **AI CEO** reviews · Channel: **website** · Mode: **no auto-publish**

## End-to-end flow

```text
1. salesbot discovers signals + products
2. website_outreach_post_draft → agent_action_queue (status=pending)
3. AI CEO reviews → status=ceo_approved | ceo_rejected
4. ownerReport generated for anh
5. Anh đăng tay nếu muốn (hệ thống không tự đăng)
```

## APIs

| Endpoint | Role |
|---|---|
| `POST /api/website/outreach` | Build drafts |
| `POST /api/ceo/outreach-review` | CEO duyệt + báo cáo |

Auth: Bearer or `x-agent-heartbeat-secret`.

## Status

| status | Meaning |
|---|---|
| `pending` | Chờ AI CEO |
| `ceo_approved` | CEO duyệt — **chưa đăng** |
| `ceo_rejected` | CEO từ chối |

## Safety

- No auto-post to Facebook / IG / TikTok / Zalo / marketplaces
- Blocked hosts enforced in policy + CEO review
- CEO only touches `salesbot` + `website_outreach_post_draft`
- `ceo_approved` still requires **manual** publish by owner

See also: [ceo-outreach-review.md](./ceo-outreach-review.md)
