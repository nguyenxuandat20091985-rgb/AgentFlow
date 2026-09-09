# AI CEO — Outreach Draft Review

## Flow

```text
AI Website (salesbot)
  → website_outreach_post_draft (status=pending)
AI CEO
  → review policy + usefulness
  → status = ceo_approved | ceo_rejected
  → ownerReport (báo cáo anh)
Anh / connector được phép
  → đăng tay nếu muốn (hệ thống KHÔNG auto-publish)
```

## API

`POST|GET /api/ceo/outreach-review`

Auth: Bearer or `x-agent-heartbeat-secret` = `AGENT_HEARTBEAT_SECRET`

Query:
- `persist=0` — dry-run, không ghi DB
- `limit=20` — max drafts / cycle

## Status meanings

| status | Nghĩa |
|---|---|
| `pending` | Salesbot vừa tạo, chờ CEO |
| `ceo_approved` | CEO duyệt — **chưa đăng**; anh có thể đăng tay |
| `ceo_rejected` | CEO từ chối (policy / chất lượng / host cấm) |

## Isolation

- Chỉ đọc/ghi `action_type=website_outreach_post_draft` + `agent_id=salesbot`
- Không sửa queue marketing/Facebook
- Không gọi publish Facebook / forum / app

## Automation

Optional step in `agent-heartbeat.yml` after salesbot runtime/hunt:
`POST /api/ceo/outreach-review`
