-- Service Tier Packaging: tables, indexes, and RLS policies

-- ── tier_packages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tier_packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text DEFAULT '',
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by  uuid REFERENCES auth.users(id),
  updated_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tier_packages_org_id ON tier_packages(org_id);
CREATE INDEX IF NOT EXISTS idx_tier_packages_status ON tier_packages(status);

ALTER TABLE tier_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tier_packages_org_read" ON tier_packages
  FOR SELECT USING (
    org_id IN (
      SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "tier_packages_org_insert" ON tier_packages
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "tier_packages_org_update" ON tier_packages
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "tier_packages_org_delete" ON tier_packages
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
    )
  );

-- ── tier_package_items ───────────────────────────────────────────────────────
-- Each row links a tier within a package to a specific service (bundle).
-- The tier_label is a user-facing name like "Essential", "Professional", "Enterprise".
CREATE TABLE IF NOT EXISTS tier_package_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      uuid NOT NULL REFERENCES tier_packages(id) ON DELETE CASCADE,
  bundle_id       uuid NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  tier_label      text NOT NULL,
  sort_order      int NOT NULL DEFAULT 0,
  highlight       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, bundle_id)
);

CREATE INDEX IF NOT EXISTS idx_tier_package_items_package_id ON tier_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_tier_package_items_bundle_id ON tier_package_items(bundle_id);

ALTER TABLE tier_package_items ENABLE ROW LEVEL SECURITY;

-- RLS via parent tier_packages org ownership
CREATE POLICY "tier_package_items_read" ON tier_package_items
  FOR SELECT USING (
    package_id IN (
      SELECT tp.id FROM tier_packages tp
      JOIN org_members om ON om.org_id = tp.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "tier_package_items_insert" ON tier_package_items
  FOR INSERT WITH CHECK (
    package_id IN (
      SELECT tp.id FROM tier_packages tp
      JOIN org_members om ON om.org_id = tp.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "tier_package_items_update" ON tier_package_items
  FOR UPDATE USING (
    package_id IN (
      SELECT tp.id FROM tier_packages tp
      JOIN org_members om ON om.org_id = tp.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "tier_package_items_delete" ON tier_package_items
  FOR DELETE USING (
    package_id IN (
      SELECT tp.id FROM tier_packages tp
      JOIN org_members om ON om.org_id = tp.org_id
      WHERE om.user_id = auth.uid()
    )
  );

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_tier_packages_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tier_packages_updated_at
  BEFORE UPDATE ON tier_packages
  FOR EACH ROW EXECUTE FUNCTION update_tier_packages_updated_at();

CREATE OR REPLACE FUNCTION update_tier_package_items_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tier_package_items_updated_at
  BEFORE UPDATE ON tier_package_items
  FOR EACH ROW EXECUTE FUNCTION update_tier_package_items_updated_at();
