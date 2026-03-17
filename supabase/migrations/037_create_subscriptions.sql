-- Subscriptions: tracks each org's billing plan and Stripe subscription state
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.orgs(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free',          -- 'free' | 'pro'
  status text not null default 'active',      -- 'active' | 'past_due' | 'canceled' | 'trialing'
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.subscriptions enable row level security;

-- Org members can read their own subscription
create policy "org members can read own subscription"
  on public.subscriptions for select
  using (org_id in (select get_user_org_ids()));

-- Only service role can insert/update (webhooks run as service role)
create policy "service role can manage subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- Seed a free subscription for every existing org
insert into public.subscriptions (org_id, plan, status)
select id, 'free', 'active' from public.orgs
on conflict (org_id) do nothing;
