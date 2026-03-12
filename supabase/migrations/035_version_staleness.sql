-- ────────────────────────────────────────────────────────────────────────────
-- Migration 035: Stale version detection
--
-- When a tool's cost changes, all active bundle versions using that tool
-- become "stale" — their computed pricing no longer reflects current costs.
-- This trigger automatically marks them so the UI can surface warnings.
-- ────────────────────────────────────────────────────────────────────────────

-- Add staleness tracking columns to bundle_versions
ALTER TABLE bundle_versions
  ADD COLUMN IF NOT EXISTS pricing_last_computed_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_pricing_stale boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stale_reason text;

-- Add pricing_updated_at to tools (tracks when costs last changed)
ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS pricing_updated_at timestamptz DEFAULT now();

-- Trigger function: mark bundle versions stale when a tool's cost changes
CREATE OR REPLACE FUNCTION mark_versions_stale_on_tool_cost_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.per_seat_cost IS DISTINCT FROM NEW.per_seat_cost OR
      OLD.flat_monthly_cost IS DISTINCT FROM NEW.flat_monthly_cost OR
      OLD.per_user_cost IS DISTINCT FROM NEW.per_user_cost OR
      OLD.per_org_cost IS DISTINCT FROM NEW.per_org_cost OR
      OLD.annual_flat_cost IS DISTINCT FROM NEW.annual_flat_cost OR
      OLD.vendor_minimum_monthly IS DISTINCT FROM NEW.vendor_minimum_monthly OR
      OLD.percent_discount IS DISTINCT FROM NEW.percent_discount OR
      OLD.flat_discount IS DISTINCT FROM NEW.flat_discount OR
      OLD.min_monthly_commit IS DISTINCT FROM NEW.min_monthly_commit OR
      OLD.tier_rules IS DISTINCT FROM NEW.tier_rules) THEN

    NEW.pricing_updated_at = now();

    -- Mark all bundle versions that use this tool as stale
    -- Note: bundle_versions has no status column, so we mark all versions
    -- that reference this tool via bundle_version_tools
    UPDATE bundle_versions bv
    SET is_pricing_stale = true,
        stale_reason = 'Tool cost changed: ' || NEW.name
    FROM bundle_version_tools bvt
    WHERE bvt.bundle_version_id = bv.id
      AND bvt.tool_id = NEW.id
      AND bv.is_pricing_stale = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger
DROP TRIGGER IF EXISTS tool_cost_change_staleness ON tools;
CREATE TRIGGER tool_cost_change_staleness
  BEFORE UPDATE ON tools
  FOR EACH ROW
  EXECUTE FUNCTION mark_versions_stale_on_tool_cost_change();
