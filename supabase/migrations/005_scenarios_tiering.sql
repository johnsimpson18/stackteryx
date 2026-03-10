-- ============================================================
-- Stackteryx — Phase 5: Scenarios + Tiered-by-Metric
-- ============================================================

-- ── 1. Extend pricing_model enum ─────────────────────────────────────────────
-- Postgres does not allow removing enum values, only adding.
ALTER TYPE pricing_model ADD VALUE IF NOT EXISTS 'tiered_by_metric';

-- ── 2. Add tier_metric column to tools ───────────────────────────────────────
-- Specifies which scenario metric drives tier lookup for tiered_by_metric tools.
-- Valid values: 'endpoints' | 'users' | 'headcount'
ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS tier_metric TEXT NOT NULL DEFAULT 'endpoints'
    CHECK (tier_metric IN ('endpoints', 'users', 'headcount'));

COMMENT ON COLUMN tools.tier_metric IS
  'For tiered_by_metric pricing: which assumption metric drives tier selection.';

-- ── 3. Scenarios table ───────────────────────────────────────────────────────
-- A Scenario is a named set of client assumptions + sell config, scoped to a bundle.
-- Multiple scenarios per bundle allow instant multi-customer quoting.
CREATE TABLE IF NOT EXISTS scenarios (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id             UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL DEFAULT 'New Scenario',
  -- Client assumptions
  endpoints             INTEGER NOT NULL DEFAULT 30 CHECK (endpoints >= 0),
  users                 INTEGER NOT NULL DEFAULT 30 CHECK (users >= 0),
  headcount             INTEGER NOT NULL DEFAULT 30 CHECK (headcount >= 0),
  org_count             INTEGER NOT NULL DEFAULT 1  CHECK (org_count >= 1),
  contract_term_months  INTEGER NOT NULL DEFAULT 12 CHECK (contract_term_months >= 1),
  sites                 INTEGER NOT NULL DEFAULT 1  CHECK (sites >= 1),
  -- Sell configuration stored as JSONB for flexibility
  sell_config           JSONB NOT NULL DEFAULT '{"strategy":"cost_plus_margin","target_margin_pct":0.35}',
  -- Whether this is the bundle's default/active scenario
  is_default            BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE scenarios IS
  'Named client assumption sets (SMB 30 endpoints, Mid 250 endpoints, etc.) for instant multi-quote pricing.';

-- ── 4. Ensure only one default scenario per bundle ───────────────────────────
-- Partial unique index: only one row per bundle_id where is_default = true
CREATE UNIQUE INDEX IF NOT EXISTS scenarios_bundle_one_default
  ON scenarios (bundle_id)
  WHERE is_default = true;

-- ── 5. updated_at trigger ────────────────────────────────────────────────────
CREATE TRIGGER set_scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. Row Level Security ────────────────────────────────────────────────────
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read scenarios" ON scenarios
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Non-viewer can manage scenarios" ON scenarios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'finance', 'sales')
    )
  );
