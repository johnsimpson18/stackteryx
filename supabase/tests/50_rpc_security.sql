-- ============================================================
-- 50_rpc_security.sql — RPC function security verification
--
-- Verifies:
--   1. NULL bundle_version_id raises exception
--   2. NULL customer_inputs raises exception
--   3. Nonexistent bundle_version_id raises exception
--   4. Cross-org access is denied (user_b calling on org_a bundle)
--   5. Valid call succeeds for authorized user
--
-- Requires: 00_setup.sql has been run.
-- ============================================================

BEGIN;

-- ── Test 1: NULL bundle_version_id → exception ──────────────

DO $$
DECLARE
  v_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE 'Test 1: NULL p_bundle_version_id should raise exception';

  BEGIN
    PERFORM calculate_bundle_margin(NULL, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%p_bundle_version_id is required%' THEN
      v_caught := true;
      RAISE NOTICE 'PASS: Correct error: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'FAIL: Wrong error message: %', SQLERRM;
    END IF;
  END;

  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: NULL bundle_version_id did not raise an exception';
  END IF;
END $$;


-- ── Test 2: NULL customer_inputs → exception ────────────────

DO $$
DECLARE
  v_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE 'Test 2: NULL p_customer_inputs should raise exception';

  BEGIN
    PERFORM calculate_bundle_margin(gen_random_uuid(), NULL);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%p_customer_inputs is required%' THEN
      v_caught := true;
      RAISE NOTICE 'PASS: Correct error: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'FAIL: Wrong error message: %', SQLERRM;
    END IF;
  END;

  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: NULL customer_inputs did not raise an exception';
  END IF;
END $$;


-- ── Test 3: Nonexistent bundle_version_id → exception ───────

DO $$
DECLARE
  v_caught BOOLEAN := false;
  v_fake_id UUID := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
BEGIN
  RAISE NOTICE 'Test 3: Nonexistent bundle_version_id should raise exception';

  BEGIN
    PERFORM calculate_bundle_margin(v_fake_id, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%bundle_version not found%' THEN
      v_caught := true;
      RAISE NOTICE 'PASS: Correct error: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'FAIL: Wrong error message: %', SQLERRM;
    END IF;
  END;

  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: Nonexistent ID did not raise an exception';
  END IF;
END $$;


-- ── Test 4: Cross-org access denied ─────────────────────────
-- user_b tries to price org_a's bundle_version

DO $$
DECLARE
  v_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE 'Test 4: user_b cannot call RPC on org_a bundle_version';

  -- Simulate user_b's JWT
  PERFORM set_config('request.jwt.claims',
    '{"sub": "bbbbbbbb-0000-0000-0000-000000000002", "role": "authenticated"}',
    true);

  BEGIN
    -- bv_a belongs to org_a; user_b is member of org_b only
    PERFORM calculate_bundle_margin(
      '11111111-0000-0000-0000-000000000001',
      '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%access denied%' THEN
      v_caught := true;
      RAISE NOTICE 'PASS: Access denied for cross-org call: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'FAIL: Wrong error message: %', SQLERRM;
    END IF;
  END;

  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: Cross-org RPC call did not raise access denied';
  END IF;
END $$;


-- ── Test 5: Valid call succeeds for authorized user ─────────

DO $$
DECLARE
  v_result JSONB;
BEGIN
  RAISE NOTICE 'Test 5: Authorized user can call RPC successfully';

  -- Simulate user_a's JWT
  PERFORM set_config('request.jwt.claims',
    '{"sub": "aaaaaaaa-0000-0000-0000-000000000002", "role": "authenticated"}',
    true);

  -- bv_a belongs to org_a; user_a is member of org_a
  SELECT calculate_bundle_margin(
    '11111111-0000-0000-0000-000000000001',
    '{}'::jsonb
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'FAIL: RPC returned NULL';
  END IF;

  IF NOT (v_result ? 'cost' AND v_result ? 'price' AND v_result ? 'margin' AND v_result ? 'line_items') THEN
    RAISE EXCEPTION 'FAIL: Result missing expected keys. Got: %', v_result;
  END IF;

  RAISE NOTICE 'PASS: RPC returned valid result: %', v_result;
END $$;


ROLLBACK;
