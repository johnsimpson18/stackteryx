-- ============================================================
-- 013 — Quote Snapshot System
--
-- Creates an immutable quotes table that stores point-in-time
-- snapshots of calculate_bundle_margin output. Enforces
-- immutability at the database layer via RLS (no UPDATE/DELETE
-- policies) and row-level triggers.
--
-- All changes are additive. No tables or columns are dropped.
-- ============================================================


-- ── Quotes table ────────────────────────────────────────────

CREATE TABLE quotes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES orgs(id),
  client_id         UUID        NOT NULL REFERENCES clients(id),
  bundle_version_id UUID        NOT NULL REFERENCES bundle_versions(id),
  customer_inputs   JSONB       NOT NULL,
  snapshot          JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID        REFERENCES auth.users(id)
);

COMMENT ON COLUMN quotes.snapshot IS
  'Immutable capture of calculate_bundle_margin output at quote creation time.
   Includes line_items, cost, price, and margin.';


-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX idx_quotes_org_id
  ON quotes(org_id);

CREATE INDEX idx_quotes_org_id_created_at
  ON quotes(org_id, created_at);

CREATE INDEX idx_quotes_client_id
  ON quotes(client_id);


-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_select" ON quotes FOR SELECT
  USING (is_member_of(org_id));

CREATE POLICY "quotes_insert" ON quotes FOR INSERT
  WITH CHECK (is_member_of(org_id));

-- No UPDATE policy — quotes are immutable.
-- No DELETE policy — quotes are immutable.


-- ── Immutability triggers ───────────────────────────────────

CREATE OR REPLACE FUNCTION quotes_immutability_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'quotes are immutable — UPDATE and DELETE are not permitted on this table';
END;
$$;

CREATE TRIGGER quotes_no_update
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_immutability_guard();

CREATE TRIGGER quotes_no_delete
  BEFORE DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_immutability_guard();
