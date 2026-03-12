-- Compliance Framework Mapping: tables, indexes, and RLS policies

CREATE TABLE IF NOT EXISTS org_compliance_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  framework_id text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, framework_id)
);

CREATE TABLE IF NOT EXISTS client_compliance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  framework_id text NOT NULL,
  controls_total int NOT NULL DEFAULT 0,
  controls_satisfied int NOT NULL DEFAULT 0,
  controls_partial int NOT NULL DEFAULT 0,
  controls_gap int NOT NULL DEFAULT 0,
  controls_manual int NOT NULL DEFAULT 0,
  score_pct numeric(5,2) NOT NULL DEFAULT 0,
  score_unweighted_pct numeric(5,2),
  domain_scores jsonb,
  gap_details jsonb,
  suggested_services jsonb,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(client_id, framework_id)
);

ALTER TABLE org_compliance_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_compliance_scores ENABLE ROW LEVEL SECURITY;

-- RLS via org_members (idempotent: drop then create)
DROP POLICY IF EXISTS "oct_org_read" ON org_compliance_targets;
CREATE POLICY "oct_org_read" ON org_compliance_targets
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "oct_org_insert" ON org_compliance_targets;
CREATE POLICY "oct_org_insert" ON org_compliance_targets
  FOR INSERT WITH CHECK (
    org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "oct_org_update" ON org_compliance_targets;
CREATE POLICY "oct_org_update" ON org_compliance_targets
  FOR UPDATE USING (
    org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "oct_org_delete" ON org_compliance_targets;
CREATE POLICY "oct_org_delete" ON org_compliance_targets
  FOR DELETE USING (
    org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "ccs_org_read" ON client_compliance_scores;
CREATE POLICY "ccs_org_read" ON client_compliance_scores
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "ccs_org_insert" ON client_compliance_scores;
CREATE POLICY "ccs_org_insert" ON client_compliance_scores
  FOR INSERT WITH CHECK (
    org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "ccs_org_update" ON client_compliance_scores;
CREATE POLICY "ccs_org_update" ON client_compliance_scores
  FOR UPDATE USING (
    org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "ccs_org_delete" ON client_compliance_scores;
CREATE POLICY "ccs_org_delete" ON client_compliance_scores
  FOR DELETE USING (
    org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_client_compliance_scores_client_id ON client_compliance_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_client_compliance_scores_org_id ON client_compliance_scores(org_id);
CREATE INDEX IF NOT EXISTS idx_org_compliance_targets_org_id ON org_compliance_targets(org_id);
