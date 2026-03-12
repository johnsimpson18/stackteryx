import { describe, it, expect } from "vitest";
import { calculateAdditionalServicesMrr } from "../additional-services";
import type { AdditionalServiceInput } from "../additional-services";
import type { PricingAssumptions } from "../types";

const DEFAULT_ASSUMPTIONS: PricingAssumptions = {
  endpoints: 30,
  users: 20,
  org_count: 2,
};

function makeService(
  overrides: Partial<AdditionalServiceInput> = {}
): AdditionalServiceInput {
  return {
    service_id: "svc-1",
    service_name: "Test Service",
    billing_type: "monthly",
    cost: 100,
    sell_price: 150,
    cost_override: null,
    sell_price_override: null,
    quantity: 1,
    ...overrides,
  };
}

describe("calculateAdditionalServicesMrr", () => {
  it("computes monthly billing correctly", () => {
    const result = calculateAdditionalServicesMrr(
      [makeService({ cost: 100, sell_price: 150 })],
      DEFAULT_ASSUMPTIONS
    );
    expect(result.total_mrr).toBe(150);
    expect(result.total_cost_mrr).toBe(100);
    expect(result.breakdown[0].margin_pct).toBeCloseTo(50 / 150, 4);
    expect(result.breakdown[0].included_in_mrr).toBe(true);
  });

  it("per_user multiplies by users count", () => {
    const result = calculateAdditionalServicesMrr(
      [makeService({ billing_type: "per_user", cost: 5, sell_price: 8 })],
      DEFAULT_ASSUMPTIONS
    );
    // 5 * 20 users = 100 cost, 8 * 20 = 160 revenue
    expect(result.total_cost_mrr).toBe(100);
    expect(result.total_mrr).toBe(160);
  });

  it("per_device multiplies by endpoints count", () => {
    const result = calculateAdditionalServicesMrr(
      [makeService({ billing_type: "per_device", cost: 3, sell_price: 5 })],
      DEFAULT_ASSUMPTIONS
    );
    // 3 * 30 endpoints = 90, 5 * 30 = 150
    expect(result.total_cost_mrr).toBe(90);
    expect(result.total_mrr).toBe(150);
  });

  it("per_site multiplies by org_count", () => {
    const result = calculateAdditionalServicesMrr(
      [makeService({ billing_type: "per_site", cost: 200, sell_price: 300 })],
      DEFAULT_ASSUMPTIONS
    );
    // 200 * 2 orgs = 400, 300 * 2 = 600
    expect(result.total_cost_mrr).toBe(400);
    expect(result.total_mrr).toBe(600);
  });

  it("excludes hourly and one_time from MRR totals", () => {
    const services = [
      makeService({ service_id: "s1", billing_type: "monthly", cost: 100, sell_price: 150 }),
      makeService({ service_id: "s2", billing_type: "hourly", cost: 50, sell_price: 75 }),
      makeService({ service_id: "s3", billing_type: "one_time", cost: 500, sell_price: 750 }),
    ];
    const result = calculateAdditionalServicesMrr(services, DEFAULT_ASSUMPTIONS);
    // Only monthly service included in MRR
    expect(result.total_mrr).toBe(150);
    expect(result.total_cost_mrr).toBe(100);
    expect(result.breakdown).toHaveLength(3);
    expect(result.breakdown[1].included_in_mrr).toBe(false);
    expect(result.breakdown[2].included_in_mrr).toBe(false);
  });

  it("uses cost_override and sell_price_override when provided", () => {
    const result = calculateAdditionalServicesMrr(
      [makeService({ cost: 100, sell_price: 150, cost_override: 80, sell_price_override: 120 })],
      DEFAULT_ASSUMPTIONS
    );
    expect(result.total_cost_mrr).toBe(80);
    expect(result.total_mrr).toBe(120);
  });

  it("applies quantity multiplier", () => {
    const result = calculateAdditionalServicesMrr(
      [makeService({ cost: 50, sell_price: 75, quantity: 3 })],
      DEFAULT_ASSUMPTIONS
    );
    expect(result.total_cost_mrr).toBe(150);
    expect(result.total_mrr).toBe(225);
  });

  it("returns zeros for empty services array", () => {
    const result = calculateAdditionalServicesMrr([], DEFAULT_ASSUMPTIONS);
    expect(result.total_mrr).toBe(0);
    expect(result.total_cost_mrr).toBe(0);
    expect(result.breakdown).toHaveLength(0);
  });
});
