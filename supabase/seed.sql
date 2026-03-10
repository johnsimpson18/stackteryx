-- ============================================================
-- Stackteryx — Seed Data
-- Run AFTER all migrations have been applied.
-- Demonstrates tiered_by_metric (Flare TEM) and per_seat (ESET MDR).
-- Math verification (SMB scenario):
--   ESET MDR:  30 endpoints × $3.00 = $90/mo
--   Flare TEM: headcount=120 → 0-250 band → $840/yr → $70/mo
--   Total cost: $160/mo | Sell: $299/mo | Profit: $139/mo | Margin: 46.5%
-- ============================================================

-- ── 1. Default workspace settings ────────────────────────────────────────────
INSERT INTO workspace_settings (workspace_name)
VALUES ('Stackteryx Demo')
ON CONFLICT DO NOTHING;

-- ── 2. Seed tools ─────────────────────────────────────────────────────────────

-- ESET MDR — per endpoint, $3/mo
INSERT INTO tools (
  name, vendor, category, pricing_model,
  per_seat_cost, flat_monthly_cost,
  support_complexity, is_active
) VALUES (
  'ESET MDR', 'ESET', 'edr', 'per_seat',
  3.00, 0,
  3, true
)
ON CONFLICT DO NOTHING;

-- Flare TEM — tiered by headcount, annualFlat per band
INSERT INTO tools (
  name, vendor, category, pricing_model, tier_metric,
  per_seat_cost, flat_monthly_cost,
  tier_rules,
  support_complexity, is_active
) VALUES (
  'Flare TEM', 'Flare', 'vulnerability_management', 'tiered_by_metric', 'headcount',
  0, 0,
  '[
    {"minSeats": 0,    "maxSeats": 250,  "costPerSeat": 0, "priceType": "annualFlat", "annualFlat": 840},
    {"minSeats": 251,  "maxSeats": 1000, "costPerSeat": 0, "priceType": "annualFlat", "annualFlat": 2400},
    {"minSeats": 1001, "maxSeats": 5000, "costPerSeat": 0, "priceType": "annualFlat", "annualFlat": 6000}
  ]'::jsonb,
  2, true
)
ON CONFLICT DO NOTHING;

-- Huntress Managed EDR — per endpoint
INSERT INTO tools (
  name, vendor, category, pricing_model,
  per_seat_cost, flat_monthly_cost,
  support_complexity, is_active
) VALUES (
  'Huntress Managed EDR', 'Huntress', 'edr', 'per_seat',
  3.50, 0,
  2, true
)
ON CONFLICT DO NOTHING;

-- SentinelOne Control — per endpoint with vendor minimum
INSERT INTO tools (
  name, vendor, category, pricing_model,
  per_seat_cost, flat_monthly_cost,
  vendor_minimum_monthly, support_complexity, is_active
) VALUES (
  'SentinelOne Control', 'SentinelOne', 'edr', 'per_seat',
  6.00, 0,
  100.00, 3, true
)
ON CONFLICT DO NOTHING;

-- Duo MFA — per user
INSERT INTO tools (
  name, vendor, category, pricing_model,
  per_seat_cost, per_user_cost, flat_monthly_cost,
  support_complexity, is_active
) VALUES (
  'Duo MFA', 'Cisco', 'mfa', 'per_user',
  0, 3.00, 0,
  2, true
)
ON CONFLICT DO NOTHING;

-- Proofpoint Essentials — per seat (email = per user)
INSERT INTO tools (
  name, vendor, category, pricing_model,
  per_seat_cost, flat_monthly_cost,
  support_complexity, is_active
) VALUES (
  'Proofpoint Essentials', 'Proofpoint', 'email_security', 'per_seat',
  3.00, 0,
  3, true
)
ON CONFLICT DO NOTHING;

-- Veeam M365 Backup — per seat
INSERT INTO tools (
  name, vendor, category, pricing_model,
  per_seat_cost, flat_monthly_cost,
  support_complexity, is_active
) VALUES (
  'Veeam M365 Backup', 'Veeam', 'backup', 'per_seat',
  2.50, 0,
  2, true
)
ON CONFLICT DO NOTHING;

-- DNSFilter — per seat
INSERT INTO tools (
  name, vendor, category, pricing_model,
  per_seat_cost, flat_monthly_cost,
  support_complexity, is_active
) VALUES (
  'DNSFilter', 'DNSFilter', 'dns_filtering', 'per_seat',
  1.10, 0,
  1, true
)
ON CONFLICT DO NOTHING;

