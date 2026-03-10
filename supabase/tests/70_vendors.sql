-- ============================================================
-- 70_vendors.sql — Vendor catalog visibility verification
--
-- Verifies:
--   1. Any authenticated user can SELECT from vendors
--   2. No authenticated user can INSERT into vendors (RLS blocks)
--   3. No authenticated user can UPDATE vendors (RLS blocks)
--   4. No authenticated user can DELETE from vendors (RLS blocks)
--   5. Only a SELECT policy exists on vendors
--
-- Requires: 00_setup.sql has been run.
-- ============================================================

BEGIN;

-- ── Test 1: Authenticated user CAN select vendors ───────────

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE 'Test 1: Authenticated user can SELECT from vendors';

  -- Switch to authenticated role as user_a
  EXECUTE 'SET LOCAL "request.jwt.claims" TO '
    || quote_literal('{"sub": "aaaaaaaa-0000-0000-0000-000000000002", "role": "authenticated"}');
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO v_count FROM vendors;

  EXECUTE 'RESET ROLE';

  -- Should see at least the seeded vendor
  IF v_count < 1 THEN
    RAISE EXCEPTION 'FAIL: Expected >= 1 vendor row, got %', v_count;
  END IF;

  RAISE NOTICE 'PASS: Authenticated user sees % vendor row(s)', v_count;
END $$;


-- ── Test 2: Authenticated user CANNOT insert vendor ─────────

DO $$
DECLARE
  v_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE 'Test 2: Authenticated user cannot INSERT into vendors';

  EXECUTE 'SET LOCAL "request.jwt.claims" TO '
    || quote_literal('{"sub": "aaaaaaaa-0000-0000-0000-000000000002", "role": "authenticated"}');
  EXECUTE 'SET LOCAL ROLE authenticated';

  BEGIN
    INSERT INTO vendors (name) VALUES ('Rogue Vendor');
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    RAISE NOTICE 'PASS: INSERT blocked: %', SQLERRM;
  END;

  EXECUTE 'RESET ROLE';

  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: Authenticated user was able to INSERT into vendors';
  END IF;
END $$;


-- ── Test 3: Authenticated user CANNOT update vendor ─────────

DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  RAISE NOTICE 'Test 3: Authenticated user cannot UPDATE vendors';

  EXECUTE 'SET LOCAL "request.jwt.claims" TO '
    || quote_literal('{"sub": "aaaaaaaa-0000-0000-0000-000000000002", "role": "authenticated"}');
  EXECUTE 'SET LOCAL ROLE authenticated';

  UPDATE vendors SET name = 'Hijacked' WHERE id = 'cccccccc-0000-0000-0000-000000000001';
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  EXECUTE 'RESET ROLE';

  IF v_updated > 0 THEN
    RAISE EXCEPTION 'FAIL: UPDATE succeeded on % row(s)', v_updated;
  END IF;

  RAISE NOTICE 'PASS: UPDATE affected 0 rows (silently filtered by RLS)';
END $$;


-- ── Test 4: Authenticated user CANNOT delete vendor ─────────

DO $$
DECLARE
  v_deleted INTEGER;
BEGIN
  RAISE NOTICE 'Test 4: Authenticated user cannot DELETE from vendors';

  EXECUTE 'SET LOCAL "request.jwt.claims" TO '
    || quote_literal('{"sub": "aaaaaaaa-0000-0000-0000-000000000002", "role": "authenticated"}');
  EXECUTE 'SET LOCAL ROLE authenticated';

  DELETE FROM vendors WHERE id = 'cccccccc-0000-0000-0000-000000000001';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  EXECUTE 'RESET ROLE';

  IF v_deleted > 0 THEN
    RAISE EXCEPTION 'FAIL: DELETE succeeded on % row(s)', v_deleted;
  END IF;

  RAISE NOTICE 'PASS: DELETE affected 0 rows (silently filtered by RLS)';
END $$;


-- ── Test 5: Only SELECT policy exists on vendors ────────────

DO $$
DECLARE
  v_policies TEXT;
BEGIN
  RAISE NOTICE 'Test 5: vendors should only have a SELECT policy';

  SELECT string_agg(cmd, ', ' ORDER BY cmd)
  INTO v_policies
  FROM pg_policies
  WHERE tablename = 'vendors' AND schemaname = 'public';

  IF v_policies IS DISTINCT FROM 'SELECT' THEN
    RAISE EXCEPTION 'FAIL: Expected only "SELECT" policy, got "%"', v_policies;
  END IF;

  RAISE NOTICE 'PASS: vendors has exactly one policy: %', v_policies;
END $$;


ROLLBACK;
