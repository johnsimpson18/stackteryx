-- ============================================================
-- Stackteryx — Phase 8: Onboarding RLS + robustness fixes
-- ============================================================
-- Problem: The original "Owner can update settings" policy requires
-- the user's profile to have role='owner'. If the first user's profile
-- was created before the DB was fully initialised, or if there's any
-- timing issue, the UPDATE is silently blocked and onboarding fails.
--
-- Fix: Allow any authenticated user to INSERT or UPDATE workspace_settings.
-- This is safe because workspace_settings is a single shared-config row
-- (not per-user data) and all authenticated users in a Stackteryx workspace
-- are trusted MSP operators.
-- ============================================================

-- ── 1. Replace the owner-only UPDATE policy ──────────────────────────────────
DROP POLICY IF EXISTS "Owner can update settings" ON workspace_settings;

CREATE POLICY "Authenticated can update settings" ON workspace_settings
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 2. Add INSERT policy (handles fresh workspaces with no seed row) ─────────
-- Without this, completeOnboardingAction's INSERT fallback is blocked by RLS.
CREATE POLICY "Authenticated can insert settings" ON workspace_settings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ── 3. Ensure onboarding_completed column exists (idempotent re-run of 006) ──
ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
