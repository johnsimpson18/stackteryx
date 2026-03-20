-- Chat behavior: lightweight session-level tracking for behavior learning
create table public.chat_behavior (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  session_date date not null,
  topics text[] default '{}',
  actions_taken text[] default '{}',
  created_at timestamptz default now()
);

alter table public.chat_behavior enable row level security;

create policy "org members can read own behavior"
  on public.chat_behavior for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "service role can manage"
  on public.chat_behavior for all
  using (auth.role() = 'service_role');
