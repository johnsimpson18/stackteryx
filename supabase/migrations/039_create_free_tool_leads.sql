-- Free tool leads: captures email/company from unauthenticated CTO brief users
create table public.free_tool_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text,
  company_name text,
  client_domain text,
  converted_to_org_id uuid references public.orgs(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.free_tool_leads enable row level security;

-- Only service role has access (written by unauthenticated flow, read by admin)
create policy "service role full access"
  on public.free_tool_leads for all
  using (auth.role() = 'service_role');
