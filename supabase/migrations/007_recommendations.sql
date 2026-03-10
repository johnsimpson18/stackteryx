-- ============================================================
-- Stackteryx — Phase 7: AI Bundle Recommendations
-- ============================================================

-- ── 1. Extend audit_action enum ──────────────────────────────────────────────
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'recommendation_generated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'bundle_created_from_recommendation';

-- ── 2. Recommendation history table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendation_history (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  client_name              TEXT        NOT NULL,
  industry                 TEXT        NOT NULL,
  seat_count               INTEGER     NOT NULL CHECK (seat_count >= 1),
  risk_tolerance           TEXT        NOT NULL,
  compliance_requirements  JSONB       NOT NULL DEFAULT '[]',
  recommendations          JSONB,
  bundles_created          UUID[]      NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE recommendation_history IS
  'Audit trail of AI bundle recommendations generated for client prospects.';

-- ── 3. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE recommendation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read recommendation history"
  ON recommendation_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert recommendation history"
  ON recommendation_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
