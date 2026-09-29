# AgentFlow Operations

## Production

| Surface | URL |
|---------|-----|
| Control center | https://agentflow-khaki-rho.vercel.app/ |
| AI CEO Cockpit | https://agentflow-khaki-rho.vercel.app/ceo |
| Factory API | https://agentflow-khaki-rho.vercel.app/api/ceo/factory |
| Kill switch | https://agentflow-khaki-rho.vercel.app/api/ceo/kill-switch |
| Health | https://agentflow-khaki-rho.vercel.app/api/health |

## Runtime allow-list

- salesbot (website) + marketing (facebook) — enabled
- All others: registry-only (`lib/ceo/fleet.ts`)

## Agent Factory

- Mode: observe (propose + static sandbox)
- `POST /api/ceo/factory` actions: propose_manifest | sandbox_check | record_opportunity | record_business_case
- New agents always runtimeEnabled=false
- Enable only via owner PR on fleet.ts
- Quota: 50 proposed manifests
- Kill switch: `POST /api/ceo/kill-switch` `{ "paused": true }` — factory only

## Migration

Apply `supabase/migrations/20260929_ceo_factory_phase1.sql` in Supabase when ready.

## CI

```bash
npm install && npm test && npm run typecheck && npm run build
```

## Rollback

Revert factory commits / previous Vercel deployment. Factory tables are additive.
