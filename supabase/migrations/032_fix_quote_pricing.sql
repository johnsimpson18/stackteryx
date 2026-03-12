-- ────────────────────────────────────────────────────────────────────────────
-- Migration 032: Fix quote pricing
--
-- The old calculate_bundle_margin RPC set price = cost (0% margin).
-- Replace it with store_quote_snapshot which accepts pre-computed TypeScript
-- engine output instead of running a parallel pricing implementation.
-- ────────────────────────────────────────────────────────────────────────────

-- Drop the broken RPC that always returned 0% margin
DROP FUNCTION IF EXISTS calculate_bundle_margin(uuid, jsonb);

-- New RPC: stores pre-computed pricing from TypeScript engine
CREATE OR REPLACE FUNCTION store_quote_snapshot(
  p_bundle_version_id uuid,
  p_seat_count integer,
  p_pricing_result jsonb,
  p_additional_services_result jsonb DEFAULT '{}'::jsonb,
  p_org_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_quote_id uuid;
BEGIN
  INSERT INTO quotes (
    bundle_version_id,
    org_id,
    -- client_id is NOT NULL but quotes may be for prospects; use a placeholder
    client_id,
    customer_inputs,
    snapshot,
    created_at
  )
  VALUES (
    p_bundle_version_id,
    p_org_id,
    -- TODO: accept client_id parameter when quote flow is wired up
    '00000000-0000-0000-0000-000000000000'::uuid,
    jsonb_build_object('seat_count', p_seat_count),
    p_pricing_result || jsonb_build_object('additional_services', p_additional_services_result),
    now()
  )
  RETURNING id INTO v_quote_id;

  RETURN v_quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
