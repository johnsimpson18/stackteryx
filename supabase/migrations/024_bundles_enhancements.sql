-- Migration 024: Enhance bundles with wizard state and layer-complete flags
-- Supports the agentic intelligence layer and the new service model.
-- Does not remove or rename any existing columns.

ALTER TABLE bundles ADD COLUMN IF NOT EXISTS wizard_step_completed       integer     DEFAULT 0;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS outcome_layer_complete      boolean     DEFAULT false;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS stack_layer_complete        boolean     DEFAULT false;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS economics_layer_complete    boolean     DEFAULT false;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS enablement_layer_complete   boolean     DEFAULT false;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS last_ai_analysis_at         timestamptz;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS wizard_in_progress          boolean     DEFAULT false;
