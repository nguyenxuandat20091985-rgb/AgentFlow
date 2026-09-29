# Conway Automaton Evaluation

Upstream: https://github.com/Conway-Research/automaton

## Decision

**Do not import Conway Automaton runtime into AgentFlow production.**

Use AgentFlow native factory + isolation + fleet allow-list instead.

## Review criteria

| Criterion | Finding | Impact |
|-----------|---------|--------|
| License | Must be verified per pinned commit before any code reuse | BLOCKER until pinned |
| Shell/tool execution | Research agents often allow broad tool use | High risk |
| Wallet / keys | May handle keys | **Forbidden** in AgentFlow agents |
| Self-modification | Replication loops | Conflicts with PR review gate |
| Compatibility | Different runtime than Next.js + Supabase | High integration cost |

## Rejected

1. Unrestricted shell in production request path
2. Agent-held wallets or private keys
3. Auto-merge / auto-deploy of agent-generated code
4. Self-escalating permissions via child agents

## Ideas only (no code copy)

1. Explicit agent lifecycle states
2. Sandbox-before-production discipline
3. Observable job results

*Evaluation date: 2026-09-29. No Conway code vendored.*
