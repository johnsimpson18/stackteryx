-- Migration: Add subtitle & compliance_frameworks to bundles,
--            and selected_outcomes to service_outcomes

-- Subtitle for the service (shown in proposals / client materials)
alter table public.bundles
  add column if not exists subtitle text,
  add column if not exists compliance_frameworks text[] default '{}';

-- Selected outcomes from the outcome library (JSONB array)
alter table public.service_outcomes
  add column if not exists selected_outcomes jsonb default '[]';
