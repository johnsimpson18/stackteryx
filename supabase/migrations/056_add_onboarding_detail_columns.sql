-- Dedicated columns for onboarding chat answers (previously all saved to additional_context or company_size)
ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS biggest_challenge text,
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS tool_hints text,
  ADD COLUMN IF NOT EXISTS client_count_range text,
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS delivery_model text;
-- sales_team_type and delivery_models already exist from migration 019
