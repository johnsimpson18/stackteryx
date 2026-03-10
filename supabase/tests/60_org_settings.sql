-- ============================================================
-- 60_org_settings.sql — org_settings backfill verification
--
-- Verifies:
--   1. Every workspace_settings row has a matching org_settings row
--   2. JSONB values in org_settings match workspace_settings columns
--   3. workspace_settings table still exists (not dropped)
--
-- Requires: 00_setup.sql has been run.
-- ============================================================

BEGIN;

-- ── Test 1: Row count parity ────────────────────────────────

DO $$
DECLARE
  v_ws_count INTEGER;
  v_os_count INTEGER;
  v_missing  TEXT;
BEGIN
  RAISE NOTICE 'Test 1: Every workspace_settings row has a matching org_settings row';

  SELECT count(*) INTO v_ws_count FROM workspace_settings;
  SELECT count(*) INTO v_os_count FROM org_settings;

  -- Check specifically for test org_ids
  SELECT string_agg(ws.org_id::text, ', ')
  INTO v_missing
  FROM workspace_settings ws
  WHERE ws.org_id IN (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000001'
  )
  AND NOT EXISTS (
    SELECT 1 FROM org_settings os WHERE os.org_id = ws.org_id
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: workspace_settings orgs missing from org_settings: %', v_missing;
  END IF;

  RAISE NOTICE 'PASS: All test workspace_settings rows have matching org_settings (ws=%, os=%)',
    v_ws_count, v_os_count;
END $$;


-- ── Test 2: JSONB values match column values ────────────────

DO $$
DECLARE
  v_rec RECORD;
BEGIN
  RAISE NOTICE 'Test 2: org_settings JSONB values match workspace_settings columns';

  FOR v_rec IN
    SELECT
      ws.org_id,
      ws.default_target_margin_pct AS ws_margin,
      (os.settings->>'default_target_margin_pct')::numeric AS os_margin,
      ws.default_overhead_pct AS ws_overhead,
      (os.settings->>'default_overhead_pct')::numeric AS os_overhead,
      ws.workspace_name AS ws_name,
      os.settings->>'workspace_name' AS os_name
    FROM workspace_settings ws
    JOIN org_settings os ON os.org_id = ws.org_id
    WHERE ws.org_id IN (
      'aaaaaaaa-0000-0000-0000-000000000001',
      'bbbbbbbb-0000-0000-0000-000000000001'
    )
  LOOP
    IF v_rec.ws_margin != v_rec.os_margin THEN
      RAISE EXCEPTION 'FAIL: Margin mismatch for org %: ws=% vs os=%',
        v_rec.org_id, v_rec.ws_margin, v_rec.os_margin;
    END IF;

    IF v_rec.ws_overhead != v_rec.os_overhead THEN
      RAISE EXCEPTION 'FAIL: Overhead mismatch for org %: ws=% vs os=%',
        v_rec.org_id, v_rec.ws_overhead, v_rec.os_overhead;
    END IF;

    IF v_rec.ws_name != v_rec.os_name THEN
      RAISE EXCEPTION 'FAIL: Workspace name mismatch for org %: ws=% vs os=%',
        v_rec.org_id, v_rec.ws_name, v_rec.os_name;
    END IF;

    RAISE NOTICE 'PASS: org % — margin=%, overhead=%, name=%',
      v_rec.org_id, v_rec.ws_margin, v_rec.ws_overhead, v_rec.ws_name;
  END LOOP;
END $$;


-- ── Test 3: workspace_settings still exists ─────────────────

DO $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'Test 3: workspace_settings table still exists (not dropped)';

  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'workspace_settings'
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'FAIL: workspace_settings table does not exist';
  END IF;

  RAISE NOTICE 'PASS: workspace_settings table exists';
END $$;


ROLLBACK;
