-- ────────────────────────────────────────────────────────────────────────────
-- Migration 033: Add additional services totals + renewal pricing columns
--
-- Previously, additional services MRR was computed in the UI but never
-- persisted alongside tool-based pricing. This adds columns for the
-- complete picture: tool MRR + additional services MRR = total MRR.
--
-- Also adds renewal pricing columns (uses renewal_uplift_pct from tools).
-- ────────────────────────────────────────────────────────────────────────────

-- Additional services totals
ALTER TABLE bundle_versions
  ADD COLUMN IF NOT EXISTS computed_additional_services_mrr NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS computed_additional_services_cost_mrr NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS computed_total_mrr NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS computed_total_cost_mrr NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS computed_total_arr NUMERIC(12,4) DEFAULT 0;

-- Renewal pricing columns
ALTER TABLE bundle_versions
  ADD COLUMN IF NOT EXISTS computed_renewal_price_per_seat NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS computed_renewal_margin NUMERIC(5,4);

-- Add comments for clarity
COMMENT ON COLUMN bundle_versions.computed_mrr IS 'Tool-only MRR (preserved for backwards compatibility)';
COMMENT ON COLUMN bundle_versions.computed_total_mrr IS 'Total MRR: tools + additional services recurring';
COMMENT ON COLUMN bundle_versions.computed_total_arr IS 'Total ARR: computed_total_mrr * 12';
COMMENT ON COLUMN bundle_versions.computed_additional_services_mrr IS 'Monthly revenue from additional services';
COMMENT ON COLUMN bundle_versions.computed_additional_services_cost_mrr IS 'Monthly cost from additional services';
COMMENT ON COLUMN bundle_versions.computed_renewal_price_per_seat IS 'Suggested per-seat price at renewal (accounts for tool cost increases)';
COMMENT ON COLUMN bundle_versions.computed_renewal_margin IS 'Post-discount margin at renewal pricing';

-- Backfill: set computed_total_* to match computed_* for existing rows
UPDATE bundle_versions
  SET computed_total_mrr = COALESCE(computed_mrr, 0),
      computed_total_cost_mrr = COALESCE(computed_true_cost_per_seat * seat_count, 0),
      computed_total_arr = COALESCE(computed_arr, 0)
  WHERE computed_total_mrr = 0 AND computed_mrr IS NOT NULL;
