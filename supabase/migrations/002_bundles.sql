-- ============================================================
-- Stackteryx — Phase 2: Bundles & Versions Migration
-- ============================================================

-- New Enums
CREATE TYPE bundle_type AS ENUM ('ala_carte', 'tiered', 'vertical', 'custom');
CREATE TYPE risk_tier AS ENUM ('low', 'medium', 'high');
CREATE TYPE bundle_status AS ENUM ('draft', 'active', 'archived');

-- Extend audit_action enum
ALTER TYPE audit_action ADD VALUE 'bundle_created';
ALTER TYPE audit_action ADD VALUE 'bundle_updated';
ALTER TYPE audit_action ADD VALUE 'bundle_archived';
ALTER TYPE audit_action ADD VALUE 'version_created';

-- ============================================================
-- Tables
-- ============================================================

-- Bundles
CREATE TABLE bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bundle_type bundle_type NOT NULL DEFAULT 'custom',
  description TEXT DEFAULT '',
  status bundle_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bundle Versions (immutable once saved)
CREATE TABLE bundle_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  seat_count INTEGER NOT NULL CHECK (seat_count >= 0),
  risk_tier risk_tier NOT NULL DEFAULT 'medium',
  contract_term_months INTEGER NOT NULL DEFAULT 12 CHECK (contract_term_months > 0),
  target_margin_pct NUMERIC(5,4) NOT NULL DEFAULT 0.30,
  overhead_pct NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  labor_pct NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  discount_pct NUMERIC(5,4) NOT NULL DEFAULT 0.00 CHECK (discount_pct >= 0 AND discount_pct < 1),
  notes TEXT DEFAULT '',

  -- Computed pricing snapshot (stored on save for historical accuracy)
  computed_true_cost_per_seat NUMERIC(10,4),
  computed_suggested_price NUMERIC(10,4),
  computed_discounted_price NUMERIC(10,4),
  computed_margin_pre_discount NUMERIC(5,4),
  computed_margin_post_discount NUMERIC(5,4),
  computed_mrr NUMERIC(12,4),
  computed_arr NUMERIC(12,4),
  pricing_flags JSONB DEFAULT '[]'::jsonb,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(bundle_id, version_number)
);

-- Bundle Version Tools (which tools are in each version)
CREATE TABLE bundle_version_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_version_id UUID NOT NULL REFERENCES bundle_versions(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id),
  quantity_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.0 CHECK (quantity_multiplier > 0),

  UNIQUE(bundle_version_id, tool_id)
);

-- ============================================================
-- Triggers
-- ============================================================

-- updated_at trigger on bundles (reuses update_updated_at from Phase 1)
CREATE TRIGGER set_bundles_updated_at
  BEFORE UPDATE ON bundles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_version_tools ENABLE ROW LEVEL SECURITY;

-- Bundles: all authenticated can read; non-viewer can create/update
CREATE POLICY "Authenticated can read bundles" ON bundles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Non-viewer can manage bundles" ON bundles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'finance', 'sales'))
  );

-- Bundle versions: all authenticated can read; non-viewer can insert (never update — immutable)
CREATE POLICY "Authenticated can read versions" ON bundle_versions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Non-viewer can create versions" ON bundle_versions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'finance', 'sales'))
  );

-- Bundle version tools: same as versions
CREATE POLICY "Authenticated can read version tools" ON bundle_version_tools
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Non-viewer can create version tools" ON bundle_version_tools
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bundle_versions bv
      JOIN profiles p ON p.id = auth.uid()
      WHERE bv.id = bundle_version_id AND p.role IN ('owner', 'finance', 'sales')
    )
  );
