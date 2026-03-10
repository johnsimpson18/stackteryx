import { describe, it, expect } from "vitest";
import { calculatePricing, computeBundleCost, computeSellPrice, normalizeToMonthly, annotateNormalization } from "../engine";
import { resolveTieredCost, resolveMetricTier } from "../tiers";
import type { PricingInput, PricingToolInput, TierRule, BundleAssumptions, SellConfig } from "@/lib/types";

// Helper to build a minimal input with defaults
function makeInput(overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    tools: [],
    seat_count: 50,
    target_margin_pct: 0.3,
    overhead_pct: 0.1,
    labor_pct: 0.15,
    discount_pct: 0,
    red_zone_margin_pct: 0.15,
    max_discount_no_approval_pct: 0.1,
    contract_term_months: 12,
    ...overrides,
  };
}

function perSeatTool(
  overrides: Partial<PricingToolInput> = {}
): PricingToolInput {
  return {
    id: "tool-1",
    name: "Test Tool",
    pricing_model: "per_seat",
    per_seat_cost: 5,
    flat_monthly_cost: 0,
    tier_rules: [],
    vendor_minimum_monthly: null,
    labor_cost_per_seat: 1,
    quantity_multiplier: 1.0,
    ...overrides,
  };
}

const blumiraTiers: TierRule[] = [
  { minSeats: 1, maxSeats: 25, costPerSeat: 7.0 },
  { minSeats: 26, maxSeats: 50, costPerSeat: 6.0 },
  { minSeats: 51, maxSeats: 100, costPerSeat: 5.0 },
  { minSeats: 101, maxSeats: null, costPerSeat: 4.0 },
];

describe("resolveTieredCost", () => {
  it("returns the correct tier for Blumira-style tiers", () => {
    expect(resolveTieredCost(blumiraTiers, 20)).toBe(7.0);
    expect(resolveTieredCost(blumiraTiers, 30)).toBe(6.0);
    expect(resolveTieredCost(blumiraTiers, 75)).toBe(5.0);
    expect(resolveTieredCost(blumiraTiers, 150)).toBe(4.0);
  });

  it("returns 0 for empty tier rules", () => {
    expect(resolveTieredCost([], 50)).toBe(0);
  });

  it("falls back to the last tier if no match", () => {
    const tiers: TierRule[] = [
      { minSeats: 10, maxSeats: 20, costPerSeat: 5.0 },
    ];
    expect(resolveTieredCost(tiers, 5)).toBe(5.0);
  });
});

