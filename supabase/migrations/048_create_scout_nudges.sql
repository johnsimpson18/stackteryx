-- Scout nudges: proactive signals from the Portfolio Analyst agent
create table public.scout_nudges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,

  nudge_type text not null,
  priority integer default 5,
  title text not null,
  body text not null,

  -- Entity this nudge relates to
  entity_type text,
  entity_id uuid,
  entity_name text,

  -- Action
  cta_label text,
  cta_href text,

  -- Lifecycle
  status text default 'active',
  dismissed_at timestamptz,
  acted_at timestamptz,
  expires_at timestamptz,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.scout_nudges enable row level security;

create policy "org members can read own nudges"
  on public.scout_nudges for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "org members can update own nudges"
  on public.scout_nudges for update
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "service role can manage nudges"
  on public.scout_nudges for all
  using (auth.role() = 'service_role');

create index on public.scout_nudges (org_id, status, priority);
