-- ============================================================
-- Migration 031: Additional Services
-- Consulting, retainers, and professional services that exist
-- independently AND compose into service packages.
-- ============================================================

CREATE TABLE IF NOT EXISTS additional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN (
    'consulting',
    'help_desk',
    'retainer',
    'training',
    'project',
    'compliance'
  )),
  billing_type text NOT NULL CHECK (billing_type IN (
    'monthly',
    'per_user',
    'per_device',
    'per_site',
    'hourly',
    'one_time'
  )),
  cost_type text NOT NULL DEFAULT 'internal_labor' CHECK (cost_type IN (
    'internal_labor',
    'subcontractor',
    'zero_cost'
  )),
  cost numeric(10,2) NOT NULL DEFAULT 0,
  cost_unit text,
  sell_price numeric(10,2) NOT NULL DEFAULT 0,
  sell_unit text,
  margin_pct numeric(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN sell_price = 0 THEN 0
      WHEN cost = 0 THEN 100
      ELSE ROUND(((sell_price - cost) / sell_price) * 100, 2)
    END
  ) STORED,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bundle_version_additional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_version_id uuid NOT NULL REFERENCES bundle_versions(id) ON DELETE CASCADE,
  additional_service_id uuid NOT NULL REFERENCES additional_services(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  cost_override numeric(10,2),
  sell_price_override numeric(10,2),
  quantity numeric(6,2) DEFAULT 1,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bundle_version_id, additional_service_id)
);

ALTER TABLE additional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_version_additional_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation" ON additional_services;
CREATE POLICY "org_isolation" ON additional_services
  USING (org_id = (SELECT active_org_id FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "org_isolation" ON bundle_version_additional_services;
CREATE POLICY "org_isolation" ON bundle_version_additional_services
  USING (org_id = (SELECT active_org_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_additional_services_org_id ON additional_services(org_id);
CREATE INDEX IF NOT EXISTS idx_additional_services_category ON additional_services(org_id, category);
CREATE INDEX IF NOT EXISTS idx_bvas_bundle_version_id ON bundle_version_additional_services(bundle_version_id);
