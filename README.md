# AgentFlow

**AI CEO + 20 AI thực thi độc lập** — cô lập mã nguồn, channel, queue.

## Đọc trước khi code

→ **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**  
Luật branch, path ownership, runtime allow-list, checklist PR — để **không phá** AI đang chạy.

## Live

| | URL |
|---|---|
| Control center | https://agentflow-khaki-rho.vercel.app/ |
| AI CEO Cockpit | https://agentflow-khaki-rho.vercel.app/ceo |
| AI Website | https://agentflow-khaki-rho.vercel.app/website |

## Primary (runtimeEnabled)

1. **salesbot** — AI Website  
2. **marketing** — AI Facebook  

Các AI còn lại: registry-only cho đến khi validate trên `agent/<id>-*`.

## Isolation one-liner

> Sửa AI X chỉ trên branch `agent/x-*` và path của X. Không đụng path AI Y. Không bật runtime hàng loạt.
