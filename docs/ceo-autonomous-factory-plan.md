# Autonomous Business Network — Engineering Plan

Status: Phase 1–2 code on branch `agent/ceo-autonomous-factory`. Does not enable new production agents or claim revenue.

## Product objective

Extensible autonomous business network: CEO coordinates isolated agents; controlled factory proposes and sandbox-validates additional agents. No fixed revenue ceiling. Growth bounded by verified demand, compute, policy, and owner budgets.

## Existing baseline (preserve)

- Runtime: SalesBot (website) + Marketing (Facebook)
- CEO is orchestration only
- Queues, heartbeats, PayOS webhook, revenue ledger unchanged

## Delivered on this branch

### Phase 1 — Read-only factory ✅
- Schemas: agent-manifest, opportunity, business-case, audit-event, ledger-classification
- Factory service + GET|POST `/api/ceo/factory`
- CEO cockpit Factory section (mobile-friendly)
- Migration `20260929_ceo_factory_phase1.sql`
- Unit tests: `npm test`

### Phase 2 — Sandbox (static) ✅
- `sandbox_check` with capability denylist, reserved IDs, budget defaults
- Anti-runaway quota (50 manifests)
- Kill switch `/api/ceo/kill-switch`
- Budget guard helper
- **Not yet:** auto branch/PR, shell test runner in worktree

### Phase 3–5 — NOT STARTED
Pilot enablement, scaling, Conway evaluation (reference only).

## Safety

- Factory cannot set runtimeEnabled=true
- Factory cannot transition to enabled (owner fleet.ts only)
- Pending/forecast never classified as realized revenue
- Kill switch does not stop salesbot/marketing heartbeats

## Owner actions required

1. Review PR #32 / this branch
2. Wait for CI green; merge when ready
3. Apply Supabase migration when ready
4. Do not flip runtimeEnabled for new agents until pilot acceptance
