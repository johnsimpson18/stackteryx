-- Fractional CTO Briefs table
create table public.fractional_cto_briefs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  domain text not null,
  industry text not null,
  company_size text not null,
  primary_concern text,
  msp_name text not null,
  quarter_label text not null,
  brief_json jsonb not null,
  created_at timestamptz default now() not null,
  created_by uuid references auth.users(id) on delete set null
);

-- RLS
alter table public.fractional_cto_briefs enable row level security;

create policy "org_cto_briefs_select"
  on public.fractional_cto_briefs for select
  using (org_id in (select get_user_org_ids()));

create policy "org_cto_briefs_insert"
  on public.fractional_cto_briefs for insert
  with check (org_id in (select get_user_org_ids()));

create policy "org_cto_briefs_delete"
  on public.fractional_cto_briefs for delete
  using (org_id in (select get_user_org_ids()));
