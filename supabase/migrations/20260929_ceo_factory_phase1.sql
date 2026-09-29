-- Phase 1-2 Agent Factory tables. Does NOT enable agents or alter revenue_ledger.
create table if not exists public.agent_manifests (
  id text primary key, version text not null, name text not null, domain text not null, channel text not null,
  owner text not null, branch_hint text not null, capabilities jsonb not null default '[]'::jsonb,
  budget_policy jsonb not null default '{}'::jsonb, runtime_enabled boolean not null default false,
  lifecycle text not null default 'proposed' check (lifecycle in ('proposed','sandbox','validated','review_required','approved','enabled','paused','retired')),
  template_id text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint agent_manifests_runtime_safety check (runtime_enabled = false or lifecycle in ('enabled','paused'))
);
create index if not exists agent_manifests_lifecycle_idx on public.agent_manifests (lifecycle, updated_at desc);

create table if not exists public.opportunities (
  id text primary key, title text not null, summary text not null, domain text not null,
  status text not null default 'discovered' check (status in ('discovered','researching','evaluated','accepted','rejected','archived')),
  source jsonb not null default '{}'::jsonb, assumptions jsonb not null default '[]'::jsonb,
  estimated_monthly_revenue_vnd numeric, estimated_monthly_cost_vnd numeric,
  is_realized_revenue boolean not null default false check (is_realized_revenue = false),
  decided_by text, decision_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists opportunities_status_idx on public.opportunities (status, updated_at desc);

create table if not exists public.business_cases (
  id text primary key, opportunity_id text references public.opportunities(id) on delete set null,
  title text not null, status text not null default 'draft' check (status in ('draft','review','approved','rejected','superseded')),
  assumptions jsonb not null default '{}'::jsonb,
  projected_gross_monthly_vnd numeric not null default 0, projected_net_monthly_vnd numeric not null default 0,
  confidence_interval_low_vnd numeric not null default 0, confidence_interval_high_vnd numeric not null default 0,
  classification text not null default 'forecast_only' check (classification = 'forecast_only'),
  is_realized_revenue boolean not null default false check (is_realized_revenue = false),
  reviewed_by text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists business_cases_status_idx on public.business_cases (status, updated_at desc);

create table if not exists public.ceo_audit_events (
  id text primary key, actor text not null check (actor in ('owner','ceo','system','agent','factory')),
  actor_id text, action text not null, target_type text not null, target_id text,
  result text not null check (result in ('ok','denied','error')), detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ceo_audit_events_created_idx on public.ceo_audit_events (created_at desc);

alter table public.agent_manifests enable row level security;
alter table public.opportunities enable row level security;
alter table public.business_cases enable row level security;
alter table public.ceo_audit_events enable row level security;
revoke all on public.agent_manifests from anon, authenticated;
revoke all on public.opportunities from anon, authenticated;
revoke all on public.business_cases from anon, authenticated;
revoke all on public.ceo_audit_events from anon, authenticated;
