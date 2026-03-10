-- ============================================================
-- 015 — Security Hardening (idempotent safety net)
--
-- All primitives below already exist from migrations 013–014.
-- This migration re-applies them idempotently as belt-and-suspenders
-- and adds COMMENT ON TABLE documentation for security-critical tables.
--
-- Tables reviewed (all 23 have RLS enabled):
--   profiles, workspace_settings, org_settings, tools, bundles,
--   bundle_versions, bundle_version_tools, clients, client_contracts,
--   approvals, scenarios, recommendation_history, audit_log,
--   entitlements, vendors, org_vendors, cost_models, cost_model_tiers,
--   org_vendor_discounts, labor_models, quotes, orgs, org_members
--
-- All changes are additive. No tables or columns are dropped.
-- ============================================================


-- ── 1. audit_log append-only (idempotent) ───────────────────
-- These triggers already exist from migration 014. Re-creating
-- here guarantees they survive if 014 is ever rolled back.

CREATE OR REPLACE FUNCTION audit_log_immutability_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'audit_log is append-only — UPDATE and DELETE are not permitted';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutability_guard();

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutability_guard();


-- ── 2. quotes immutability (idempotent) ─────────────────────
-- These triggers already exist from migration 013. Re-creating
-- here for the same safety-net reason.

CREATE OR REPLACE FUNCTION quotes_immutability_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'quotes are immutable — UPDATE and DELETE are not permitted on this table';
END;
$$;

DROP TRIGGER IF EXISTS quotes_no_update ON quotes;
CREATE TRIGGER quotes_no_update
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_immutability_guard();

DROP TRIGGER IF EXISTS quotes_no_delete ON quotes;
CREATE TRIGGER quotes_no_delete
  BEFORE DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_immutability_guard();


-- ── 3. vendors SELECT-only (verify) ─────────────────────────
-- The vendors_select policy already exists from migration 009.
-- No INSERT/UPDATE/DELETE policies exist by design (service-role only).
-- This DO block verifies the policy exists and logs a notice.

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'vendors' AND policyname = 'vendors_select';

  IF v_count = 0 THEN
    -- Re-create if somehow missing
    EXECUTE 'CREATE POLICY "vendors_select" ON vendors FOR SELECT USING (auth.uid() IS NOT NULL)';
    RAISE NOTICE 'vendors_select policy was missing — re-created';
  ELSE
    RAISE NOTICE 'vendors_select policy confirmed present';
  END IF;
END $$;


-- ── 4. Security documentation ───────────────────────────────
-- COMMENT ON TABLE documents the security design for each table.

COMMENT ON TABLE audit_log IS
  'Append-only audit trail. Immutability enforced by BEFORE UPDATE/DELETE triggers. No UPDATE/DELETE RLS policies.';

COMMENT ON TABLE quotes IS
  'Immutable quote snapshots. UPDATE/DELETE blocked by BEFORE triggers. RLS: SELECT + INSERT only via is_member_of(org_id).';

COMMENT ON TABLE vendors IS
  'Global vendor catalog. Read-only for authenticated users (vendors_select policy). Writes are service-role only — no INSERT/UPDATE/DELETE policies.';

COMMENT ON TABLE entitlements IS
  'Org entitlements. Write access is service-role only — no RLS write policies by design. SELECT via org_id membership.';

COMMENT ON TABLE profiles IS
  'User profiles spanning all orgs. Not org-scoped. SELECT for any authenticated user; UPDATE restricted to own profile.';

COMMENT ON TABLE org_settings IS
  'Per-org JSONB settings. RLS via is_member_of(org_id). Backfilled from workspace_settings.';
