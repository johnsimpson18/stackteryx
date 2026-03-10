-- ============================================================
-- 30_quotes_immutability.sql — Quotes append-only verification
--
-- Verifies:
--   1. UPDATE on quotes raises an exception
--   2. DELETE on quotes raises an exception
--   3. INSERT still works (as org member)
--   4. Only SELECT + INSERT RLS policies exist
--
-- Requires: 00_setup.sql has been run.
-- ============================================================

BEGIN;

-- ── Test 1: UPDATE on quotes raises exception ───────────────

DO $$
DECLARE
  v_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE 'Test 1: UPDATE on quotes should raise exception';

  BEGIN
    UPDATE quotes
    SET snapshot = '{"tampered": true}'
    WHERE id = '33333333-0000-0000-0000-000000000001';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%immutable%' THEN
      v_caught := true;
      RAISE NOTICE 'PASS: UPDATE blocked: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'FAIL: Unexpected error on UPDATE: %', SQLERRM;
    END IF;
  END;

  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: UPDATE on quotes did not raise an exception';
  END IF;
END $$;


-- ── Test 2: DELETE on quotes raises exception ───────────────

DO $$
DECLARE
  v_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE 'Test 2: DELETE on quotes should raise exception';

  BEGIN
    DELETE FROM quotes
    WHERE id = '33333333-0000-0000-0000-000000000001';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%immutable%' THEN
      v_caught := true;
      RAISE NOTICE 'PASS: DELETE blocked: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'FAIL: Unexpected error on DELETE: %', SQLERRM;
    END IF;
  END;

  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: DELETE on quotes did not raise an exception';
  END IF;
END $$;


-- ── Test 3: INSERT still works (as org member) ──────────────

DO $$
DECLARE
  v_id UUID;
BEGIN
  RAISE NOTICE 'Test 3: INSERT into quotes should succeed (as superuser/service role)';

  INSERT INTO quotes (org_id, client_id, bundle_version_id, customer_inputs, snapshot, created_by)
  VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'dddddddd-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    '{"test": true}',
    '{"cost": 100, "price": 100, "margin": 0, "line_items": []}',
    'aaaaaaaa-0000-0000-0000-000000000002'
  )
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: INSERT into quotes returned NULL id';
  END IF;

  RAISE NOTICE 'PASS: INSERT succeeded with id %', v_id;
END $$;


-- ── Test 4: Only SELECT + INSERT policies exist ─────────────

DO $$
DECLARE
  v_policies TEXT;
BEGIN
  RAISE NOTICE 'Test 4: quotes should only have SELECT + INSERT policies';

  SELECT string_agg(cmd, ', ' ORDER BY cmd)
  INTO v_policies
  FROM pg_policies
  WHERE tablename = 'quotes' AND schemaname = 'public';

  IF v_policies IS DISTINCT FROM 'INSERT, SELECT' THEN
    RAISE EXCEPTION 'FAIL: Expected "INSERT, SELECT" policies, got "%"', v_policies;
  END IF;

  RAISE NOTICE 'PASS: quotes policies are exactly: %', v_policies;
END $$;


ROLLBACK;
