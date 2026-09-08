alter table public.revenue_ledger add column if not exists agent_id text;

create index if not exists revenue_ledger_agent_id_idx on public.revenue_ledger(agent_id);

create table if not exists public.agent_kpis (
  agent_id text primary key,
  target_amount numeric not null default 15000000,
  period_start date not null default date_trunc('month', now())::date,
  period_end date not null default (date_trunc('month', now()) + interval '1 month - 1 day')::date,
  updated_at timestamptz not null default now()
);

insert into public.agent_kpis(agent_id, target_amount)
values ('salesbot',15000000),('marketing',15000000)
on conflict (agent_id) do update set target_amount=excluded.target_amount, updated_at=now();

create table if not exists public.agent_task_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  task_type text not null,
  status text not null,
  input_snapshot jsonb,
  output text,
  created_at timestamptz not null default now()
);

create index if not exists agent_task_runs_agent_created_idx on public.agent_task_runs(agent_id, created_at desc);

create unique index if not exists revenue_ledger_event_agent_unique on public.revenue_ledger(event_id, agent_id) where agent_id is not null;
