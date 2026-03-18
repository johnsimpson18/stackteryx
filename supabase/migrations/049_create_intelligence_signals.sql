-- Intelligence signals: org-level patterns that compound over time
create table public.intelligence_signals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,

  signal_type text not null,
  signal_key text not null,
  signal_value jsonb not null,

  period text,
  calculated_at timestamptz default now() not null,

  unique(org_id, signal_type, signal_key, period)
);

alter table public.intelligence_signals enable row level security;

create policy "org members can read own signals"
  on public.intelligence_signals for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "service role can manage signals"
  on public.intelligence_signals for all
  using (auth.role() = 'service_role');
