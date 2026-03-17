-- Usage tracking: per-org monthly counters for rate-limited features
create table public.usage_tracking (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  period_month text not null,               -- format: 'YYYY-MM'
  ai_generations_count integer default 0,
  exports_count integer default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(org_id, period_month)
);

alter table public.usage_tracking enable row level security;

create policy "org members can read own usage"
  on public.usage_tracking for select
  using (org_id in (select get_user_org_ids()));

create policy "service role can manage usage"
  on public.usage_tracking for all
  using (auth.role() = 'service_role');
