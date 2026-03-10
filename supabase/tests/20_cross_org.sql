-- ============================================================
-- 20_cross_org.sql — Cross-org isolation verification
--
-- All tests run as user_a (member of org_a only).
-- Verifies user_a can see org_a data and CANNOT see org_b data.
--
-- Requires: 00_setup.sql has been run.
-- ============================================================

BEGIN;

-- ── Set JWT context: user_a ─────────────────────────────────
SET LOCAL "request.jwt.claims" TO
  '{"sub": "aaaaaaaa-0000-0000-0000-000000000002", "role": "authenticated"}';
SET LOCAL ROLE authenticated;


-- ── Test 1: user_a CAN see own org_a client ─────────────────

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE 'Test 1: user_a can SELECT own org_a client';

  SELECT count(*) INTO v_count
  FROM clients
  WHERE id = 'dddddddd-0000-0000-0000-000000000001';

  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL: Expected 1 client row for org_a, got %', v_count;
  END IF;

  RAISE NOTICE 'PASS: user_a sees 1 client row in org_a';
END $$;


-- ── Test 2: user_a CANNOT see org_b client ──────────────────

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE 'Test 2: user_a cannot SELECT org_b client';

  SELECT count(*) INTO v_count
  FROM clients
  WHERE id = 'dddddddd-0000-0000-0000-000000000002';

  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL: user_a can see org_b client (got % rows)', v_count;
  END IF;

  RAISE NOTICE 'PASS: 0 org_b client rows visible to user_a';
END $$;


-- ── Test 3: user_a CANNOT see org_b org_vendor ──────────────

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE 'Test 3: user_a cannot SELECT org_b org_vendor';

  SELECT count(*) INTO v_count
  FROM org_vendors
  WHERE id = 'cccccccc-0000-0000-0000-000000000003';

  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL: user_a can see org_b org_vendor (got % rows)', v_count;
  END IF;

  RAISE NOTICE 'PASS: 0 org_b org_vendor rows visible to user_a';
END $$;


-- ── Test 4: user_a CANNOT see org_b quote ───────────────────

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE 'Test 4: user_a cannot SELECT org_b quote';

  SELECT count(*) INTO v_count
  FROM quotes
  WHERE id = '33333333-0000-0000-0000-000000000002';

  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL: user_a can see org_b quote (got % rows)', v_count;
  END IF;

  RAISE NOTICE 'PASS: 0 org_b quote rows visible to user_a';
END $$;


-- ── Test 5: user_a CANNOT insert into org_b ─────────────────

DO $$
DECLARE
  v_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE 'Test 5: user_a cannot INSERT client into org_b';

  BEGIN
    INSERT INTO clients (org_id, name, industry, contact_name, contact_email, status)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000001',
            'Sneaky Client', 'tech', 'Eve', 'eve@evil.local', 'active');
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    RAISE NOTICE 'PASS: INSERT into org_b blocked: %', SQLERRM;
  END;

  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: user_a was able to INSERT a client into org_b';
  END IF;
END $$;


RESET ROLE;
ROLLBACK;
