-- ============================================================
-- 012 — Pricing Engine RPC: calculate_bundle_margin
--
-- Adds the set_updated_at() alias (fixing 009 trigger references),
-- links tools to org_vendors, and creates a SECURITY INVOKER
-- Postgres function that computes per-tool cost, applies tiered
-- pricing and discounts, and returns a structured JSONB result.
--
-- All changes are additive. No tables or columns are dropped.
-- ============================================================


-- ── PRE-FIX: create set_updated_at() alias ──────────────────
-- Migration 009 references set_updated_at() in triggers, but only
-- update_updated_at() exists (defined in 001). This creates the
-- missing function so those triggers work correctly.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ── Link tools to org_vendors ───────────────────────────────
-- Nullable FK: tools not yet mapped to an org_vendor get NULL,
-- and the pricing function defaults their unit_cost to 0.

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS org_vendor_id UUID REFERENCES org_vendors(id);

CREATE INDEX IF NOT EXISTS idx_tools_org_vendor_id
  ON tools(org_vendor_id);


-- ── Pricing RPC ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_bundle_margin(
  p_bundle_version_id UUID,
  p_customer_inputs   JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_org_id          UUID;
  v_line_items      JSONB := '[]'::jsonb;
  v_total_cost      NUMERIC := 0;
  v_total_price     NUMERIC := 0;
  v_rec             RECORD;
  v_quantity        INTEGER;
  v_unit_cost       NUMERIC;
  v_tier_cost       NUMERIC;
  v_discount        RECORD;
  v_total_line_cost NUMERIC;
BEGIN
  -- ── 1. INPUT VALIDATION ────────────────────────────────────

  IF p_bundle_version_id IS NULL THEN
    RAISE EXCEPTION 'p_bundle_version_id is required';
  END IF;

  IF p_customer_inputs IS NULL THEN
    RAISE EXCEPTION 'p_customer_inputs is required';
  END IF;

  -- ── 2. EXISTENCE CHECK ─────────────────────────────────────

  SELECT b.org_id INTO v_org_id
  FROM bundle_versions bv
  JOIN bundles b ON b.id = bv.bundle_id
  WHERE bv.id = p_bundle_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bundle_version not found: %', p_bundle_version_id;
  END IF;

  -- ── 3. ORG MEMBERSHIP CHECK ────────────────────────────────

  IF NOT is_member_of(v_org_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  -- ── 4–8. PROCESS LINE ITEMS ────────────────────────────────

  FOR v_rec IN
    SELECT
      bvt.tool_id,
      t.name           AS tool_name,
      t.org_vendor_id  AS org_vendor_id
    FROM bundle_version_tools bvt
    JOIN tools t ON t.id = bvt.tool_id
    WHERE bvt.bundle_version_id = p_bundle_version_id
  LOOP

    -- ── 5. DETERMINE QUANTITY ──────────────────────────────────

    IF p_customer_inputs ? v_rec.tool_id::text THEN
      BEGIN
        v_quantity := (p_customer_inputs ->> v_rec.tool_id::text)::integer;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'invalid quantity for tool %: must be a positive integer',
          v_rec.tool_id;
      END;
    ELSE
      v_quantity := 1;
    END IF;

    IF v_quantity < 1 THEN
      RAISE EXCEPTION 'invalid quantity for tool %: must be a positive integer',
        v_rec.tool_id;
    END IF;

    -- ── 6. LOOK UP COST ────────────────────────────────────────

    v_unit_cost := 0;

    IF v_rec.org_vendor_id IS NOT NULL THEN
      -- Find matching tier from cost_model_tiers via cost_models
      SELECT cmt.unit_price INTO v_tier_cost
      FROM cost_models cm
      JOIN cost_model_tiers cmt ON cmt.cost_model_id = cm.id
      WHERE cm.org_vendor_id = v_rec.org_vendor_id
        AND cmt.min_value <= v_quantity
        AND (cmt.max_value IS NULL OR cmt.max_value >= v_quantity)
      ORDER BY cmt.min_value DESC
      LIMIT 1;

      IF v_tier_cost IS NOT NULL THEN
        v_unit_cost := v_tier_cost;
      END IF;
    END IF;

    -- ── 7. APPLY DISCOUNTS ─────────────────────────────────────

    IF v_rec.org_vendor_id IS NOT NULL THEN
      FOR v_discount IN
        SELECT ovd.discount_type, ovd.value
        FROM org_vendor_discounts ovd
        WHERE ovd.org_vendor_id = v_rec.org_vendor_id
          AND ovd.value IS NOT NULL
          AND ovd.value > 0
      LOOP
        IF v_discount.discount_type = 'percent' THEN
          v_unit_cost := v_unit_cost * (1 - v_discount.value / 100);
        ELSIF v_discount.discount_type = 'fixed' THEN
          v_unit_cost := v_unit_cost - v_discount.value;
        END IF;
      END LOOP;

      -- Floor at zero
      IF v_unit_cost < 0 THEN
        v_unit_cost := 0;
      END IF;
    END IF;

    -- ── 8. CALCULATE PRICE ─────────────────────────────────────
    -- price = cost for now; margin engine layered on later

    v_unit_cost       := round(v_unit_cost, 2);
    v_total_line_cost := round(v_unit_cost * v_quantity, 2);

    v_total_cost  := v_total_cost  + v_total_line_cost;
    v_total_price := v_total_price + v_total_line_cost;

    -- ── 9. APPEND LINE ITEM ────────────────────────────────────

    v_line_items := v_line_items || jsonb_build_object(
      'tool_id',     v_rec.tool_id,
      'tool_name',   v_rec.tool_name,
      'quantity',    v_quantity,
      'unit_cost',   v_unit_cost,
      'total_cost',  v_total_line_cost,
      'unit_price',  v_unit_cost,
      'total_price', v_total_line_cost
    );

  END LOOP;

  -- ── 9. RETURN RESULT ───────────────────────────────────────

  RETURN jsonb_build_object(
    'cost',       round(v_total_cost, 2),
    'price',      round(v_total_price, 2),
    'margin',     round(v_total_price - v_total_cost, 2),
    'line_items', v_line_items
  );
END;
$$;

COMMENT ON FUNCTION calculate_bundle_margin(UUID, JSONB) IS
  'Computes per-tool cost, applies tiered pricing and vendor discounts,
   and returns a JSONB result with line_items, cost, price, and margin.
   SECURITY INVOKER — requires org membership via is_member_of().';
