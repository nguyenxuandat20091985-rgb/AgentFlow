-- Tier A owned CMS table for AI Website autopublish
-- Run once in Supabase SQL editor if table does not exist.

create table if not exists public.website_published_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text not null,
  destination_id text,
  affiliate_link text,
  product_id text,
  product_name text,
  queue_action_id text,
  agent_id text not null default 'salesbot',
  channel text not null default 'website',
  tier text not null default 'A',
  status text not null default 'published',
  published_at timestamptz not null default now(),
  published_url text,
  provider_response_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists website_published_posts_published_at_idx
  on public.website_published_posts (published_at desc);

create index if not exists website_published_posts_status_idx
  on public.website_published_posts (status);
