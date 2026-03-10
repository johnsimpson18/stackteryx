-- Migration 020: service_outcomes table
-- Captures the Outcome Layer for each service (bundle).
-- One outcome record per bundle; required before a service can be published as Active.

CREATE TABLE IF NOT EXISTS service_outcomes (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id            uuid        NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  org_id               uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  outcome_type         text        NOT NULL,
  outcome_statement    text,
  target_vertical      text,
  target_persona       text,
  service_capabilities jsonb       DEFAULT '[]'::jsonb,
  ai_drafted           boolean     DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),

  UNIQUE(bundle_id)
);

CREATE INDEX IF NOT EXISTS idx_service_outcomes_org
  ON service_outcomes(org_id);

CREATE INDEX IF NOT EXISTS idx_service_outcomes_bundle
  ON service_outcomes(bundle_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE service_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "so_select" ON service_outcomes FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "so_insert" ON service_outcomes FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "so_update" ON service_outcomes FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "so_delete" ON service_outcomes FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()));
