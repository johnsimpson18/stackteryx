-- Org-level compliance coverage: aggregate scores from all active services
create table public.org_compliance_coverage (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,

  -- Framework scores (0-100)
  hipaa_score integer default 0,
  pci_score integer default 0,
  cmmc_score integer default 0,

  -- Contributing tools per framework (for display)
  hipaa_tools text[] default '{}',
  pci_tools text[] default '{}',
  cmmc_tools text[] default '{}',

  -- Gap analysis
  hipaa_gaps text[] default '{}',
  pci_gaps text[] default '{}',
  cmmc_gaps text[] default '{}',

  -- Score trend
  previous_hipaa integer,
  previous_pci integer,
  previous_cmmc integer,

  calculated_at timestamptz default now() not null,
  unique(org_id)
);

alter table public.org_compliance_coverage enable row level security;

create policy "org members can read own coverage"
  on public.org_compliance_coverage for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "service role can manage coverage"
  on public.org_compliance_coverage for all
  using (auth.role() = 'service_role');
