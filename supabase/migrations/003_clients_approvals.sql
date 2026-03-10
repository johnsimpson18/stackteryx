-- ============================================================
-- Stackteryx — Phase 3: Client Portfolio & Discount Approvals
-- ============================================================

-- New Enums
CREATE TYPE client_status AS ENUM ('prospect', 'active', 'churned');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Extend audit_action enum
ALTER TYPE audit_action ADD VALUE 'client_created';
ALTER TYPE audit_action ADD VALUE 'client_updated';
ALTER TYPE audit_action ADD VALUE 'contract_created';
ALTER TYPE audit_action ADD VALUE 'contract_cancelled';
ALTER TYPE audit_action ADD VALUE 'approval_requested';
ALTER TYPE audit_action ADD VALUE 'approval_reviewed';

-- ============================================================
-- Tables
-- ============================================================

-- Clients (MSP's end-customers)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  status client_status NOT NULL DEFAULT 'prospect',
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client Contracts (assigns a bundle version to a client)
CREATE TABLE client_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  bundle_id UUID NOT NULL REFERENCES bundles(id),
  bundle_version_id UUID NOT NULL REFERENCES bundle_versions(id),
  seat_count INTEGER NOT NULL CHECK (seat_count > 0),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  -- Pricing snapshot computed at contract creation (based on actual seat_count)
  monthly_revenue NUMERIC(12,4) NOT NULL DEFAULT 0,
  monthly_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
  margin_pct NUMERIC(5,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discount Approvals (created when a bundle version exceeds max_discount threshold)
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id),
  bundle_version_id UUID NOT NULL REFERENCES bundle_versions(id),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  status approval_status NOT NULL DEFAULT 'pending',
  -- Pricing context snapshot at request time
  discount_pct NUMERIC(5,4) NOT NULL,
  margin_pct NUMERIC(5,4),
  mrr NUMERIC(12,4),
  seat_count INTEGER,
  bundle_name TEXT NOT NULL DEFAULT '',
  version_number INTEGER NOT NULL DEFAULT 1,
  -- Requester notes
  notes TEXT NOT NULL DEFAULT '',
  -- Reviewer response
  reviewer_id UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Triggers
-- ============================================================

CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_client_contracts_updated_at
  BEFORE UPDATE ON client_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_approvals_updated_at
  BEFORE UPDATE ON approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Clients: all authenticated can read; non-viewer can manage
CREATE POLICY "Authenticated can read clients" ON clients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Non-viewer can manage clients" ON clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'finance', 'sales'))
  );

-- Client Contracts: all authenticated can read; non-viewer can manage
CREATE POLICY "Authenticated can read contracts" ON client_contracts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Non-viewer can manage contracts" ON client_contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'finance', 'sales'))
  );

-- Approvals: all authenticated can read; non-viewer can insert (request); owner/finance can update (review)
CREATE POLICY "Authenticated can read approvals" ON approvals
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Non-viewer can request approvals" ON approvals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'finance', 'sales'))
  );

CREATE POLICY "Owner and finance can review approvals" ON approvals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'finance'))
  );
