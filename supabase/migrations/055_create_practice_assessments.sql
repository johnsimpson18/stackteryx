-- Practice assessments: stored AI-generated practice snapshots
create table public.practice_assessments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  content text not null,
  chips jsonb default '[]',
  service_model text,
  tool_count integer default 0,
  service_count integer default 0,
  blended_margin numeric(5,2),
  target_verticals text[] default '{}',
  generated_at timestamptz default now() not null,
  is_current boolean default true,
  created_at timestamptz default now() not null
);

create unique index practice_assessments_org_current
  on public.practice_assessments(org_id)
  where is_current = true;

alter table public.practice_assessments enable row level security;

create policy "org members can read own assessments"
  on public.practice_assessments for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "service role can manage"
  on public.practice_assessments for all
  using (auth.role() = 'service_role');
