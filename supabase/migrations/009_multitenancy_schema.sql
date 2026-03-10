-- ============================================================
-- 009 — Multi-Tenancy Schema
-- Adds orgs, org_members, org_id columns, RLS helper functions,
-- new org-scoped RLS policies, and vendor/cost model tables.
-- ============================================================

-- ── 1. Enums ──────────────────────────────────────────────────

CREATE TYPE org_role AS ENUM ('org_owner', 'admin', 'member', 'viewer');

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'org_created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'org_updated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'org_member_added';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'org_member_removed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'org_member_role_changed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'org_switched';

-- ── 2. Orgs table ─────────────────────────────────────────────

CREATE TABLE orgs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_orgs
  BEFORE UPDATE ON orgs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. Org members table ──────────────────────────────────────

CREATE TABLE org_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       org_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_org_members_user_id ON org_members(user_id, org_id);
CREATE INDEX idx_org_members_org_id ON org_members(org_id);

CREATE TRIGGER set_updated_at_org_members
  BEFORE UPDATE ON org_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. Add active_org_id to profiles ──────────────────────────

ALTER TABLE profiles
  ADD COLUMN active_org_id UUID REFERENCES orgs(id);

-- ── 5. Add nullable org_id to existing tables ─────────────────

ALTER TABLE workspace_settings ADD COLUMN org_id UUID REFERENCES orgs(id);
ALTER TABLE tools              ADD COLUMN org_id UUID REFERENCES orgs(id);
ALTER TABLE bundles            ADD COLUMN org_id UUID REFERENCES orgs(id);
ALTER TABLE clients            ADD COLUMN org_id UUID REFERENCES orgs(id);
ALTER TABLE approvals          ADD COLUMN org_id UUID REFERENCES orgs(id);
ALTER TABLE scenarios          ADD COLUMN org_id UUID REFERENCES orgs(id);
ALTER TABLE recommendation_history ADD COLUMN org_id UUID REFERENCES orgs(id);
ALTER TABLE audit_log          ADD COLUMN org_id UUID REFERENCES orgs(id);
ALTER TABLE entitlements       ADD COLUMN org_id UUID REFERENCES orgs(id);

-- ── 6. Indexes on org_id columns ──────────────────────────────

CREATE INDEX idx_workspace_settings_org_id ON workspace_settings(org_id);
CREATE INDEX idx_tools_org_id              ON tools(org_id);
CREATE INDEX idx_bundles_org_id            ON bundles(org_id);
CREATE INDEX idx_clients_org_id            ON clients(org_id);
CREATE INDEX idx_approvals_org_id          ON approvals(org_id);
CREATE INDEX idx_scenarios_org_id          ON scenarios(org_id);
CREATE INDEX idx_recommendation_history_org_id ON recommendation_history(org_id);
CREATE INDEX idx_audit_log_org_id          ON audit_log(org_id);
CREATE INDEX idx_entitlements_org_id       ON entitlements(org_id);

