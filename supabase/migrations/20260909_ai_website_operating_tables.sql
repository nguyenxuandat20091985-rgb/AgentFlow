create table if not exists public.website_signals (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_url text not null,
  external_id text not null,
  title text not null,
  body text,
  author text,
  published_at timestamptz,
  intent_score numeric not null default 0,
  matched_terms text[] not null default '{}',
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_signals_source_external_unique unique (source, external_id)
);
create index if not exists website_signals_status_score_idx on public.website_signals (status, intent_score desc, created_at desc);
create index if not exists website_signals_published_idx on public.website_signals (published_at desc);

create table if not exists public.website_content_drafts (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid references public.website_signals(id) on delete set null,
  product_id text,
  title text not null,
  content text not null,
  affiliate_url text,
  disclosure text not null default 'Nội dung có thể chứa liên kết tiếp thị liên kết.',
  status text not null default 'draft',
  source text not null default 'ai_website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists website_content_drafts_status_idx on public.website_content_drafts (status, created_at desc);
create index if not exists website_content_drafts_signal_idx on public.website_content_drafts (signal_id);

create table if not exists public.website_click_events (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  network text,
  source text,
  referrer text,
  path text,
  created_at timestamptz not null default now()
);
create index if not exists website_click_events_product_idx on public.website_click_events (product_id, created_at desc);
create index if not exists website_click_events_created_idx on public.website_click_events (created_at desc);

alter table public.website_signals enable row level security;
alter table public.website_content_drafts enable row level security;
alter table public.website_click_events enable row level security;
revoke all on public.website_signals from anon, authenticated;
revoke all on public.website_content_drafts from anon, authenticated;
revoke all on public.website_click_events from anon, authenticated;
