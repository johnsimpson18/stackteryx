-- ============================================================
-- 018 — Vendor Import Tracking
--
-- Adds a vendor_imports table to track spreadsheet import
-- sessions with their raw extraction data and status.
-- ============================================================

-- ── Import status enum ──────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'discarded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── vendor_imports table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_imports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id),
  filename      TEXT NOT NULL,
  status        import_status NOT NULL DEFAULT 'pending',
  raw_extraction JSONB,
  import_summary JSONB,
  error_message TEXT,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendor_imports_org_id ON vendor_imports(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_imports_status ON vendor_imports(status);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE vendor_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vi_select" ON vendor_imports;
CREATE POLICY "vi_select" ON vendor_imports FOR SELECT
  USING (is_member_of(org_id));

DROP POLICY IF EXISTS "vi_insert" ON vendor_imports;
CREATE POLICY "vi_insert" ON vendor_imports FOR INSERT
  WITH CHECK (is_member_of(org_id));

DROP POLICY IF EXISTS "vi_update" ON vendor_imports;
CREATE POLICY "vi_update" ON vendor_imports FOR UPDATE
  USING (is_member_of(org_id));
