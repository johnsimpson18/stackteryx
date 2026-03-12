-- ────────────────────────────────────────────────────────────────────────────
-- Migration 034: Fix default target margin consistency
--
-- The DB column default was 0.30 but the application (wizard, AI context,
-- scenarios) all use 0.35. Align the DB default to match.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE bundle_versions
  ALTER COLUMN target_margin_pct SET DEFAULT 0.35;

-- Also update the workspace_settings default to match
ALTER TABLE workspace_settings
  ALTER COLUMN default_target_margin_pct SET DEFAULT 0.35;
