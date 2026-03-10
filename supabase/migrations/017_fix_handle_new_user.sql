-- ============================================================
-- 017 — Fix handle_new_user() trigger
--
-- Two issues:
-- 1. Missing SET search_path — the function is called from the
--    auth schema trigger context, so "profiles" can't be resolved
--    without an explicit search_path.
-- 2. New users get a profile but no org or org_membership, so
--    the app breaks on requireOrgMembership() / getActiveOrgId().
--
-- Fix: rewrite handle_new_user() to:
--   a) Create the profile row
--   b) Create a personal org for the user
--   c) Create an org_member row (as org_owner)
--   d) Set active_org_id on the profile
--
-- Also add an INSERT policy on profiles as a safety net.
-- ============================================================

-- ── 1. Add INSERT policy on profiles ─────────────────────────
-- The trigger is SECURITY DEFINER (runs as postgres/superuser),
-- so RLS is bypassed. But adding the policy is belt-and-suspenders
-- in case the function ownership changes.

DROP POLICY IF EXISTS "org_profiles_insert" ON profiles;
CREATE POLICY "org_profiles_insert" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ── 2. Rewrite handle_new_user() ─────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- a) Create profile
  INSERT INTO profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    'viewer'::user_role
  );

  -- b) Create a personal org
  INSERT INTO orgs (name, slug, created_by)
  VALUES (
    'My Organization',
    'org-' || substr(NEW.id::text, 1, 8),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- c) Add user as org_owner
  INSERT INTO org_members (org_id, user_id, role, invited_by)
  VALUES (
    new_org_id,
    NEW.id,
    'org_owner'::org_role,
    NEW.id
  );

  -- d) Set active_org_id
  UPDATE profiles
  SET active_org_id = new_org_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
