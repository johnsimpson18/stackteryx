-- ============================================================
-- Stackteryx — Pricing v2 Migration
-- Adds new vendor cost models, per-tool discounts, and
-- bundle sell strategy + assumptions storage.
-- Safe to re-run: uses IF NOT EXISTS / IF VALUE EXISTS guards.
-- ============================================================

-- ── Extend pricing_model enum ─────────────────────────────────────────────────
-- Postgres does not allow removing enum values, so we only ADD new ones.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'per_user'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pricing_model')
  ) THEN
    ALTER TYPE pricing_model ADD VALUE 'per_user';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'per_org'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pricing_model')
  ) THEN
    ALTER TYPE pricing_model ADD VALUE 'per_org';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'annual_flat'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pricing_model')
  ) THEN
    ALTER TYPE pricing_model ADD VALUE 'annual_flat';
  END IF;
END $$;

-- ── New cost fields on tools ───────────────────────────────────────────────────

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS annual_flat_cost   NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_user_cost      NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_org_cost       NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percent_discount   NUMERIC(5,4)  NOT NULL DEFAULT 0
                             CHECK (percent_discount >= 0 AND percent_discount <= 1),
  ADD COLUMN IF NOT EXISTS flat_discount      NUMERIC(12,4) NOT NULL DEFAULT 0
                             CHECK (flat_discount >= 0),
  ADD COLUMN IF NOT EXISTS min_monthly_commit NUMERIC(12,4) NULL
                             CHECK (min_monthly_commit IS NULL OR min_monthly_commit >= 0);

-- ── New sell strategy + assumptions on bundle_versions ────────────────────────
-- sell_strategy: which pricing strategy the MSP uses when selling this bundle
-- sell_config:   JSON blob with strategy-specific inputs (flat price, per-endpoint rate, etc.)
-- assumptions:   JSON blob with endpoints/users/org_count used when this version was computed

ALTER TABLE bundle_versions
  ADD COLUMN IF NOT EXISTS sell_strategy TEXT NOT NULL DEFAULT 'cost_plus_margin',
  ADD COLUMN IF NOT EXISTS sell_config   JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS assumptions   JSONB NOT NULL DEFAULT
    '{"endpoints":30,"users":30,"org_count":1}'::jsonb;

-- ── Helpful comments ──────────────────────────────────────────────────────────

COMMENT ON COLUMN tools.annual_flat_cost IS
  'Used when pricing_model = annual_flat. The yearly vendor cost (normalized to monthly by ÷12).';
COMMENT ON COLUMN tools.per_user_cost IS
  'Used when pricing_model = per_user. Cost per user per month.';
COMMENT ON COLUMN tools.per_org_cost IS
  'Used when pricing_model = per_org. Flat cost per organization per month.';
COMMENT ON COLUMN tools.percent_discount IS
  'Fraction discount off vendor cost (0–1). Applied before flat_discount.';
COMMENT ON COLUMN tools.flat_discount IS
  'Flat $/mo reduction applied after percent_discount.';
COMMENT ON COLUMN tools.min_monthly_commit IS
  'Minimum total monthly bill regardless of discounts (overrides vendor_minimum_monthly semantically).';

COMMENT ON COLUMN bundle_versions.sell_strategy IS
  'How the MSP charges the customer: cost_plus_margin | monthly_flat_rate | per_endpoint_monthly | per_user_monthly';
COMMENT ON COLUMN bundle_versions.sell_config IS
  'JSON: strategy-specific sell inputs, e.g. {"strategy":"monthly_flat_rate","monthly_flat_price":299}';
COMMENT ON COLUMN bundle_versions.assumptions IS
  'JSON: the endpoint/user/org counts used when this version was priced, e.g. {"endpoints":30,"users":30,"org_count":1}';
