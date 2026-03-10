-- ============================================================
-- Stackteryx — Phase 1 Foundation Migration
-- ============================================================

-- Enums
CREATE TYPE user_role AS ENUM ('owner', 'finance', 'sales', 'viewer');

CREATE TYPE tool_category AS ENUM (
  'edr', 'siem', 'email_security', 'identity', 'backup',
  'vulnerability_management', 'dns_filtering', 'mfa',
  'security_awareness_training', 'documentation', 'rmm',
  'psa', 'network_monitoring', 'other'
);

CREATE TYPE pricing_model AS ENUM ('per_seat', 'flat_monthly', 'tiered');

CREATE TYPE audit_action AS ENUM (
  'tool_created', 'tool_updated', 'tool_deactivated',
  'settings_updated', 'member_invited', 'member_role_changed',
  'member_removed'
);

-- ============================================================
-- Tables
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace settings (single row, enforce in app logic)
CREATE TABLE workspace_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_name TEXT NOT NULL DEFAULT 'My MSP',
  default_overhead_pct NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  default_labor_pct NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  default_target_margin_pct NUMERIC(5,4) NOT NULL DEFAULT 0.30,
  red_zone_margin_pct NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  max_discount_no_approval_pct NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tools (the Stack Intelligence Library)
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vendor TEXT NOT NULL,
  category tool_category NOT NULL DEFAULT 'other',
  pricing_model pricing_model NOT NULL DEFAULT 'per_seat',
  per_seat_cost NUMERIC(10,4) DEFAULT 0,
  flat_monthly_cost NUMERIC(10,4) DEFAULT 0,
  tier_rules JSONB DEFAULT '[]'::jsonb,
  vendor_minimum_monthly NUMERIC(10,4),
  labor_cost_per_seat NUMERIC(10,4),
  support_complexity INTEGER NOT NULL DEFAULT 3 CHECK (support_complexity BETWEEN 1 AND 5),
  renewal_uplift_pct NUMERIC(5,4) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Entitlements stub (for Whop gating in Phase 4)
CREATE TABLE entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whop_user_id TEXT,
  whop_membership_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  plan TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update only their own
CREATE POLICY "Anyone can read profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Workspace settings: all authenticated users can read; only owner can update
CREATE POLICY "Authenticated can read settings" ON workspace_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owner can update settings" ON workspace_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- Tools: all authenticated can read; owner/finance/sales can insert/update
CREATE POLICY "Authenticated can read tools" ON tools
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Non-viewer can manage tools" ON tools
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'finance', 'sales'))
  );

-- Audit log: all authenticated can read; insert via service role or app logic
CREATE POLICY "Authenticated can read audit log" ON audit_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert audit log" ON audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- Triggers
-- ============================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_workspace_settings
  BEFORE UPDATE ON workspace_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_tools
  BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_entitlements
  BEFORE UPDATE ON entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    CASE
      WHEN (SELECT COUNT(*) FROM profiles) = 0 THEN 'owner'::user_role
      ELSE 'viewer'::user_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Seed Data
-- ============================================================

-- Insert default workspace settings
INSERT INTO workspace_settings (workspace_name) VALUES ('Stackteryx Demo');

-- Insert seed tools (realistic MSP security stack)
INSERT INTO tools (name, vendor, category, pricing_model, per_seat_cost, flat_monthly_cost, labor_cost_per_seat, support_complexity, vendor_minimum_monthly) VALUES
  ('Defender for Endpoint P2', 'Microsoft', 'edr', 'per_seat', 5.00, 0, 1.50, 3, NULL),
  ('SentinelOne Control', 'SentinelOne', 'edr', 'per_seat', 6.00, 0, 1.00, 3, 100.00),
  ('Huntress Managed EDR', 'Huntress', 'edr', 'per_seat', 3.50, 0, 0.50, 2, NULL),
  ('Blumira SIEM', 'Blumira', 'siem', 'tiered', 0, 0, 2.00, 4, NULL),
  ('Proofpoint Essentials', 'Proofpoint', 'email_security', 'per_seat', 3.00, 0, 0.75, 3, NULL),
  ('Duo MFA', 'Cisco', 'mfa', 'per_seat', 3.00, 0, 0.50, 2, NULL),
  ('Veeam M365 Backup', 'Veeam', 'backup', 'per_seat', 2.50, 0, 0.50, 2, NULL),
  ('DNSFilter', 'DNSFilter', 'dns_filtering', 'per_seat', 1.10, 0, 0.25, 1, NULL),
  ('KnowBe4 SAT', 'KnowBe4', 'security_awareness_training', 'flat_monthly', 0, 250.00, NULL, 2, NULL),
  ('IT Glue', 'Kaseya', 'documentation', 'flat_monthly', 0, 350.00, NULL, 2, NULL);

-- Blumira tiered pricing
UPDATE tools SET tier_rules = '[
  {"minSeats": 1, "maxSeats": 25, "costPerSeat": 7.00},
  {"minSeats": 26, "maxSeats": 50, "costPerSeat": 6.00},
  {"minSeats": 51, "maxSeats": 100, "costPerSeat": 5.00},
  {"minSeats": 101, "maxSeats": null, "costPerSeat": 4.00}
]'::jsonb WHERE name = 'Blumira SIEM';
