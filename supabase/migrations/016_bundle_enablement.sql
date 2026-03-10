-- ============================================================
-- 016 — Bundle Enablement
--
-- AI-generated sales enablement content for bundle versions.
-- One enablement package per bundle version, editable after
-- generation.
--
-- All changes are additive. No tables or columns are dropped.
-- ============================================================


-- ── Table ─────────────────────────────────────────────────────

CREATE TABLE bundle_enablement (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID        NOT NULL REFERENCES orgs(id),
  bundle_version_id  UUID        NOT NULL REFERENCES bundle_versions(id),
  service_overview   TEXT,
  whats_included     TEXT,
  talking_points     TEXT,
  pricing_narrative  TEXT,
  why_us             TEXT,
  generated_at       TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         UUID        REFERENCES auth.users(id),

  CONSTRAINT bundle_enablement_version_unique UNIQUE(bundle_version_id)
);


-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX idx_bundle_enablement_org_id
  ON bundle_enablement(org_id);

CREATE INDEX idx_bundle_enablement_bundle_version_id
  ON bundle_enablement(bundle_version_id);

CREATE INDEX idx_bundle_enablement_org_id_updated_at
  ON bundle_enablement(org_id, updated_at);


-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE bundle_enablement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundle_enablement_select" ON bundle_enablement FOR SELECT
  USING (is_member_of(org_id));

CREATE POLICY "bundle_enablement_insert" ON bundle_enablement FOR INSERT
  WITH CHECK (is_member_of(org_id));

CREATE POLICY "bundle_enablement_update" ON bundle_enablement FOR UPDATE
  USING (is_member_of(org_id));

-- No DELETE policy.


-- ── Updated-at trigger ────────────────────────────────────────

CREATE TRIGGER bundle_enablement_updated_at
  BEFORE UPDATE ON bundle_enablement
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Comments ──────────────────────────────────────────────────

COMMENT ON TABLE bundle_enablement IS
  'AI-generated sales enablement content for a specific bundle version. Content is editable after generation. One record per bundle_version.';

COMMENT ON COLUMN bundle_enablement.service_overview IS
  'Non-technical overview of the service — what it is, what problem it solves, who it is for.';

COMMENT ON COLUMN bundle_enablement.whats_included IS
  'Plain-english breakdown of each tool and why it is included.';

COMMENT ON COLUMN bundle_enablement.talking_points IS
  'Bullet points a sales rep can use before and during client calls.';

COMMENT ON COLUMN bundle_enablement.pricing_narrative IS
  'How to talk about price — anchoring language and value framing. Does not include specific dollar amounts.';

COMMENT ON COLUMN bundle_enablement.why_us IS
  'Why this MSP delivery of this stack is better than the alternative.';

COMMENT ON COLUMN bundle_enablement.generated_at IS
  'Timestamp of last AI generation. Null if content was written manually.';
