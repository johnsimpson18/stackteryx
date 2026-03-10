-- Migration 021: proposals table
-- Stores AI-generated proposals from the Sales Studio.
-- Linked to clients (nullable for prospect proposals).

CREATE TABLE IF NOT EXISTS proposals (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  client_id          uuid        REFERENCES clients(id) ON DELETE SET NULL,
  prospect_name      text,
  prospect_industry  text,
  prospect_size      text,
  services_included  jsonb       DEFAULT '[]'::jsonb,
  content            jsonb       DEFAULT '{}'::jsonb,
  status             text        NOT NULL DEFAULT 'draft',
  exported_pdf_url   text,
  exported_docx_url  text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_org
  ON proposals(org_id);

CREATE INDEX IF NOT EXISTS idx_proposals_client
  ON proposals(client_id);

CREATE INDEX IF NOT EXISTS idx_proposals_status
  ON proposals(org_id, status);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select" ON proposals FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "proposals_insert" ON proposals FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "proposals_update" ON proposals FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "proposals_delete" ON proposals FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()));
