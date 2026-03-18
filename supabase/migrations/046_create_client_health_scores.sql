-- Client Health Scores: automated 0-100 score across four dimensions
create table public.client_health_scores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,

  -- Dimension scores (0-100 each)
  stack_score integer default 0,
  compliance_score integer default 0,
  advisory_score integer default 0,
  commercial_score integer default 0,

  -- Weighted overall score
  overall_score integer default 0,

  -- Score drivers (stored for display)
  stack_gaps text[] default '{}',
  compliance_gaps text[] default '{}',
  advisory_gaps text[] default '{}',
  commercial_gaps text[] default '{}',

  -- Trend
  previous_score integer,
  score_delta integer,

  calculated_at timestamptz default now() not null,

  unique(org_id, client_id)
);

alter table public.client_health_scores enable row level security;

create policy "org members can read own scores"
  on public.client_health_scores for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "service role can manage scores"
  on public.client_health_scores for all
  using (auth.role() = 'service_role');

create index on public.client_health_scores (org_id, overall_score);
create index on public.client_health_scores (org_id, client_id);