-- KnowBe4 SAT — flat monthly
INSERT INTO tools (
  name, vendor, category, pricing_model,
  per_seat_cost, flat_monthly_cost,
  support_complexity, is_active
) VALUES (
  'KnowBe4 SAT', 'KnowBe4', 'security_awareness_training', 'flat_monthly',
  0, 250.00,
  2, true
)
ON CONFLICT DO NOTHING;

-- IT Glue — flat monthly
INSERT INTO tools (
  name, vendor, category, pricing_model,
  per_seat_cost, flat_monthly_cost,
  support_complexity, is_active
) VALUES (
  'IT Glue', 'Kaseya', 'documentation', 'flat_monthly',
  0, 350.00,
  2, true
)
ON CONFLICT DO NOTHING;

-- Blumira SIEM — tiered by endpoints
INSERT INTO tools (
  name, vendor, category, pricing_model,
  per_seat_cost, flat_monthly_cost,
  tier_rules,
  support_complexity, is_active
) VALUES (
  'Blumira SIEM', 'Blumira', 'siem', 'tiered',
  0, 0,
  '[
    {"minSeats": 1,   "maxSeats": 25,  "costPerSeat": 7.00},
    {"minSeats": 26,  "maxSeats": 50,  "costPerSeat": 6.00},
    {"minSeats": 51,  "maxSeats": 100, "costPerSeat": 5.00},
    {"minSeats": 101, "maxSeats": null,"costPerSeat": 4.00}
  ]'::jsonb,
  4, true
)
ON CONFLICT DO NOTHING;

-- ── 3. Seed "MDR + TEM" bundle with SMB and Mid scenarios ────────────────────

DO $$
DECLARE
  v_bundle_id UUID;
  v_eset_id   UUID;
  v_flare_id  UUID;
BEGIN
  -- Look up tool IDs
  SELECT id INTO v_eset_id  FROM tools WHERE name = 'ESET MDR'  LIMIT 1;
  SELECT id INTO v_flare_id FROM tools WHERE name = 'Flare TEM' LIMIT 1;

  -- Create the bundle
  INSERT INTO bundles (name, bundle_type, description, status)
  VALUES (
    'MDR + TEM Bundle',
    'custom',
    'ESET MDR for endpoint detection + Flare TEM for threat exposure management. Demonstrates mixed pricing models including headcount-based tiered annual pricing.',
    'active'
  )
  RETURNING id INTO v_bundle_id;

  -- Add SMB scenario: 30 endpoints, 120 headcount, sell at $299/mo flat
  INSERT INTO scenarios (
    bundle_id, name,
    endpoints, users, headcount, org_count, contract_term_months, sites,
    sell_config, is_default
  ) VALUES (
    v_bundle_id, 'SMB — 30 Endpoints',
    30, 30, 120, 1, 12, 1,
    '{"strategy":"monthly_flat_rate","monthly_flat_price":299}'::jsonb,
    true
  );

  -- Add Mid-Market scenario: 250 endpoints, 800 headcount, sell TBD
  INSERT INTO scenarios (
    bundle_id, name,
    endpoints, users, headcount, org_count, contract_term_months, sites,
    sell_config, is_default
  ) VALUES (
    v_bundle_id, 'Mid-Market — 250 Endpoints',
    250, 250, 800, 1, 12, 1,
    '{"strategy":"cost_plus_margin","target_margin_pct":0.40}'::jsonb,
    false
  );

  -- Create a bundle version with both tools
  -- (version is created without computed pricing — will be recalculated in UI)
  -- We only seed if both tools were found
  IF v_eset_id IS NOT NULL AND v_flare_id IS NOT NULL THEN
    WITH new_version AS (
      INSERT INTO bundle_versions (
        bundle_id, version_number,
        seat_count, risk_tier, contract_term_months,
        target_margin_pct, overhead_pct, labor_pct, discount_pct,
        notes, sell_strategy,
        sell_config, assumptions
      ) VALUES (
        v_bundle_id, 1,
        30, 'medium', 12,
        0.40, 0.10, 0.15, 0,
        'Seed version — SMB 30 endpoints, 120 headcount. Cost: $160/mo, Sell: $299/mo, Margin: 46.5%',
        'monthly_flat_rate',
        '{"strategy":"monthly_flat_rate","monthly_flat_price":299}'::jsonb,
        '{"endpoints":30,"users":30,"headcount":120,"org_count":1}'::jsonb
      )
      RETURNING id
    )
    INSERT INTO bundle_version_tools (bundle_version_id, tool_id, quantity_multiplier)
    SELECT new_version.id, unnest(ARRAY[v_eset_id, v_flare_id]), 1.0
    FROM new_version;
  END IF;
END $$;
