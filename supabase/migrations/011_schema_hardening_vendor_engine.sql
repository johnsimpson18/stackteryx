-- ============================================================
-- 011 — Schema Hardening & Vendor Cost Engine
--
-- Closes RLS gaps, adds updated_by tracking, creates
-- org_settings, and evolves the vendor/cost model layer.
--
-- ALL CHANGES ARE ADDITIVE — no tables or columns are dropped.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PART A: Close existing RLS gaps
-- ════════════════════════════════════════════════════════════

-- A1. bundle_versions — add missing UPDATE policy
DROP POLICY IF EXISTS "org_bv_update" ON bundle_versions;
CREATE POLICY "org_bv_update" ON bundle_versions FOR UPDATE
  USING (is_member_via_bundle(bundle_id));

-- A2. bundle_version_tools — add missing UPDATE and DELETE policies
DROP POLICY IF EXISTS "org_bvt_update" ON bundle_version_tools;
CREATE POLICY "org_bvt_update" ON bundle_version_tools FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM bundle_versions bv
    WHERE bv.id = bundle_version_id
      AND is_member_via_bundle(bv.bundle_id)
  ));

DROP POLICY IF EXISTS "org_bvt_delete" ON bundle_version_tools;
CREATE POLICY "org_bvt_delete" ON bundle_version_tools FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM bundle_versions bv
    WHERE bv.id = bundle_version_id
      AND is_member_via_bundle(bv.bundle_id)
  ));

-- A3. entitlements — writes are service-role only by design.
-- No INSERT/UPDATE/DELETE policies are created intentionally.
-- The entitlements table is managed exclusively via Supabase
-- service role (admin scripts, edge functions, webhooks).
-- App-layer code should never write to this table directly.
COMMENT ON TABLE entitlements IS
  'Org entitlements. Write access is service-role only — no RLS write policies by design.';


-- ════════════════════════════════════════════════════════════
-- PART B: Add updated_by where missing
-- ════════════════════════════════════════════════════════════

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE bundles
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE client_contracts
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE approvals
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- NOT added to (by design):
--   audit_log, recommendation_history  — append-only
--   bundle_version_tools               — junction table
--   bundle_versions                    — immutable versions
--   workspace_settings                 — singleton, low mutation
--   entitlements                       — service-role managed
--   profiles                           — user-owned, not org-scoped


