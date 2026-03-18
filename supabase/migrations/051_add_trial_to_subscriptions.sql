-- Add trial fields to subscriptions
-- Valid plan values: 'trial' | 'free' | 'pro' | 'enterprise'
alter table public.subscriptions
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_converted boolean default false,
  add column if not exists trial_reminder_sent_at timestamptz;
