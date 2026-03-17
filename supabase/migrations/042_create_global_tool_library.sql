create table public.global_tool_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vendor text not null,
  category text not null,
  subcategory text,
  description text not null,
  typical_use_case text not null,
  pricing_model text not null,
  typical_cost_low numeric,
  typical_cost_high numeric,
  cost_unit text default 'seat',
  mssp_tier text default 'all',
  compliance_tags text[] default '{}',
  tags text[] default '{}',
  website_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Read-only for all authenticated users
alter table public.global_tool_library enable row level security;

create policy "authenticated users can read global library"
  on public.global_tool_library for select
  to authenticated
  using (true);

-- Only service role can insert/update (managed by Stackteryx)
create policy "service role manages library"
  on public.global_tool_library for all
  using (auth.role() = 'service_role');

-- Indexes for fast category/search queries
create index on public.global_tool_library (category);
create index on public.global_tool_library using gin(tags);
create index on public.global_tool_library using gin(compliance_tags);