-- ════════════════════════════════════════════════════════════
-- PART C: Create org_settings
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS org_settings (
  org_id     UUID PRIMARY KEY REFERENCES orgs(id),
  settings   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

-- updated_at trigger (uses update_updated_at from 001_foundation)
DROP TRIGGER IF EXISTS set_updated_at_org_settings ON org_settings;
CREATE TRIGGER set_updated_at_org_settings
  BEFORE UPDATE ON org_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS policies
DROP POLICY IF EXISTS "org_settings_select" ON org_settings;
CREATE POLICY "org_settings_select" ON org_settings FOR SELECT
  USING (is_member_of(org_id));

DROP POLICY IF EXISTS "org_settings_insert" ON org_settings;
CREATE POLICY "org_settings_insert" ON org_settings FOR INSERT
  WITH CHECK (is_member_of(org_id));

DROP POLICY IF EXISTS "org_settings_update" ON org_settings;
CREATE POLICY "org_settings_update" ON org_settings FOR UPDATE
  USING (is_member_of(org_id));

-- No DELETE policy — org settings are never deleted, only updated.

-- Backfill from workspace_settings (all settings columns → JSONB)
INSERT INTO org_settings (org_id, settings, created_at, updated_at)
SELECT
  ws.org_id,
  to_jsonb(ws.*) - 'id' - 'org_id' - 'created_at' - 'updated_at',
  ws.created_at,
  ws.updated_at
FROM workspace_settings ws
ON CONFLICT (org_id) DO NOTHING;

-- workspace_settings is intentionally NOT dropped or modified.


-- ════════════════════════════════════════════════════════════
-- PART D: Vendor catalog (global) — evolve existing table
-- ════════════════════════════════════════════════════════════

-- vendors table already exists from 009. Add missing columns.
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- RLS is already enabled with vendors_select (auth.uid() IS NOT NULL).
-- No INSERT/UPDATE/DELETE policies — this is a global catalog managed
-- exclusively via service role (admin seeding, import scripts).
COMMENT ON TABLE vendors IS
  'Global vendor catalog. Read-only for authenticated users. Writes are service-role only.';


-- ════════════════════════════════════════════════════════════
-- PART E: Org vendor layer — evolve existing table
-- ════════════════════════════════════════════════════════════

-- Make vendor_id nullable to allow custom (non-catalog) vendors
ALTER TABLE org_vendors ALTER COLUMN vendor_id DROP NOT NULL;

-- Add missing columns
ALTER TABLE org_vendors
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Composite index (single-column org_id index already exists from 009)
CREATE INDEX IF NOT EXISTS idx_org_vendors_org_id_created_at
  ON org_vendors(org_id, created_at);

-- Replace RLS policies to use is_member_of() per security rules
DROP POLICY IF EXISTS "org_vendors_select" ON org_vendors;
DROP POLICY IF EXISTS "org_vendors_insert" ON org_vendors;
DROP POLICY IF EXISTS "org_vendors_update" ON org_vendors;

CREATE POLICY "org_vendors_select" ON org_vendors FOR SELECT
  USING (is_member_of(org_id));

CREATE POLICY "org_vendors_insert" ON org_vendors FOR INSERT
  WITH CHECK (is_member_of(org_id));

CREATE POLICY "org_vendors_update" ON org_vendors FOR UPDATE
  USING (is_member_of(org_id));

-- No DELETE policy.


-- ════════════════════════════════════════════════════════════
-- PART F: Cost model engine — enums + evolve existing tables
-- ════════════════════════════════════════════════════════════

-- F1. Create ENUMs (idempotent)

DO $$ BEGIN
  CREATE TYPE billing_basis AS ENUM (
    'per_user', 'per_device', 'per_domain', 'per_location',
    'per_org', 'flat_monthly', 'usage', 'tiered'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_cadence AS ENUM ('monthly', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- F2. cost_models — add org_id, billing_basis, cadence, created_by, updated_by

ALTER TABLE cost_models
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- billing_basis and cadence with defaults so existing rows (if any) get values
ALTER TABLE cost_models
  ADD COLUMN IF NOT EXISTS billing_basis billing_basis DEFAULT 'per_user',
  ADD COLUMN IF NOT EXISTS cadence billing_cadence DEFAULT 'monthly';

-- Backfill org_id from parent org_vendor (if any rows exist)
UPDATE cost_models
SET org_id = (
  SELECT ov.org_id FROM org_vendors ov WHERE ov.id = cost_models.org_vendor_id
)
WHERE org_id IS NULL;

-- Set NOT NULL constraints now that backfill is done
ALTER TABLE cost_models ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE cost_models ALTER COLUMN billing_basis SET NOT NULL;
ALTER TABLE cost_models ALTER COLUMN cadence SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cost_models_org_id
  ON cost_models(org_id);

CREATE INDEX IF NOT EXISTS idx_cost_models_org_id_created_at
  ON cost_models(org_id, created_at);

-- Replace RLS policies to use direct org_id (simpler than nested join)
DROP POLICY IF EXISTS "cost_models_select" ON cost_models;
DROP POLICY IF EXISTS "cost_models_insert" ON cost_models;
DROP POLICY IF EXISTS "cost_models_update" ON cost_models;

CREATE POLICY "cost_models_select" ON cost_models FOR SELECT
  USING (is_member_of(org_id));

CREATE POLICY "cost_models_insert" ON cost_models FOR INSERT
  WITH CHECK (is_member_of(org_id));

CREATE POLICY "cost_models_update" ON cost_models FOR UPDATE
  USING (is_member_of(org_id));

-- No DELETE policy.


-- F3. cost_model_tiers — add spec columns alongside existing ones
-- Existing columns (min_qty, max_qty, unit_cost, flat_cost) from 009
-- are preserved. New columns follow the spec naming convention.
-- Application code should use the new columns going forward.

ALTER TABLE cost_model_tiers
  ADD COLUMN IF NOT EXISTS min_value INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_value INTEGER,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC NOT NULL DEFAULT 0;

-- Replace RLS policies to use simpler subquery via cost_models.org_id
DROP POLICY IF EXISTS "cost_model_tiers_select" ON cost_model_tiers;
DROP POLICY IF EXISTS "cost_model_tiers_insert" ON cost_model_tiers;

CREATE POLICY "cost_model_tiers_select" ON cost_model_tiers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM cost_models cm
    WHERE cm.id = cost_model_id
      AND is_member_of(cm.org_id)
  ));

CREATE POLICY "cost_model_tiers_insert" ON cost_model_tiers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM cost_models cm
    WHERE cm.id = cost_model_id
      AND is_member_of(cm.org_id)
  ));

DROP POLICY IF EXISTS "cost_model_tiers_update" ON cost_model_tiers;
CREATE POLICY "cost_model_tiers_update" ON cost_model_tiers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM cost_models cm
    WHERE cm.id = cost_model_id
      AND is_member_of(cm.org_id)
  ));

-- No DELETE policy.


-- F4. org_vendor_discounts — add value column
-- Existing columns (percent_off, flat_off, valid_from, valid_until,
-- notes) from 009 are preserved. The new `value` column is the
-- canonical discount amount going forward.

ALTER TABLE org_vendor_discounts
  ADD COLUMN IF NOT EXISTS value NUMERIC CHECK (value > 0);

-- Replace RLS policies to use is_member_of()
DROP POLICY IF EXISTS "org_vendor_discounts_select" ON org_vendor_discounts;
DROP POLICY IF EXISTS "org_vendor_discounts_insert" ON org_vendor_discounts;

CREATE POLICY "org_vendor_discounts_select" ON org_vendor_discounts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM org_vendors ov
    WHERE ov.id = org_vendor_id
      AND is_member_of(ov.org_id)
  ));

CREATE POLICY "org_vendor_discounts_insert" ON org_vendor_discounts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM org_vendors ov
    WHERE ov.id = org_vendor_id
      AND is_member_of(ov.org_id)
  ));

DROP POLICY IF EXISTS "org_vendor_discounts_update" ON org_vendor_discounts;
CREATE POLICY "org_vendor_discounts_update" ON org_vendor_discounts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM org_vendors ov
    WHERE ov.id = org_vendor_id
      AND is_member_of(ov.org_id)
  ));

-- No DELETE policy.
