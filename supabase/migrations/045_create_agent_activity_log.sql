-- Agent activity log: tracks what each AI agent does for an org
create table public.agent_activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  agent_id text not null,           -- 'aria' | 'margin' | 'scout' | 'sage' | 'pitch'
  activity_type text not null,      -- 'analysis' | 'generation' | 'detection' | 'alert'
  title text not null,
  description text,
  entity_type text,                 -- 'service' | 'client' | 'proposal' | 'brief'
  entity_id uuid,
  entity_name text,
  metadata jsonb default '{}',
  created_at timestamptz default now() not null
);

alter table public.agent_activity_log enable row level security;

create policy "org members can read own activity"
  on public.agent_activity_log for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "service role can insert activity"
  on public.agent_activity_log for insert
  with check (true);

create index on public.agent_activity_log (org_id, created_at desc);