describe("calculatePricing", () => {
  // Test 1: Basic per-seat calculation
  it("calculates correctly for 3 per-seat tools, 50 seats, 30% margin", () => {
    const input = makeInput({
      tools: [
        perSeatTool({
          id: "t1",
          name: "Tool A",
          per_seat_cost: 5,
          labor_cost_per_seat: 1.5,
        }),
        perSeatTool({
          id: "t2",
          name: "Tool B",
          per_seat_cost: 6,
          labor_cost_per_seat: 1.0,
        }),
        perSeatTool({
          id: "t3",
          name: "Tool C",
          per_seat_cost: 3.5,
          labor_cost_per_seat: 0.5,
        }),
      ],
      seat_count: 50,
      target_margin_pct: 0.3,
      overhead_pct: 0.1,
      labor_pct: 0.15,
      discount_pct: 0,
    });

    const result = calculatePricing(input);

    // blended_tool_cost = 5 + 6 + 3.5 = 14.5
    expect(result.blended_tool_cost_per_seat).toBe(14.5);
    // total_labor = 1.5 + 1.0 + 0.5 = 3.0
    expect(result.total_labor_cost_per_seat).toBe(3.0);
    // overhead = (14.5 + 3.0) * 0.10 = 1.75
    expect(result.overhead_amount_per_seat).toBe(1.75);
    // true_cost = 14.5 + 3.0 + 1.75 = 19.25
    expect(result.true_cost_per_seat).toBe(19.25);
    // suggested_price = 19.25 / (1 - 0.30) = 27.5
    expect(result.suggested_price_per_seat).toBe(27.5);
    // margin_pre_discount = (27.5 - 19.25) / 27.5 = 0.3
    expect(result.margin_pct_pre_discount).toBe(0.3);
    // total_mrr = 27.5 * 50 = 1375
    expect(result.total_mrr).toBe(1375);
    // total_arr = 1375 * 12 = 16500
    expect(result.total_arr).toBe(16500);
  });

  // Test 2: Flat monthly distribution
  it("distributes flat monthly cost across seats", () => {
    const input = makeInput({
      tools: [
        {
          id: "fm1",
          name: "Flat Tool",
          pricing_model: "flat_monthly",
          per_seat_cost: 0,
          flat_monthly_cost: 250,
          tier_rules: [],
          vendor_minimum_monthly: null,
          labor_cost_per_seat: null,
          quantity_multiplier: 1.0,
        },
      ],
      seat_count: 25,
      target_margin_pct: 0,
      discount_pct: 0,
    });

    const result = calculatePricing(input);

    // raw_cost = 250 / 25 = 10.00
    expect(result.tool_costs[0].raw_cost_per_seat).toBe(10.0);
    expect(result.tool_costs[0].effective_cost_per_seat).toBe(10.0);
  });

  // Test 3: Tiered pricing resolution
  it("resolves tiered pricing at various seat counts", () => {
    const tieredTool = (seats: number) =>
      makeInput({
        tools: [
          {
            id: "tiered1",
            name: "Blumira SIEM",
            pricing_model: "tiered",
            per_seat_cost: 0,
            flat_monthly_cost: 0,
            tier_rules: blumiraTiers,
            vendor_minimum_monthly: null,
            labor_cost_per_seat: 2.0,
            quantity_multiplier: 1.0,
          },
        ],
        seat_count: seats,
        target_margin_pct: 0,
        discount_pct: 0,
        overhead_pct: 0,
      });

    expect(
      calculatePricing(tieredTool(20)).tool_costs[0].raw_cost_per_seat
    ).toBe(7.0);
    expect(
      calculatePricing(tieredTool(30)).tool_costs[0].raw_cost_per_seat
    ).toBe(6.0);
    expect(
      calculatePricing(tieredTool(75)).tool_costs[0].raw_cost_per_seat
    ).toBe(5.0);
    expect(
      calculatePricing(tieredTool(150)).tool_costs[0].raw_cost_per_seat
    ).toBe(4.0);
  });

  // Test 4: Vendor minimum enforcement
  it("enforces vendor minimum when total is below threshold", () => {
    const input = makeInput({
      tools: [
        perSeatTool({
          id: "vm1",
          name: "Vendor Min Tool",
          per_seat_cost: 3,
          vendor_minimum_monthly: 100,
          labor_cost_per_seat: 0,
        }),
      ],
      seat_count: 10,
      target_margin_pct: 0,
      overhead_pct: 0,
      discount_pct: 0,
    });

    const result = calculatePricing(input);

    // raw_cost * seats = 3 * 10 = 30 < 100 → effective = 100/10 = 10
    expect(result.tool_costs[0].effective_cost_per_seat).toBe(10);
    expect(result.tool_costs[0].vendor_minimum_applied).toBe(true);
    expect(result.flags.some((f) => f.type === "vendor_minimum_applied")).toBe(
      true
    );
  });

  // Test 5: Vendor minimum not triggered
  it("does not apply vendor minimum when total exceeds threshold", () => {
    const input = makeInput({
      tools: [
        perSeatTool({
          id: "vm2",
          name: "Vendor Min Tool",
          per_seat_cost: 3,
          vendor_minimum_monthly: 100,
          labor_cost_per_seat: 0,
        }),
      ],
      seat_count: 50,
      target_margin_pct: 0,
      overhead_pct: 0,
      discount_pct: 0,
    });

    const result = calculatePricing(input);

    // raw_cost * seats = 3 * 50 = 150 > 100 → no minimum
    expect(result.tool_costs[0].effective_cost_per_seat).toBe(3);
    expect(result.tool_costs[0].vendor_minimum_applied).toBe(false);
    expect(
      result.flags.some((f) => f.type === "vendor_minimum_applied")
    ).toBe(false);
  });

  // Test 6: Labor fallback
  it("falls back to labor_pct when labor_cost_per_seat is null", () => {
    const input = makeInput({
      tools: [
        perSeatTool({
          id: "lf1",
          name: "Labor Fallback",
          per_seat_cost: 10,
          labor_cost_per_seat: null,
        }),
      ],
      seat_count: 50,
      labor_pct: 0.15,
      target_margin_pct: 0,
      overhead_pct: 0,
      discount_pct: 0,
    });

    const result = calculatePricing(input);

    // labor = effective_cost * labor_pct = 10 * 0.15 = 1.5
    expect(result.tool_costs[0].labor_cost_per_seat).toBe(1.5);
  });

  // Test 7: Discount triggers approval
  it("flags approval_required when discount exceeds max", () => {
    const input = makeInput({
      tools: [perSeatTool()],
      discount_pct: 0.15,
      max_discount_no_approval_pct: 0.1,
    });

    const result = calculatePricing(input);

    expect(result.flags.some((f) => f.type === "approval_required")).toBe(true);
  });

  // Test 8: Red zone margin
  it("flags red_zone_margin when post-discount margin is below threshold", () => {
    // With high discount but still positive margin
    const input = makeInput({
      tools: [
        perSeatTool({
          per_seat_cost: 10,
          labor_cost_per_seat: 0,
        }),
      ],
      seat_count: 50,
      target_margin_pct: 0.15,
      overhead_pct: 0,
      discount_pct: 0.05,
      red_zone_margin_pct: 0.15,
      max_discount_no_approval_pct: 0.2,
    });

    const result = calculatePricing(input);

    // suggested = 10 / (1 - 0.15) = 11.7647
    // discounted = 11.7647 * (1 - 0.05) = 11.1765
    // margin_post = (11.1765 - 10) / 11.1765 = 0.1053
    // 0.1053 < 0.15 → red zone
    expect(result.flags.some((f) => f.type === "red_zone_margin")).toBe(true);
  });

  // Test 9: Negative margin
  it("flags negative_margin when discount causes loss", () => {
    const input = makeInput({
      tools: [
        perSeatTool({
          per_seat_cost: 10,
          labor_cost_per_seat: 2,
        }),
      ],
      seat_count: 50,
      target_margin_pct: 0.05,
      overhead_pct: 0.1,
      discount_pct: 0.2,
      red_zone_margin_pct: 0.15,
      max_discount_no_approval_pct: 0.25,
    });

    const result = calculatePricing(input);

    // true_cost = 10 + 2 + (12 * 0.1) = 13.2
    // suggested = 13.2 / (1 - 0.05) = 13.8947
    // discounted = 13.8947 * 0.8 = 11.1158
    // margin = (11.1158 - 13.2) / 11.1158 = negative
    expect(result.margin_pct_post_discount).toBeLessThan(0);
    expect(result.flags.some((f) => f.type === "negative_margin")).toBe(true);
  });

  // Test 10: Zero seats
  it("returns zeroed output with zero_seats flag when seat_count is 0", () => {
    const input = makeInput({
      tools: [perSeatTool()],
      seat_count: 0,
    });

    const result = calculatePricing(input);

    expect(result.true_cost_per_seat).toBe(0);
    expect(result.suggested_price_per_seat).toBe(0);
    expect(result.total_mrr).toBe(0);
    expect(result.flags.some((f) => f.type === "zero_seats")).toBe(true);
  });

  // Test 11: Empty tools
  it("returns zeroed costs with valid structure when tools array is empty", () => {
    const input = makeInput({
      tools: [],
      seat_count: 50,
    });

    const result = calculatePricing(input);

    expect(result.tool_costs).toHaveLength(0);
    expect(result.blended_tool_cost_per_seat).toBe(0);
    expect(result.true_cost_per_seat).toBe(0);
    expect(result.suggested_price_per_seat).toBe(0);
    expect(result.total_mrr).toBe(0);
    expect(result.flags).toHaveLength(0);
  });

  // Test 12: Quantity multiplier
  it("applies quantity_multiplier to per-seat cost", () => {
    const input = makeInput({
      tools: [
        perSeatTool({
          id: "qm1",
          name: "Doubled Tool",
          per_seat_cost: 5,
          labor_cost_per_seat: 0,
          quantity_multiplier: 2.0,
        }),
      ],
      seat_count: 50,
      target_margin_pct: 0,
      overhead_pct: 0,
      discount_pct: 0,
    });

    const result = calculatePricing(input);

    // effective_cost = 5 * 2.0 = 10
    expect(result.tool_costs[0].effective_cost_per_seat).toBe(10);
  });

  // Test 13: Mixed tool types
  it("calculates correctly with mixed per_seat, flat_monthly, and tiered tools", () => {
    const input = makeInput({
      tools: [
        perSeatTool({
          id: "mix1",
          name: "Per Seat",
          per_seat_cost: 5,
          labor_cost_per_seat: 1,
        }),
        {
          id: "mix2",
          name: "Flat Monthly",
          pricing_model: "flat_monthly",
          per_seat_cost: 0,
          flat_monthly_cost: 250,
          tier_rules: [],
          vendor_minimum_monthly: null,
          labor_cost_per_seat: null,
          quantity_multiplier: 1.0,
        },
        {
          id: "mix3",
          name: "Tiered",
          pricing_model: "tiered",
          per_seat_cost: 0,
          flat_monthly_cost: 0,
          tier_rules: blumiraTiers,
          vendor_minimum_monthly: null,
          labor_cost_per_seat: 2.0,
          quantity_multiplier: 1.0,
        },
      ],
      seat_count: 50,
      target_margin_pct: 0,
      overhead_pct: 0,
      labor_pct: 0.15,
      discount_pct: 0,
    });

    const result = calculatePricing(input);

    // per_seat: cost = 5, labor = 1
    expect(result.tool_costs[0].effective_cost_per_seat).toBe(5);
    // flat_monthly: cost = 250/50 = 5, labor = 5 * 0.15 = 0.75 (null fallback)
    expect(result.tool_costs[1].effective_cost_per_seat).toBe(5);
    expect(result.tool_costs[1].labor_cost_per_seat).toBe(0.75);
    // tiered: 50 seats → $6.00 tier, labor = 2.0
    expect(result.tool_costs[2].effective_cost_per_seat).toBe(6);

    // blended = 5 + 5 + 6 = 16
    expect(result.blended_tool_cost_per_seat).toBe(16);
    // total_labor = 1 + 0.75 + 2 = 3.75
    expect(result.total_labor_cost_per_seat).toBe(3.75);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// v2 Engine: computeBundleCost + computeSellPrice + normalizeToMonthly
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_ASSUMPTIONS: BundleAssumptions = { endpoints: 30, users: 30, headcount: 30, org_count: 1 };

function makeTool(overrides: Partial<PricingToolInput> = {}): PricingToolInput {
  return {
    id: "tool-x",
    name: "Test Tool",
    pricing_model: "per_seat",
    per_seat_cost: 0,
    flat_monthly_cost: 0,
    tier_rules: [],
    vendor_minimum_monthly: null,
    labor_cost_per_seat: null,
    quantity_multiplier: 1,
    annual_flat_cost: 0,
    per_user_cost: 0,
    per_org_cost: 0,
    percent_discount: 0,
    flat_discount: 0,
    min_monthly_commit: null,
    ...overrides,
  };
}

const ESET_MDR: PricingToolInput = makeTool({
  id: "eset-mdr",
  name: "ESET MDR",
  pricing_model: "per_seat",
  per_seat_cost: 3,
});

const FLARE_TEM: PricingToolInput = makeTool({
  id: "flare-tem",
  name: "Flare TEM",
  pricing_model: "annual_flat",
  annual_flat_cost: 840,
});

describe("normalizeToMonthly", () => {
  // Test 1
  it("ESET MDR × 30 endpoints = $90/mo cost", () => {
    expect(normalizeToMonthly(ESET_MDR, DEFAULT_ASSUMPTIONS)).toBe(90);
  });

  // Test 2
  it("Flare TEM annual_flat $840/yr normalizes to $70/mo", () => {
    expect(normalizeToMonthly(FLARE_TEM, DEFAULT_ASSUMPTIONS)).toBe(70);
  });

  // Test 5
  it("percent_discount reduces tool cost correctly", () => {
    const tool = makeTool({ per_seat_cost: 10, percent_discount: 0.10 });
    const result = normalizeToMonthly(tool, { ...DEFAULT_ASSUMPTIONS, endpoints: 10, headcount: 10 });
    // 10 × 10 × (1 - 0.10) = 90
    expect(result).toBe(90);
  });

  // Test 6
  it("min_monthly_commit enforced when natural cost is below it", () => {
    const tool = makeTool({ per_seat_cost: 3, min_monthly_commit: 50 });
    const result = normalizeToMonthly(tool, { ...DEFAULT_ASSUMPTIONS, endpoints: 5, headcount: 5 });
    // natural = 3 × 5 = 15, min = 50 → effective = 50
    expect(result).toBe(50);
  });

  it("per_user model uses users count not endpoints", () => {
    const tool = makeTool({ pricing_model: "per_user", per_user_cost: 5 });
    const result = normalizeToMonthly(tool, { endpoints: 30, users: 20, headcount: 30, org_count: 1 });
    // 5 × 20 = 100
    expect(result).toBe(100);
  });

  it("per_org model multiplies by org_count", () => {
    const tool = makeTool({ pricing_model: "per_org", per_org_cost: 200 });
    const result = normalizeToMonthly(tool, { endpoints: 30, users: 30, headcount: 30, org_count: 3 });
    // 200 × 3 = 600
    expect(result).toBe(600);
  });

  it("flat_discount applied after percent_discount", () => {
    // raw = 10 × 10 = 100, after 10% = 90, after flat $5 = 85
    const tool = makeTool({ per_seat_cost: 10, percent_discount: 0.1, flat_discount: 5 });
    const result = normalizeToMonthly(tool, { ...DEFAULT_ASSUMPTIONS, endpoints: 10, headcount: 10 });
    expect(result).toBe(85);
  });

  it("min_monthly_commit does not apply when natural cost exceeds it", () => {
    const tool = makeTool({ per_seat_cost: 5, min_monthly_commit: 50 });
    const result = normalizeToMonthly(tool, { ...DEFAULT_ASSUMPTIONS, endpoints: 20, headcount: 20 });
    // natural = 5 × 20 = 100 > 50 → no enforcement
    expect(result).toBe(100);
  });
});

describe("annotateNormalization", () => {
  // Test 2 (annotation part)
  it("returns annotation string for annual_flat tools", () => {
    expect(annotateNormalization(FLARE_TEM)).toBe("$840/yr → $70/mo");
  });

  it("returns null for per_seat tools", () => {
    expect(annotateNormalization(ESET_MDR)).toBeNull();
  });

  it("returns null for flat_monthly tools", () => {
    const tool = makeTool({ pricing_model: "flat_monthly", flat_monthly_cost: 500 });
    expect(annotateNormalization(tool)).toBeNull();
  });
});

describe("computeBundleCost", () => {
  // Test 3
  it("MDR + TEM bundle total cost = $160/mo at 30 endpoints", () => {
    const result = computeBundleCost([ESET_MDR, FLARE_TEM], DEFAULT_ASSUMPTIONS);
    // ESET MDR: 3 × 30 = 90; Flare TEM: 840/12 = 70; total = 160
    expect(result.totalMonthlyCost).toBe(160);
    expect(result.perToolBreakdown).toHaveLength(2);
    expect(result.perToolBreakdown[0].monthlyCost).toBe(90);
    expect(result.perToolBreakdown[1].monthlyCost).toBe(70);
    expect(result.perToolBreakdown[1].annotation).toBe("$840/yr → $70/mo");
  });

  it("empty tools array returns zero total", () => {
    const result = computeBundleCost([], DEFAULT_ASSUMPTIONS);
    expect(result.totalMonthlyCost).toBe(0);
    expect(result.perToolBreakdown).toHaveLength(0);
  });
});

describe("computeSellPrice", () => {
  // Test 4: monthly_flat_rate at $299 with $160 cost → $139 profit, ~46.5% margin
  it("monthly_flat_rate: MDR+TEM at $299/mo → $139 profit, ~46.5% margin", () => {
    const sellConfig: SellConfig = { strategy: "monthly_flat_rate", monthly_flat_price: 299 };
    const result = computeSellPrice(160, sellConfig, DEFAULT_ASSUMPTIONS);
    expect(result.sellPriceMonthly).toBe(299);
    expect(result.grossProfit).toBe(139);
    expect(Math.abs(result.grossMarginPct - 139 / 299)).toBeLessThan(0.001);
  });

  it("cost_plus_margin: 35% target margin produces correct sell price", () => {
    const sellConfig: SellConfig = { strategy: "cost_plus_margin", target_margin_pct: 0.35 };
    const result = computeSellPrice(100, sellConfig, DEFAULT_ASSUMPTIONS);
    // sellPrice = 100 / (1 - 0.35) ≈ 153.85
    expect(Math.abs(result.sellPriceMonthly - 100 / 0.65)).toBeLessThan(0.001);
    expect(Math.abs(result.grossMarginPct - 0.35)).toBeLessThan(0.001);
  });

  it("per_endpoint_monthly: $5/endpoint × 30 = $150/mo sell", () => {
    const sellConfig: SellConfig = { strategy: "per_endpoint_monthly", per_endpoint_sell_price: 5 };
    const result = computeSellPrice(90, sellConfig, DEFAULT_ASSUMPTIONS);
    expect(result.sellPriceMonthly).toBe(150);
    expect(result.grossProfit).toBe(60);
  });

  it("per_user_monthly: $4/user × 30 = $120/mo sell", () => {
    const sellConfig: SellConfig = { strategy: "per_user_monthly", per_user_sell_price: 4 };
    const result = computeSellPrice(70, sellConfig, DEFAULT_ASSUMPTIONS);
    expect(result.sellPriceMonthly).toBe(120);
    expect(result.grossProfit).toBe(50);
  });

  it("returns zero margin when sell price is zero", () => {
    const sellConfig: SellConfig = { strategy: "monthly_flat_rate", monthly_flat_price: 0 };
    const result = computeSellPrice(100, sellConfig, DEFAULT_ASSUMPTIONS);
    expect(result.grossMarginPct).toBe(0);
  });

  it("cost_plus_margin with 100% target margin returns 0 sell price", () => {
    const sellConfig: SellConfig = { strategy: "cost_plus_margin", target_margin_pct: 1.0 };
    const result = computeSellPrice(100, sellConfig, DEFAULT_ASSUMPTIONS);
    expect(result.sellPriceMonthly).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// tiered_by_metric: Flare TEM headcount-based annualFlat tiers
// ══════════════════════════════════════════════════════════════════════════════

const FLARE_TIERED_TIERS: TierRule[] = [
  { minSeats: 0,    maxSeats: 250,  costPerSeat: 0, priceType: "annualFlat", annualFlat: 840 },
  { minSeats: 251,  maxSeats: 1000, costPerSeat: 0, priceType: "annualFlat", annualFlat: 2400 },
  { minSeats: 1001, maxSeats: 5000, costPerSeat: 0, priceType: "annualFlat", annualFlat: 6000 },
];

const FLARE_TEM_TIERED: PricingToolInput = makeTool({
  id: "flare-tem-tiered",
  name: "Flare TEM (Tiered)",
  pricing_model: "tiered_by_metric",
  tier_metric: "headcount",
  tier_rules: FLARE_TIERED_TIERS,
});

describe("resolveMetricTier", () => {
  it("resolves annualFlat tier at headcount=120 → $840/yr → $70/mo", () => {
    const result = resolveMetricTier(FLARE_TIERED_TIERS, 120);
    expect(result.priceType).toBe("annualFlat");
    expect(result.annualCost).toBe(840);
    expect(result.monthlyCost).toBeCloseTo(70, 2);
  });

  it("resolves annualFlat tier at headcount=800 → $2400/yr → $200/mo", () => {
    const result = resolveMetricTier(FLARE_TIERED_TIERS, 800);
    expect(result.annualCost).toBe(2400);
    expect(result.monthlyCost).toBeCloseTo(200, 2);
  });

  it("resolves annualFlat tier at headcount=2000 → $6000/yr → $500/mo", () => {
    const result = resolveMetricTier(FLARE_TIERED_TIERS, 2000);
    expect(result.annualCost).toBe(6000);
    expect(result.monthlyCost).toBeCloseTo(500, 2);
  });

  it("falls back to last tier when headcount exceeds all ranges", () => {
    const result = resolveMetricTier(FLARE_TIERED_TIERS, 9999);
    expect(result.annualCost).toBe(6000);
  });

  it("returns 0 cost for empty tier rules", () => {
    const result = resolveMetricTier([], 100);
    expect(result.monthlyCost).toBe(0);
  });
});

describe("tiered_by_metric normalizeToMonthly", () => {
  it("SMB: Flare TEM at headcount=120 → $70/mo", () => {
    const result = normalizeToMonthly(
      FLARE_TEM_TIERED,
      { endpoints: 30, users: 30, headcount: 120, org_count: 1 }
    );
    expect(result).toBeCloseTo(70, 2);
  });

  it("Mid: Flare TEM at headcount=800 → $200/mo", () => {
    const result = normalizeToMonthly(
      FLARE_TEM_TIERED,
      { endpoints: 250, users: 250, headcount: 800, org_count: 1 }
    );
    expect(result).toBeCloseTo(200, 2);
  });

  it("Enterprise: Flare TEM at headcount=2000 → $500/mo", () => {
    const result = normalizeToMonthly(
      FLARE_TEM_TIERED,
      { endpoints: 1500, users: 1500, headcount: 2000, org_count: 1 }
    );
    expect(result).toBeCloseTo(500, 2);
  });

  it("annotates tiered_by_metric annualFlat tier correctly", () => {
    const smb = { endpoints: 30, users: 30, headcount: 120, org_count: 1 };
    const annotation = annotateNormalization(FLARE_TEM_TIERED, smb);
    expect(annotation).toBe("$840/yr → $70/mo");
  });

  it("annotates Mid tier correctly at headcount=800", () => {
    const mid = { endpoints: 250, users: 250, headcount: 800, org_count: 1 };
    const annotation = annotateNormalization(FLARE_TEM_TIERED, mid);
    expect(annotation).toBe("$2,400/yr → $200/mo");
  });

  it("returns null annotation when no assumptions passed", () => {
    const annotation = annotateNormalization(FLARE_TEM_TIERED);
    expect(annotation).toBeNull();
  });
});

describe("SMB full scenario — ESET MDR + Flare TEM tiered", () => {
  const SMB: BundleAssumptions = { endpoints: 30, users: 30, headcount: 120, org_count: 1 };

  const ESET: PricingToolInput = makeTool({
    id: "eset-mdr",
    name: "ESET MDR",
    pricing_model: "per_seat",
    per_seat_cost: 3,
  });

  it("ESET MDR: 30 endpoints × $3 = $90/mo", () => {
    expect(normalizeToMonthly(ESET, SMB)).toBe(90);
  });

  it("Flare TEM: headcount=120 falls in 0-250 band → $70/mo", () => {
    expect(normalizeToMonthly(FLARE_TEM_TIERED, SMB)).toBeCloseTo(70, 2);
  });

  it("Bundle total cost = $160/mo", () => {
    const result = computeBundleCost([ESET, FLARE_TEM_TIERED], SMB);
    expect(result.totalMonthlyCost).toBeCloseTo(160, 2);
  });

  it("Sell at $299/mo flat → $139 profit, 46.5% margin", () => {
    const sellConfig: SellConfig = { strategy: "monthly_flat_rate", monthly_flat_price: 299 };
    const result = computeSellPrice(160, sellConfig, SMB);
    expect(result.sellPriceMonthly).toBe(299);
    expect(result.grossProfit).toBeCloseTo(139, 2);
    expect(result.grossMarginPct).toBeCloseTo(139 / 299, 3);
  });

  it("Mid scenario: Flare at headcount=800 → $200/mo cost", () => {
    const MID: BundleAssumptions = { endpoints: 250, users: 250, headcount: 800, org_count: 1 };
    const esetMid = normalizeToMonthly(ESET, MID); // 250 × 3 = 750
    const flareMid = normalizeToMonthly(FLARE_TEM_TIERED, MID); // 2400/12 = 200
    expect(esetMid).toBe(750);
    expect(flareMid).toBeCloseTo(200, 2);
    const bundle = computeBundleCost([ESET, FLARE_TEM_TIERED], MID);
    expect(bundle.totalMonthlyCost).toBeCloseTo(950, 2);
  });
});
