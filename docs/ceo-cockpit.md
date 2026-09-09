# AI CEO Cockpit (isolated)

Branch: `agent/ceo-cockpit`  
Paths: `lib/ceo/*`, `app/api/ceo/*`, `app/ceo/*`

## What CEO does now

| Capability | Endpoint / UI |
|---|---|
| Fleet cockpit | `GET /api/ceo/cockpit` · UI `/ceo` |
| Safe dispatch (allow-list) | `POST /api/ceo/dispatch` |
| Website outreach review | `POST /api/ceo/outreach-review` |
| Legacy report | `GET /api/ceo/report` |

## Isolation

- CEO never edits other agents' source.
- Dispatch only to `runtimeEnabled + dispatchEnabled` (today: salesbot, marketing).
- Registry agents stay off until validated on their own branches.
- CEO API failure does not stop website/facebook heartbeats.

## Activate next AI

1. Feature branch `agent/<id>-*`
2. CI green
3. Flip `runtimeEnabled` + `dispatchEnabled` in `lib/ceo/fleet.ts` only
4. Add workflow step if needed — do not break salesbot steps
