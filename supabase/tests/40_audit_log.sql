-- ============================================================
-- 40_audit_log.sql — audit_log append-only verification
--
-- Verifies:
--   1. UPDATE on audit_log raises an exception
--   2. DELETE on audit_log raises an exception
--   3. INSERT still works
--   4. Immutability triggers exist with correct names
--   5. Audit triggers fire on tool mutation
--
-- Requires: 00_setup.sql has been run.
-- ============================================================

BEGIN;

-- ── Test 1: UPDATE on audit_log raises exception ────────────

DO $$
DECLARE
  v_caught BOOLEAN := false;
  v_target_id UUID;
BEGIN
  RAISE NOTICE 'Test 1: UPDATE on audit_log should raise exception';

  -- Find any audit_log row to attempt update
  SELECT id INTO v_target_id FROM audit_log LIMIT 1;

  IF v_target_id IS NULL THEN
    -- Insert a row so we have something to try updating
    INSERT INTO audit_log (user_id, org_id, action, entity_type, created_at)
    VALUES (
      'aaaaaaaa-0000-0000-0000-000000000002',
      'aaaaaaaa-0000-0000-0000-000000000001',
      'tool_created',
      'test',
      now()
    )
    RETURNING id INTO v_target_id;
  END IF;

  BEGIN
    UPDATE audit_log SET entity_type = 'tampered' WHERE id = v_target_id;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%append-only%' THEN
      v_caught := true;
      RAISE NOTICE 'PASS: UPDATE blocked: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'FAIL: Unexpected error on UPDATE: %', SQLERRM;
    END IF;
  END;

  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: UPDATE on audit_log did not raise an exception';
  END IF;
END $$;


-- ── Test 2: DELETE on audit_log raises exception ────────────

DO $$
DECLARE
  v_caught BOOLEAN := false;
  v_target_id UUID;
BEGIN
  RAISE NOTICE 'Test 2: DELETE on audit_log should raise exception';

  SELECT id INTO v_target_id FROM audit_log LIMIT 1;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: No audit_log rows to test DELETE against';
  END IF;

  BEGIN
    DELETE FROM audit_log WHERE id = v_target_id;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%append-only%' THEN
      v_caught := true;
      RAISE NOTICE 'PASS: DELETE blocked: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'FAIL: Unexpected error on DELETE: %', SQLERRM;
    END IF;
  END;

  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: DELETE on audit_log did not raise an exception';
  END IF;
END $$;


-- ── Test 3: INSERT still works ──────────────────────────────

DO $$
DECLARE
  v_id UUID;
BEGIN
  RAISE NOTICE 'Test 3: INSERT into audit_log should succeed';

  INSERT INTO audit_log (user_id, org_id, action, entity_type, created_at)
  VALUES (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'tool_created',
    'test_insert',
    now()
  )
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: INSERT returned NULL id';
  END IF;

  RAISE NOTICE 'PASS: INSERT succeeded with id %', v_id;
END $$;


-- ── Test 4: Immutability triggers exist ─────────────────────

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE 'Test 4: Immutability triggers exist on audit_log';

  SELECT count(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'audit_log'::regclass
    AND t.tgname IN ('audit_log_no_update', 'audit_log_no_delete')
    AND p.proname = 'audit_log_immutability_guard';

  IF v_count != 2 THEN
    RAISE EXCEPTION 'FAIL: Expected 2 immutability triggers, found %', v_count;
  END IF;

  RAISE NOTICE 'PASS: Both audit_log immutability triggers present';
END $$;


-- ── Test 5: Audit trigger fires on tool update ──────────────

DO $$
DECLARE
  v_count_before INTEGER;
  v_count_after  INTEGER;
BEGIN
  RAISE NOTICE 'Test 5: Audit trigger fires when tools table is updated';

  SELECT count(*) INTO v_count_before
  FROM audit_log
  WHERE table_name = 'tools'
    AND entity_id = 'eeeeeeee-0000-0000-0000-000000000001';

  UPDATE tools SET name = 'Tool A EDR (updated)'
  WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';

  SELECT count(*) INTO v_count_after
  FROM audit_log
  WHERE table_name = 'tools'
    AND entity_id = 'eeeeeeee-0000-0000-0000-000000000001';

  IF v_count_after <= v_count_before THEN
    RAISE EXCEPTION 'FAIL: No new audit_log entry after tool update (before=%, after=%)',
      v_count_before, v_count_after;
  END IF;

  RAISE NOTICE 'PASS: Audit trigger wrote entry (% → % rows)', v_count_before, v_count_after;
END $$;


ROLLBACK;
