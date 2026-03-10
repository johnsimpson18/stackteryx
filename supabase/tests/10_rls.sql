-- ============================================================
-- 10_rls.sql — RLS deny-by-default verification
--
-- Verifies:
--   1. RLS is enabled on every org-owned table
--   2. No policy grants broad access without an org check
--      (except vendors, which is a global catalog by design)
--   3. Every RLS-enabled table has at least one policy
--      (tables with zero policies are deny-all — verified
--       against an intentional allowlist)
-- ============================================================

BEGIN;

-- ── Test 1: RLS enabled on all org-owned tables ─────────────

DO $$
DECLARE
  v_missing TEXT;
  v_org_tables TEXT[] := ARRAY[
    'workspace_settings', 'org_settings', 'tools', 'bundles',
    'bundle_versions', 'bundle_version_tools', 'clients',
    'client_contracts', 'approvals', 'scenarios',
    'recommendation_history', 'audit_log', 'entitlements',
    'vendors', 'org_vendors', 'cost_models', 'cost_model_tiers',
    'org_vendor_discounts', 'labor_models', 'quotes',
    'orgs', 'org_members', 'profiles'
  ];
BEGIN
  RAISE NOTICE 'Test 1: RLS enabled on all org-owned tables';

  SELECT string_agg(t.tablename, ', ')
  INTO v_missing
  FROM unnest(v_org_tables) AS t(tablename)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = t.tablename
      AND c.relrowsecurity = true
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on: %', v_missing;
  END IF;

  RAISE NOTICE 'PASS: RLS enabled on all 23 tables';
END $$;


-- ── Test 2: No broad "all authenticated" policies on org tables ──

DO $$
DECLARE
  v_violations TEXT;
BEGIN
  RAISE NOTICE 'Test 2: No broad authenticated-only policies on org tables';

  -- Find SELECT policies that use auth.role() = authenticated or
  -- auth.uid() IS NOT NULL, but EXCLUDE vendors (intentional global catalog)
  SELECT string_agg(tablename || '.' || policyname, ', ')
  INTO v_violations
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename != 'vendors'
    AND tablename != 'profiles'  -- profiles SELECT is intentionally auth-only
    AND cmd = 'SELECT'
    AND (
      qual::text ILIKE '%auth.role()%=%authenticated%'
      OR (qual::text ILIKE '%auth.uid()%IS NOT NULL%'
          AND qual::text NOT ILIKE '%org_id%'
          AND qual::text NOT ILIKE '%is_member%'
          AND qual::text NOT ILIKE '%get_user_org_ids%')
    );

  IF v_violations IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: Broad authenticated-only policies found: %', v_violations;
  END IF;

  RAISE NOTICE 'PASS: No broad authenticated-only policies on org tables';
END $$;


-- ── Test 3: Every RLS-enabled table has at least one policy ──

DO $$
DECLARE
  v_no_policy TEXT;
  -- Tables that intentionally have zero write policies but do have
  -- read policies are fine. Tables with ZERO policies total would
  -- be completely inaccessible.
BEGIN
  RAISE NOTICE 'Test 3: Every RLS-enabled table has at least one policy';

  SELECT string_agg(c.relname, ', ')
  INTO v_no_policy
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.tablename = c.relname
        AND p.schemaname = 'public'
    );

  IF v_no_policy IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: Tables with RLS but zero policies (completely inaccessible): %', v_no_policy;
  END IF;

  RAISE NOTICE 'PASS: All RLS-enabled tables have at least one policy';
END $$;


ROLLBACK;
