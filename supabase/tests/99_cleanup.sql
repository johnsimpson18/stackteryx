-- ============================================================
-- 99_cleanup.sql — Removes data seeded by 00_setup.sql
--
-- Deletes in reverse FK order using the fixed UUIDs.
-- Uses DELETE WHERE id = ... — does not use TRUNCATE.
-- ============================================================

-- Quotes (no FK dependents)
DELETE FROM quotes WHERE id IN (
  '33333333-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000002'
);

-- Bundle version tools
DELETE FROM bundle_version_tools WHERE id IN (
  '22222222-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002'
);

-- Bundle versions
DELETE FROM bundle_versions WHERE id IN (
  '11111111-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000002'
);

-- Bundles
DELETE FROM bundles WHERE id IN (
  'ffffffff-0000-0000-0000-000000000001',
  'ffffffff-0000-0000-0000-000000000002'
);

-- Tools
DELETE FROM tools WHERE id IN (
  'eeeeeeee-0000-0000-0000-000000000001',
  'eeeeeeee-0000-0000-0000-000000000002'
);

-- Clients
DELETE FROM clients WHERE id IN (
  'dddddddd-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000002'
);

-- Org vendors
DELETE FROM org_vendors WHERE id IN (
  'cccccccc-0000-0000-0000-000000000002',
  'cccccccc-0000-0000-0000-000000000003'
);

-- Global vendor
DELETE FROM vendors WHERE id = 'cccccccc-0000-0000-0000-000000000001';

-- Org settings
DELETE FROM org_settings WHERE org_id IN (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001'
);

-- Workspace settings
DELETE FROM workspace_settings WHERE id IN (
  '44444444-0000-0000-0000-000000000001',
  '44444444-0000-0000-0000-000000000002'
);

-- Org members
DELETE FROM org_members WHERE user_id IN (
  'aaaaaaaa-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000002'
);

-- Profiles (may have been auto-created by handle_new_user trigger)
DELETE FROM profiles WHERE id IN (
  'aaaaaaaa-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000002'
);

-- Auth users
DELETE FROM auth.users WHERE id IN (
  'aaaaaaaa-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000002'
);

-- Orgs (CASCADE would handle children, but we deleted them above)
DELETE FROM orgs WHERE id IN (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001'
);

-- Clean up any audit_log entries created by triggers on seeded data
-- (audit_log has immutability trigger, but DELETE is blocked — these
--  entries will persist as an artifact. This is by design.)

DO $$ BEGIN RAISE NOTICE 'Cleanup complete.'; END $$;
