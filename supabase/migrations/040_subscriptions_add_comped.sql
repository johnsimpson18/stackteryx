-- Add comp/gifted access columns to subscriptions
alter table public.subscriptions
  add column comped boolean default false,
  add column comped_by text,
  add column comped_reason text,
  add column comped_expires_at timestamptz;