-- ── 7. RLS helper functions ───────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_member_of(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = _org_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION has_org_role(_org_id UUID, _roles org_role[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = _org_id AND user_id = auth.uid() AND role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION is_member_via_bundle(_bundle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bundles b
    JOIN org_members om ON om.org_id = b.org_id
    WHERE b.id = _bundle_id AND om.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_member_via_client(_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients c
    JOIN org_members om ON om.org_id = c.org_id
    WHERE c.id = _client_id AND om.user_id = auth.uid()
  );
$$;

-- ── 8. Drop ALL existing RLS policies ─────────────────────────

-- profiles
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- workspace_settings
DROP POLICY IF EXISTS "Authenticated can read settings" ON workspace_settings;
DROP POLICY IF EXISTS "Owner can update settings" ON workspace_settings;
DROP POLICY IF EXISTS "Authenticated can update settings" ON workspace_settings;
DROP POLICY IF EXISTS "Authenticated can insert settings" ON workspace_settings;

-- tools
DROP POLICY IF EXISTS "Authenticated can read tools" ON tools;
DROP POLICY IF EXISTS "Non-viewer can manage tools" ON tools;

-- audit_log
DROP POLICY IF EXISTS "Authenticated can read audit log" ON audit_log;
DROP POLICY IF EXISTS "Authenticated can insert audit log" ON audit_log;

-- bundles
DROP POLICY IF EXISTS "Authenticated can read bundles" ON bundles;
DROP POLICY IF EXISTS "Non-viewer can manage bundles" ON bundles;

-- bundle_versions
DROP POLICY IF EXISTS "Authenticated can read versions" ON bundle_versions;
DROP POLICY IF EXISTS "Non-viewer can create versions" ON bundle_versions;

-- bundle_version_tools
DROP POLICY IF EXISTS "Authenticated can read version tools" ON bundle_version_tools;
DROP POLICY IF EXISTS "Non-viewer can create version tools" ON bundle_version_tools;

-- clients
DROP POLICY IF EXISTS "Authenticated can read clients" ON clients;
DROP POLICY IF EXISTS "Non-viewer can manage clients" ON clients;

-- client_contracts
DROP POLICY IF EXISTS "Authenticated can read contracts" ON client_contracts;
DROP POLICY IF EXISTS "Non-viewer can manage contracts" ON client_contracts;

-- approvals
DROP POLICY IF EXISTS "Authenticated can read approvals" ON approvals;
DROP POLICY IF EXISTS "Non-viewer can request approvals" ON approvals;
DROP POLICY IF EXISTS "Owner and finance can review approvals" ON approvals;

-- scenarios
DROP POLICY IF EXISTS "Authenticated can read scenarios" ON scenarios;
DROP POLICY IF EXISTS "Non-viewer can manage scenarios" ON scenarios;

-- recommendation_history
DROP POLICY IF EXISTS "Authenticated can read recommendation history" ON recommendation_history;
DROP POLICY IF EXISTS "Authenticated can insert recommendation history" ON recommendation_history;

-- ── 9. New org-scoped RLS policies ────────────────────────────

-- profiles: members of same org can read; users can update own profile
CREATE POLICY "org_profiles_select" ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "org_profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- orgs: members can read their orgs; authenticated can insert (create new org)
CREATE POLICY "org_orgs_select" ON orgs FOR SELECT
  USING (is_member_of(id));

CREATE POLICY "org_orgs_insert" ON orgs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "org_orgs_update" ON orgs FOR UPDATE
  USING (has_org_role(id, ARRAY['org_owner'::org_role, 'admin'::org_role]));

-- org_members: members can read their org's members; org_owner/admin can manage
CREATE POLICY "org_members_select" ON org_members FOR SELECT
  USING (is_member_of(org_id));

CREATE POLICY "org_members_insert" ON org_members FOR INSERT
  WITH CHECK (
    has_org_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role])
    OR (user_id = auth.uid()) -- allow self-insert when creating org
  );

CREATE POLICY "org_members_update" ON org_members FOR UPDATE
  USING (has_org_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role]));

CREATE POLICY "org_members_delete" ON org_members FOR DELETE
  USING (has_org_role(org_id, ARRAY['org_owner'::org_role, 'admin'::org_role]));

-- workspace_settings: org members can read; org_owner/admin can manage
CREATE POLICY "org_ws_select" ON workspace_settings FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_ws_insert" ON workspace_settings FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_ws_update" ON workspace_settings FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));

-- tools: org members can read; org members can manage
CREATE POLICY "org_tools_select" ON tools FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_tools_insert" ON tools FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_tools_update" ON tools FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));

-- bundles: org members can read/manage
CREATE POLICY "org_bundles_select" ON bundles FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_bundles_insert" ON bundles FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_bundles_update" ON bundles FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));

-- bundle_versions: scoped via parent bundle
CREATE POLICY "org_bv_select" ON bundle_versions FOR SELECT
  USING (is_member_via_bundle(bundle_id));

CREATE POLICY "org_bv_insert" ON bundle_versions FOR INSERT
  WITH CHECK (is_member_via_bundle(bundle_id));

-- bundle_version_tools: scoped via parent bundle_version -> bundle
CREATE POLICY "org_bvt_select" ON bundle_version_tools FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bundle_versions bv
    WHERE bv.id = bundle_version_id AND is_member_via_bundle(bv.bundle_id)
  ));

CREATE POLICY "org_bvt_insert" ON bundle_version_tools FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM bundle_versions bv
    WHERE bv.id = bundle_version_id AND is_member_via_bundle(bv.bundle_id)
  ));

-- clients: org members can read/manage
CREATE POLICY "org_clients_select" ON clients FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_clients_insert" ON clients FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_clients_update" ON clients FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));

-- client_contracts: scoped via parent client
CREATE POLICY "org_cc_select" ON client_contracts FOR SELECT
  USING (is_member_via_client(client_id));

CREATE POLICY "org_cc_insert" ON client_contracts FOR INSERT
  WITH CHECK (is_member_via_client(client_id));

CREATE POLICY "org_cc_update" ON client_contracts FOR UPDATE
  USING (is_member_via_client(client_id));

-- approvals: org members can read/manage
CREATE POLICY "org_approvals_select" ON approvals FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_approvals_insert" ON approvals FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_approvals_update" ON approvals FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));

-- scenarios: org-scoped via org_id
CREATE POLICY "org_scenarios_select" ON scenarios FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_scenarios_insert" ON scenarios FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_scenarios_update" ON scenarios FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_scenarios_delete" ON scenarios FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()));

