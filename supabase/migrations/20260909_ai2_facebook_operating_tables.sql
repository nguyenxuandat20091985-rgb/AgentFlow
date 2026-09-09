create table if not exists public.facebook_signals (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_url text not null,
  external_id text not null unique,
  title text not null,
  body text,
  intent_score integer not null default 0 check (intent_score between 0 and 100),
  matched_terms jsonb not null default '[]'::jsonb,
  status text not null default 'new',
  channel text not null default 'facebook',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facebook_signals_intent_idx on public.facebook_signals (intent_score desc, created_at desc);
create index if not exists facebook_signals_status_idx on public.facebook_signals (status, created_at desc);

create table if not exists public.facebook_activity_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  status text not null default 'observed',
  external_id text,
  source_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists facebook_activity_events_type_idx on public.facebook_activity_events (event_type, created_at desc);
create unique index if not exists facebook_activity_events_external_idx on public.facebook_activity_events (event_type, external_id) where external_id is not null;

alter table public.facebook_signals enable row level security;
alter table public.facebook_activity_events enable row level security;

revoke all on public.facebook_signals from anon, authenticated;
revoke all on public.facebook_activity_events from anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='facebook_signals' and policyname='facebook_signals_service_role_only') then
    create policy facebook_signals_service_role_only on public.facebook_signals for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='facebook_activity_events' and policyname='facebook_activity_events_service_role_only') then
    create policy facebook_activity_events_service_role_only on public.facebook_activity_events for all to service_role using (true) with check (true);
  end if;
end $$;
