# Autonomous Business Network — Engineering Plan

Status: Phase 0 design / implementation branch. This document does not enable new production agents or claim revenue.

## Product objective

Extend AgentFlow into an extensible autonomous business network: the CEO coordinates independently isolated business agents; a controlled factory can propose, scaffold, test, and register additional agents. The system has no fixed revenue ceiling or fixed agent-count target. Actual growth remains bounded by verified demand, available compute, provider limits, policy, and owner-controlled budgets.

## Existing production baseline (preserve)

- Current primary runtime allow-list is SalesBot (website) and Marketing (Facebook).
- The CEO is orchestration/review/reporting, not a channel executor.
- Existing queues, heartbeats, payment flows, and verified revenue ledger must remain backward-compatible.
- New agents remain disabled until their isolated implementation, tests, provider permissions, and operational checks pass.

## Target architecture

1. **Opportunity Research** — gather provider-approved/public signals; store source, timestamp, confidence, and evidence.
2. **Business Case Evaluator** — estimate unit economics using explicit assumptions; label projections as estimates, never booked revenue.
3. **Agent Factory** — create a proposed agent manifest and isolated workspace/branch from approved templates. No self-merge, production deploy, or secret access.
4. **Validation Gate** — schema validation, path ownership, dependency/security checks, unit/integration tests, budget and rate-limit checks.
5. **Runtime Registry** — lifecycle states: proposed → sandbox → reviewed → enabled → paused/retired. Runtime allow-list remains the sole production activation control.
6. **Execution Workers** — one agent ID, domain, channel, queue, dedupe namespace, and scoped credentials per worker.
7. **Evidence Ledger** — separate verified cash receipts, pending provider commissions, refunds, expenses, and forecasts. Only provider-confirmed events may become realized revenue.
8. **Owner Cockpit** — report actual cash, pending commissions, costs, net contribution, agent health, and audit events.

## Growth policy

- No hard-coded revenue ceiling and no fixed maximum agent count in product logic.
- Scale by validated business case, available infrastructure, provider quotas, and explicit spend ceilings.
- Use per-agent budgets, global daily spend ceiling, concurrency limits, backoff, kill switch, and automatic pause on anomalous cost/error rates.
- Profits may be earmarked for reinvestment, but transfers, withdrawals, asset purchases, and changes to payment destinations require owner-controlled approval.
- Never claim guaranteed, unlimited, or realized earnings without transaction evidence.

## Conway Automaton evaluation

Treat Conway-Research/automaton as an upstream reference, not a trusted runtime dependency. Before adopting code: pin an exact commit, review license and transitive dependencies, threat-model shell/tool execution, inspect secret and wallet handling, run in a disposable sandbox, and extract only bounded components behind AgentFlow interfaces. Do not import its wallet or unrestricted self-modification into production.

## Integration contracts (proposed)

- Agent manifest: `id`, `version`, `domain`, `channel`, `branchHint`, `capabilities[]`, `budgetPolicy`, `runtimeEnabled=false`.
- Every action: `agent_id`, matching `channel`, idempotency/dedupe key, evidence references, execution mode, status, timestamps.
- Every financial event: provider/event ID, idempotency key, gross amount, currency, fees, net amount, lifecycle status, verified timestamp, source provider.
- Agent-generated code is untrusted until CI and human/owner review; agent cannot grant itself permissions.

## Delivery phases

### Phase 0 — Architecture and safeguards
- Document boundaries, lifecycle, financial truth, and acceptance criteria.
- Preserve current production runtime.

### Phase 1 — Read-only factory prototype
- Manifest schema, opportunity/business-case records, audit log, dashboard read model.
- No shell execution, deployment, payments, or activation.

### Phase 2 — Isolated sandbox builder
- Generate branch/worktree from a reviewed template; enforce path allow-list and resource quotas.
- Run tests and static checks; produce a reviewable PR only.

### Phase 3 — One-agent pilot
- Select one low-risk business workflow with a real provider confirmation path.
- Shadow mode first; then limited enablement after passing acceptance checks.

### Phase 4 — Controlled scaling
- Add agents incrementally, each independently observable and pausable.
- Scale compute and concurrency from measured economics, not assumed revenue.

## Acceptance criteria

- Existing SalesBot and Marketing heartbeat behavior unchanged.
- No writes to realized-revenue ledger except verified payment/provider ingestion.
- Duplicate provider webhooks are idempotent.
- Agent cannot access another agent's secrets, queue, or source paths.
- Factory cannot enable itself, merge its own PR, change payment destinations, or withdraw funds.
- Kill switch pauses new work without corrupting completed financial records.
- CI/build and isolated integration tests pass before production activation.
