# AgentFlow — Production Agent Isolation

## Production agents

Only these two agents are enabled for the production runtime:

- `salesbot` → **AI Website**
- `marketing` → **AI Facebook**

Their heartbeat and runtime execution are the only production execution paths in the current automation loop.

## Development agents

The other 18 agents are registry entries only. They have `runtimeEnabled: false` and are not accepted by `/api/agents/heartbeat` or `/api/agents/runtime`.

They must be developed independently and activated one at a time after validation. A development agent must never be added to the primary runtime allow-list as part of a normal feature change.

## Safety rules

1. Do not use fake heartbeats to make an agent appear online.
2. Do not seed the UI with online agents; online state comes from fresh Supabase heartbeat data.
3. Production runtime accepts only explicitly enabled agents.
4. Website and Facebook agents keep separate channel scopes and action queues.
5. Financial KPI remains read-only evidence from verified payment/revenue records; development work cannot manufacture revenue.
6. Changes for the remaining agents should be made on a feature branch and merged only after CI/build/runtime validation.
7. If a shared file must be changed, validate the two production agents first before merging.
