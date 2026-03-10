-- ============================================================
-- 014 — Audit Log Triggers & Immutability
--
-- Adds missing columns to audit_log (table_name, before, after),
-- extends the audit_action enum for trigger-based actions,
-- creates a SECURITY DEFINER trigger function that writes to
-- audit_log on INSERT/UPDATE/DELETE, attaches it to five tables,
-- and enforces append-only immutability on audit_log via trigger.
--
-- All changes are additive. No tables or columns are dropped.
-- ============================================================


-- ── 1. Add missing columns to audit_log ─────────────────────
-- Existing columns: id, user_id, action (audit_action enum),
--   entity_type, entity_id, metadata, org_id, created_at
-- Adding: table_name, "before", "after"

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS table_name TEXT;

-- "before" and "after" are non-reserved keywords in PostgreSQL
-- but quoted for safety in ALTER TABLE context.
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS "before" JSONB;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS "after" JSONB;


-- ── 2. Extend audit_action enum with trigger actions ────────
-- TG_OP returns these exact uppercase values.

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'INSERT';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'UPDATE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'DELETE';


-- ── 3. Append-only immutability on audit_log ────────────────
-- No UPDATE or DELETE policies exist on audit_log (from 009).
-- This trigger is belt-and-suspenders: it catches mutations
-- even from service role, which bypasses RLS.

CREATE OR REPLACE FUNCTION audit_log_immutability_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'audit_log is append-only — UPDATE and DELETE are not permitted';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutability_guard();

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutability_guard();


-- ── 4. Audit trigger function ───────────────────────────────
--
-- SECURITY DEFINER rationale:
--   This function INSERTs into audit_log, which has RLS enabled.
--   The RLS INSERT policy (org_audit_insert from 009) checks
--   org_id IN (SELECT get_user_org_ids()), which depends on
--   auth.uid() returning a valid user ID. In contexts where
--   auth.uid() is NULL (service role operations, migrations,
--   background jobs), the INSERT would fail under SECURITY
--   INVOKER because the RLS policy would reject it. SECURITY
--   DEFINER runs as the function owner, bypassing RLS, so
--   audit entries are guaranteed to be written regardless of
--   the calling auth context.
--
--   auth.uid() still works inside SECURITY DEFINER — it reads
--   from the JWT session context, not from the effective user.
--   So user_id is correctly captured when a real user is present,
--   and NULL when operating under service role.

CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_before JSONB;
  v_after  JSONB;
  v_entity_id UUID;
BEGIN
  -- Resolve before / after snapshots
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_before := to_jsonb(OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_after := to_jsonb(NEW);
  END IF;

  -- Resolve org_id
  -- bundle_versions has no direct org_id; look it up via bundles.
  -- All other audited tables (tools, bundles, clients, quotes)
  -- have org_id directly on the row.
  IF TG_TABLE_NAME = 'bundle_versions' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT b.org_id INTO v_org_id
      FROM bundles b WHERE b.id = OLD.bundle_id;
    ELSE
      SELECT b.org_id INTO v_org_id
      FROM bundles b WHERE b.id = NEW.bundle_id;
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      v_org_id := OLD.org_id;
    ELSE
      v_org_id := NEW.org_id;
    END IF;
  END IF;

  -- Resolve entity_id (the row's primary key)
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
  ELSE
    v_entity_id := NEW.id;
  END IF;

  -- Write audit entry
  INSERT INTO audit_log (
    user_id, org_id, action, entity_type, entity_id,
    table_name, "before", "after", created_at
  ) VALUES (
    auth.uid(),
    v_org_id,
    TG_OP::audit_action,
    TG_TABLE_NAME,
    v_entity_id,
    TG_TABLE_NAME,
    v_before,
    v_after,
    now()
  );

  -- Return value is ignored for AFTER triggers but required syntactically
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


-- ── 5. Attach triggers to audited tables ────────────────────
-- AFTER triggers ensure the audit entry is only written when
-- the underlying operation succeeds.

DROP TRIGGER IF EXISTS audit_trigger_tools ON tools;
CREATE TRIGGER audit_trigger_tools
  AFTER INSERT OR UPDATE OR DELETE ON tools
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

DROP TRIGGER IF EXISTS audit_trigger_bundles ON bundles;
CREATE TRIGGER audit_trigger_bundles
  AFTER INSERT OR UPDATE OR DELETE ON bundles
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

DROP TRIGGER IF EXISTS audit_trigger_bundle_versions ON bundle_versions;
CREATE TRIGGER audit_trigger_bundle_versions
  AFTER INSERT OR UPDATE OR DELETE ON bundle_versions
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

DROP TRIGGER IF EXISTS audit_trigger_clients ON clients;
CREATE TRIGGER audit_trigger_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

DROP TRIGGER IF EXISTS audit_trigger_quotes ON quotes;
CREATE TRIGGER audit_trigger_quotes
  AFTER INSERT OR UPDATE OR DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- Note: The quotes table has an immutability trigger (013) that
-- blocks UPDATE and DELETE via BEFORE triggers. Since those
-- BEFORE triggers abort the operation, the AFTER audit trigger
-- will only ever fire for INSERT on quotes. This is correct
-- behavior — if the immutability guard is ever removed, the
-- audit trigger will automatically capture UPDATE/DELETE too.
