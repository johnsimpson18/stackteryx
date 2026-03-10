-- Add org_outcome_targets to orgs table for portfolio outcome coverage goals
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS org_outcome_targets jsonb;
