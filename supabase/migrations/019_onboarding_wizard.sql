-- Migration 019: Onboarding wizard data model
-- Adds onboarding profile columns to org_settings and creates
-- onboarding_tool_selections table for tracking tool picks + pricing.

-- ── New columns on org_settings ─────────────────────────────────────────────

-- Company profile (Step 1)
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS company_size        text;
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS primary_geographies text[];
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS founder_name        text;
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS founder_title       text;

-- Client profile (Step 2)
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS target_verticals    text[];
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS client_sizes        text[];
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS buyer_personas      text[];

-- Services (Step 3)
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS services_offered    text[];
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS services_custom     text[];

-- Business model (Step 6)
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS sales_model         text;
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS delivery_models     text[];
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS sales_team_type     text;

-- Targets (Step 7)
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS target_margin_pct   integer;
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS compliance_targets  text[];
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS additional_context  text;

-- Onboarding state
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS onboarding_step          integer   DEFAULT 1;
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS onboarding_complete      boolean   DEFAULT false;
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS onboarding_completed_at  timestamptz;
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS bundles_generated        boolean   DEFAULT false;


-- ── onboarding_tool_selections table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_tool_selections (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  tool_name       text        NOT NULL,
  vendor_name     text,
  category        text        NOT NULL,
  is_custom       boolean     DEFAULT false,
  billing_basis   billing_basis,
  cost_amount     numeric(10,4),
  sell_amount     numeric(10,4),
  min_commitment  numeric(10,2),
  min_units       integer,
  pricing_entered boolean     DEFAULT false,
  created_at      timestamptz DEFAULT now(),

  UNIQUE(org_id, tool_name)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tool_selections_org
  ON onboarding_tool_selections(org_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE onboarding_tool_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ots_select" ON onboarding_tool_selections FOR SELECT
  USING (is_member_of(org_id));

CREATE POLICY "ots_insert" ON onboarding_tool_selections FOR INSERT
  WITH CHECK (is_member_of(org_id));

CREATE POLICY "ots_update" ON onboarding_tool_selections FOR UPDATE
  USING (is_member_of(org_id))
  WITH CHECK (is_member_of(org_id));

CREATE POLICY "ots_delete" ON onboarding_tool_selections FOR DELETE
  USING (is_member_of(org_id));
