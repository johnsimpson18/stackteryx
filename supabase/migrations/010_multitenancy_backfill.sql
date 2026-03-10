-- ============================================================
-- 010 — Multi-Tenancy Backfill
-- Creates default org, maps users, backfills org_id, adds
-- NOT NULL constraints, and updates the new-user trigger.
-- ============================================================

-- ── 1. Create default org ─────────────────────────────────────

INSERT INTO orgs (id, name, slug, created_by)
SELECT
  gen_random_uuid(),
  'Default Organization',
  'default',
  (SELECT id FROM profiles ORDER BY created_at LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM orgs WHERE slug = 'default');

-- ── 2. Insert all active profiles as org_members ──────────────

INSERT INTO org_members (org_id, user_id, role)
SELECT
  (SELECT id FROM orgs WHERE slug = 'default'),
  p.id,
  CASE p.role
    WHEN 'owner'   THEN 'org_owner'::org_role
    WHEN 'finance'  THEN 'admin'::org_role
    WHEN 'sales'    THEN 'member'::org_role
    WHEN 'viewer'   THEN 'viewer'::org_role
    ELSE 'member'::org_role
  END
FROM profiles p
WHERE p.is_active = true
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ── 3. Set active_org_id for all profiles ─────────────────────

UPDATE profiles
SET active_org_id = (SELECT id FROM orgs WHERE slug = 'default')
WHERE active_org_id IS NULL;

-- ── 4. Backfill org_id on all tables ──────────────────────────

UPDATE workspace_settings
SET org_id = (SELECT id FROM orgs WHERE slug = 'default')
WHERE org_id IS NULL;

UPDATE tools
SET org_id = (SELECT id FROM orgs WHERE slug = 'default')
WHERE org_id IS NULL;

UPDATE bundles
SET org_id = (SELECT id FROM orgs WHERE slug = 'default')
WHERE org_id IS NULL;

UPDATE clients
SET org_id = (SELECT id FROM orgs WHERE slug = 'default')
WHERE org_id IS NULL;

UPDATE approvals
SET org_id = (SELECT id FROM orgs WHERE slug = 'default')
WHERE org_id IS NULL;

UPDATE scenarios
SET org_id = (SELECT id FROM orgs WHERE slug = 'default')
WHERE org_id IS NULL;

UPDATE recommendation_history
SET org_id = (SELECT id FROM orgs WHERE slug = 'default')
WHERE org_id IS NULL;

UPDATE audit_log
SET org_id = (SELECT id FROM orgs WHERE slug = 'default')
WHERE org_id IS NULL;

UPDATE entitlements
SET org_id = (SELECT id FROM orgs WHERE slug = 'default')
WHERE org_id IS NULL;

-- ── 5. Set NOT NULL constraints ───────────────────────────────

ALTER TABLE workspace_settings ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE tools              ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE bundles            ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE clients            ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE approvals          ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE scenarios          ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE recommendation_history ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE audit_log          ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE entitlements       ALTER COLUMN org_id SET NOT NULL;

-- ── 6. Add UNIQUE constraint on workspace_settings(org_id) ────

ALTER TABLE workspace_settings
  ADD CONSTRAINT workspace_settings_org_id_unique UNIQUE (org_id);

-- ── 7. Update handle_new_user() trigger ───────────────────────
-- No longer assigns role — roles now live in org_members.
-- Still creates a profile row for auth continuity.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    'viewer'::user_role  -- deprecated column, kept for backwards compat
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
