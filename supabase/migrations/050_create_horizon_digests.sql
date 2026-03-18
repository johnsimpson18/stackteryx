-- Horizon digests: weekly market intelligence for MSP owners
create table public.horizon_digests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,

  week_label text not null,
  week_start date not null,
  status text default 'draft',

  digest_json jsonb not null,

  viewed_at timestamptz,
  dismissed_at timestamptz,

  generated_at timestamptz default now() not null,

  unique(org_id, week_start)
);

alter table public.horizon_digests enable row level security;

create policy "org members can read own digests"
  on public.horizon_digests for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "service role can manage digests"
  on public.horizon_digests for all
  using (auth.role() = 'service_role');

create index on public.horizon_digests (org_id, week_start desc);
