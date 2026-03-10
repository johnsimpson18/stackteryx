-- Migration 023: Enhance bundle_enablement with AI context fields
-- Adds outcome-layer data so the generation prompt always receives context.
-- Does not remove or rename any existing columns.

ALTER TABLE bundle_enablement ADD COLUMN IF NOT EXISTS outcome_type          text;
ALTER TABLE bundle_enablement ADD COLUMN IF NOT EXISTS outcome_statement     text;
ALTER TABLE bundle_enablement ADD COLUMN IF NOT EXISTS target_vertical       text;
ALTER TABLE bundle_enablement ADD COLUMN IF NOT EXISTS target_persona        text;
ALTER TABLE bundle_enablement ADD COLUMN IF NOT EXISTS service_capabilities  jsonb;
ALTER TABLE bundle_enablement ADD COLUMN IF NOT EXISTS ai_context_version    integer DEFAULT 1;
