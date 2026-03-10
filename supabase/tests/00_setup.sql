-- ============================================================
-- 00_setup.sql — Seed data for security verification tests
--
-- Run 99_cleanup.sql to remove this seed data.
--
-- This file is NOT wrapped in a rollback — data persists for
-- manual inspection. All inserts use ON CONFLICT DO NOTHING
-- for idempotent re-runs.
-- ============================================================

-- ── Fixed UUIDs ─────────────────────────────────────────────
-- Orgs
--   org_a  = aaaaaaaa-0000-0000-0000-000000000001
--   org_b  = bbbbbbbb-0000-0000-0000-000000000001
-- Users (auth.users + profiles)
--   user_a = aaaaaaaa-0000-0000-0000-000000000002  → member of org_a
--   user_b = bbbbbbbb-0000-0000-0000-000000000002  → member of org_b
-- Vendor (global)
--   vendor = cccccccc-0000-0000-0000-000000000001
-- Org vendors
--   org_vendor_a = cccccccc-0000-0000-0000-000000000002
--   org_vendor_b = cccccccc-0000-0000-0000-000000000003
-- Clients
--   client_a = dddddddd-0000-0000-0000-000000000001
--   client_b = dddddddd-0000-0000-0000-000000000002
-- Tools
--   tool_a = eeeeeeee-0000-0000-0000-000000000001
--   tool_b = eeeeeeee-0000-0000-0000-000000000002
-- Bundles
--   bundle_a = ffffffff-0000-0000-0000-000000000001
--   bundle_b = ffffffff-0000-0000-0000-000000000002
-- Bundle versions
--   bv_a = 11111111-0000-0000-0000-000000000001
--   bv_b = 11111111-0000-0000-0000-000000000002
-- Quotes
--   quote_a = 33333333-0000-0000-0000-000000000001
--   quote_b = 33333333-0000-0000-0000-000000000002
-- Workspace settings
--   ws_a = 44444444-0000-0000-0000-000000000001
--   ws_b = 44444444-0000-0000-0000-000000000002


-- ── 1. Orgs ─────────────────────────────────────────────────

INSERT INTO orgs (id, name, slug)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Test Org A', 'test-org-a'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Test Org B', 'test-org-b')
ON CONFLICT (id) DO NOTHING;


-- ── 2. Auth users ───────────────────────────────────────────
-- The handle_new_user() trigger auto-creates profiles.

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_a@stackteryx-test.local',
    '$2a$10$PznUGzql8LuGYIj1GIWan.xbT56dOxE7MKDEBvkUZ/GKQRwKfqlci',
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"display_name": "User A"}'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_b@stackteryx-test.local',
    '$2a$10$PznUGzql8LuGYIj1GIWan.xbT56dOxE7MKDEBvkUZ/GKQRwKfqlci',
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"display_name": "User B"}'
  )
ON CONFLICT (id) DO NOTHING;


-- ── 3. Org members ──────────────────────────────────────────

INSERT INTO org_members (org_id, user_id, role)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'member'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'member')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Set active org on profiles
UPDATE profiles SET active_org_id = 'aaaaaaaa-0000-0000-0000-000000000001'
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000002' AND active_org_id IS NULL;

UPDATE profiles SET active_org_id = 'bbbbbbbb-0000-0000-0000-000000000001'
WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002' AND active_org_id IS NULL;


-- ── 4. Global vendor ────────────────────────────────────────

INSERT INTO vendors (id, name)
VALUES ('cccccccc-0000-0000-0000-000000000001', 'Test Vendor Global')
ON CONFLICT (id) DO NOTHING;


-- ── 5. Org vendors ──────────────────────────────────────────

INSERT INTO org_vendors (id, org_id, vendor_id, display_name)
VALUES
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001', 'Vendor for Org A'),
  ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001', 'Vendor for Org B')
ON CONFLICT (id) DO NOTHING;


-- ── 6. Clients ──────────────────────────────────────────────

INSERT INTO clients (id, org_id, name, industry, contact_name, contact_email, status)
VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Client A', 'finance', 'Alice', 'alice@test.local', 'active'),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Client B', 'healthcare', 'Bob', 'bob@test.local', 'active')
ON CONFLICT (id) DO NOTHING;


-- ── 7. Tools ────────────────────────────────────────────────

INSERT INTO tools (id, org_id, name, vendor, category, is_active)
VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Tool A EDR', 'VendorA', 'edr', true),
  ('eeeeeeee-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Tool B SIEM', 'VendorB', 'siem', true)
ON CONFLICT (id) DO NOTHING;


-- ── 8. Bundles + bundle_versions ────────────────────────────

INSERT INTO bundles (id, org_id, name, bundle_type, status, created_by)
VALUES
  ('ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Bundle A', 'custom', 'active', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('ffffffff-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Bundle B', 'custom', 'active', 'bbbbbbbb-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bundle_versions (
  id, bundle_id, version_number, seat_count, risk_tier,
  contract_term_months, target_margin_pct, overhead_pct, labor_pct, discount_pct,
  created_by
)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001',
   1, 30, 'medium', 12, 0.30, 0.10, 0.15, 0.00,
   'aaaaaaaa-0000-0000-0000-000000000002'),
  ('11111111-0000-0000-0000-000000000002', 'ffffffff-0000-0000-0000-000000000002',
   1, 30, 'medium', 12, 0.30, 0.10, 0.15, 0.00,
   'bbbbbbbb-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bundle_version_tools (id, bundle_version_id, tool_id, quantity_multiplier)
VALUES
  ('22222222-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 1.0),
  ('22222222-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000002', 1.0)
ON CONFLICT (id) DO NOTHING;


-- ── 9. Quotes ───────────────────────────────────────────────

INSERT INTO quotes (id, org_id, client_id, bundle_version_id, customer_inputs, snapshot, created_by)
VALUES
  ('33333333-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   '{}',
   '{"cost": 0, "price": 0, "margin": 0, "line_items": []}',
   'aaaaaaaa-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000002',
   '{}',
   '{"cost": 0, "price": 0, "margin": 0, "line_items": []}',
   'bbbbbbbb-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;


-- ── 10. Workspace settings (for org_settings backfill test) ─

INSERT INTO workspace_settings (id, org_id, workspace_name,
  default_target_margin_pct, default_overhead_pct, default_labor_pct,
  red_zone_margin_pct, max_discount_no_approval_pct)
VALUES
  ('44444444-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Org A Workspace', 0.35, 0.12, 0.18, 0.15, 0.10),
  ('44444444-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Org B Workspace', 0.30, 0.10, 0.15, 0.15, 0.10)
ON CONFLICT DO NOTHING;

-- Also seed org_settings from the workspace_settings we just inserted
INSERT INTO org_settings (org_id, settings, created_at, updated_at)
SELECT
  ws.org_id,
  to_jsonb(ws.*) - 'id' - 'org_id' - 'created_at' - 'updated_at',
  ws.created_at,
  ws.updated_at
FROM workspace_settings ws
WHERE ws.org_id IN (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001'
)
ON CONFLICT (org_id) DO NOTHING;


DO $$ BEGIN RAISE NOTICE 'Setup complete. Run 99_cleanup.sql to remove seed data.'; END $$;
