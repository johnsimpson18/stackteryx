-- ============================================================
-- Stackteryx — Phase 6: Onboarding flag
-- ============================================================

-- Add onboarding_completed flag to workspace_settings
-- so the middleware knows whether to redirect new users.
ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN workspace_settings.onboarding_completed IS
  'Set to true after the first-run wizard has been completed.
   The middleware uses this to skip the redirect on subsequent logins.';
