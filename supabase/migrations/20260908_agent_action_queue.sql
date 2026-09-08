create table if not exists public.agent_action_queue (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  action_type text not null,
  channel text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','executed','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  source_type text,
  source_id text,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agent_action_queue_dedupe_idx
  on public.agent_action_queue(dedupe_key);

create index if not exists agent_action_queue_agent_status_idx
  on public.agent_action_queue(agent_id, status, created_at desc);

create index if not exists agent_action_queue_channel_status_idx
  on public.agent_action_queue(channel, status, created_at desc);