-- recommendation_history: org members can read/insert
CREATE POLICY "org_rh_select" ON recommendation_history FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_rh_insert" ON recommendation_history FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

-- audit_log: org members can read/insert
CREATE POLICY "org_audit_select" ON audit_log FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_audit_insert" ON audit_log FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

-- entitlements: org members can read
CREATE POLICY "org_entitlements_select" ON entitlements FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

-- ── 10. Global vendor catalog ─────────────────────────────────

CREATE TABLE vendors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  website     TEXT,
  logo_url    TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_select" ON vendors FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── 11. Org-scoped vendor/cost tables ─────────────────────────

CREATE TABLE org_vendors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  vendor_id  UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, vendor_id)
);

ALTER TABLE org_vendors ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_org_vendors_org_id ON org_vendors(org_id);

CREATE TRIGGER set_updated_at_org_vendors
  BEFORE UPDATE ON org_vendors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "org_vendors_select" ON org_vendors FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_vendors_insert" ON org_vendors FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_vendors_update" ON org_vendors FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));

-- cost_models
CREATE TABLE cost_models (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_vendor_id UUID NOT NULL REFERENCES org_vendors(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  pricing_model TEXT NOT NULL DEFAULT 'per_seat',
  base_cost     NUMERIC(12,4) NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cost_models ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cost_models_org_vendor_id ON cost_models(org_vendor_id);

CREATE TRIGGER set_updated_at_cost_models
  BEFORE UPDATE ON cost_models
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "cost_models_select" ON cost_models FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM org_vendors ov
    WHERE ov.id = org_vendor_id AND ov.org_id IN (SELECT get_user_org_ids())
  ));

CREATE POLICY "cost_models_insert" ON cost_models FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM org_vendors ov
    WHERE ov.id = org_vendor_id AND ov.org_id IN (SELECT get_user_org_ids())
  ));

CREATE POLICY "cost_models_update" ON cost_models FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM org_vendors ov
    WHERE ov.id = org_vendor_id AND ov.org_id IN (SELECT get_user_org_ids())
  ));

-- cost_model_tiers
CREATE TABLE cost_model_tiers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_model_id UUID NOT NULL REFERENCES cost_models(id) ON DELETE CASCADE,
  min_qty       INTEGER NOT NULL DEFAULT 0,
  max_qty       INTEGER,
  unit_cost     NUMERIC(12,4) NOT NULL DEFAULT 0,
  flat_cost     NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cost_model_tiers ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cost_model_tiers_cost_model_id ON cost_model_tiers(cost_model_id);

CREATE TRIGGER set_updated_at_cost_model_tiers
  BEFORE UPDATE ON cost_model_tiers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "cost_model_tiers_select" ON cost_model_tiers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM cost_models cm
    JOIN org_vendors ov ON ov.id = cm.org_vendor_id
    WHERE cm.id = cost_model_id AND ov.org_id IN (SELECT get_user_org_ids())
  ));

CREATE POLICY "cost_model_tiers_insert" ON cost_model_tiers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM cost_models cm
    JOIN org_vendors ov ON ov.id = cm.org_vendor_id
    WHERE cm.id = cost_model_id AND ov.org_id IN (SELECT get_user_org_ids())
  ));

-- org_vendor_discounts
CREATE TABLE org_vendor_discounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_vendor_id UUID NOT NULL REFERENCES org_vendors(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  percent_off   NUMERIC(5,4) DEFAULT 0,
  flat_off      NUMERIC(12,4) DEFAULT 0,
  valid_from    DATE,
  valid_until   DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE org_vendor_discounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_org_vendor_discounts_org_vendor_id ON org_vendor_discounts(org_vendor_id);

CREATE TRIGGER set_updated_at_org_vendor_discounts
  BEFORE UPDATE ON org_vendor_discounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "org_vendor_discounts_select" ON org_vendor_discounts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM org_vendors ov
    WHERE ov.id = org_vendor_id AND ov.org_id IN (SELECT get_user_org_ids())
  ));

CREATE POLICY "org_vendor_discounts_insert" ON org_vendor_discounts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM org_vendors ov
    WHERE ov.id = org_vendor_id AND ov.org_id IN (SELECT get_user_org_ids())
  ));

-- labor_models
CREATE TABLE labor_models (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  hourly_rate   NUMERIC(10,4) NOT NULL DEFAULT 0,
  setup_hours   NUMERIC(10,2) NOT NULL DEFAULT 0,
  monthly_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE labor_models ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_labor_models_org_id ON labor_models(org_id);

CREATE TRIGGER set_updated_at_labor_models
  BEFORE UPDATE ON labor_models
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "labor_models_select" ON labor_models FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "labor_models_insert" ON labor_models FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "labor_models_update" ON labor_models FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));
