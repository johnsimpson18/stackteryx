import type {
  PricingInput,
  PricingOutput,
  PricingToolCost,
  PricingFlag,
  PricingToolInput,
  BundleAssumptions,
  SellConfig,
  BundleCostResult,
  SellPriceResult,
} from "@/lib/types";
import { resolveTieredCost, resolveMetricTier } from "./tiers";

/** Resolves the headcount metric from assumptions, falling back to endpoints. */
function getHeadcount(assumptions: BundleAssumptions): number {
  return assumptions.headcount ?? assumptions.endpoints;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function calculatePricing(input: PricingInput): PricingOutput {
  const flags: PricingFlag[] = [];

  const zeroOutput = (): Omit<PricingOutput, "flags"> => ({
    tool_costs: [],
    blended_tool_cost_per_seat: 0,
    total_labor_cost_per_seat: 0,
    overhead_amount_per_seat: 0,
    true_cost_per_seat: 0,
    suggested_price_per_seat: 0,
    discounted_price_per_seat: 0,
    margin_pct_pre_discount: 0,
    margin_pct_post_discount: 0,
    total_mrr: 0,
    total_arr: 0,
    total_cost_mrr: 0,
    total_monthly_margin: 0,
    contract_total_revenue: 0,
    msp_sell_price_monthly: 0,
    msp_gross_profit_monthly: 0,
    msp_gross_margin_pct: 0,
    normalized_tool_costs: [],
  });

  // Edge case: zero seats
  if (input.seat_count === 0) {
    flags.push({
      type: "zero_seats",
      severity: "error",
      message: "Seat count is zero — all monetary values are $0.",
    });
    return { ...zeroOutput(), flags };
  }

  // Edge case: empty tools
  if (input.tools.length === 0) {
    return { ...zeroOutput(), flags: [] };
  }

  // Step 1 — Per-tool cost resolution
  const toolCosts: PricingToolCost[] = input.tools.map((tool) => {
    let rawCost: number;

    switch (tool.pricing_model) {
      case "per_seat":
        rawCost = tool.per_seat_cost * tool.quantity_multiplier;
        break;
      case "flat_monthly":
        rawCost = tool.flat_monthly_cost / input.seat_count;
        break;
      case "tiered": {
        const tieredCostPerSeat = resolveTieredCost(
          tool.tier_rules,
          input.seat_count
        );
        rawCost = tieredCostPerSeat * tool.quantity_multiplier;
        break;
      }
      default:
        rawCost = 0;
    }

    // Vendor minimum check
    let effectiveCost = rawCost;
    let vendorMinApplied = false;

    if (
      tool.vendor_minimum_monthly !== null &&
      tool.vendor_minimum_monthly > 0 &&
      rawCost * input.seat_count < tool.vendor_minimum_monthly
    ) {
      effectiveCost = tool.vendor_minimum_monthly / input.seat_count;
      vendorMinApplied = true;
    }

    // Step 2 — Labor cost per tool
    let laborCost: number;
    if (tool.labor_cost_per_seat !== null) {
      laborCost = tool.labor_cost_per_seat * tool.quantity_multiplier;
    } else {
      laborCost = effectiveCost * input.labor_pct;
    }

    const monthlyTotal = (effectiveCost + laborCost) * input.seat_count;

    if (vendorMinApplied) {
      flags.push({
        type: "vendor_minimum_applied",
        severity: "info",
        message: `Vendor minimum of $${tool.vendor_minimum_monthly!.toFixed(2)}/mo applied to "${tool.name}".`,
        tool_id: tool.id,
      });
    }

    return {
      tool_id: tool.id,
      tool_name: tool.name,
      raw_cost_per_seat: round4(rawCost),
      effective_cost_per_seat: round4(effectiveCost),
      labor_cost_per_seat: round4(laborCost),
      monthly_total: round4(monthlyTotal),
      vendor_minimum_applied: vendorMinApplied,
    };
  });

  // Step 3 — Aggregation
  const blendedToolCost = toolCosts.reduce(
    (sum, tc) => sum + tc.effective_cost_per_seat,
    0
  );
  const totalLabor = toolCosts.reduce(
    (sum, tc) => sum + tc.labor_cost_per_seat,
    0
  );
  const overheadAmount = (blendedToolCost + totalLabor) * input.overhead_pct;
  const trueCost = blendedToolCost + totalLabor + overheadAmount;

  // Step 4 — Pricing
  let suggestedPrice: number;
  if (input.target_margin_pct >= 1.0) {
    flags.push({
      type: "negative_margin",
      severity: "error",
      message:
        "Target margin is 100% or greater — pricing cannot be calculated.",
    });
    suggestedPrice = 0;
  } else if (input.target_margin_pct === 0) {
    suggestedPrice = trueCost;
  } else {
    suggestedPrice = trueCost / (1 - input.target_margin_pct);
  }

  const discountedPrice = suggestedPrice * (1 - input.discount_pct);

  const marginPreDiscount =
    suggestedPrice > 0
      ? (suggestedPrice - trueCost) / suggestedPrice
      : 0;
  const marginPostDiscount =
    discountedPrice > 0
      ? (discountedPrice - trueCost) / discountedPrice
      : 0;

  // Step 5 — Totals
  const totalMrr = discountedPrice * input.seat_count;
  const totalArr = totalMrr * 12;
  const totalCostMrr = trueCost * input.seat_count;
  const totalMonthlyMargin = totalMrr - totalCostMrr;
  const contractTotalRevenue = totalMrr * input.contract_term_months;

  // Step 6 — Flags
  if (
    marginPostDiscount < 0 &&
    input.target_margin_pct < 1.0
  ) {
    flags.push({
      type: "negative_margin",
      severity: "error",
      message: `Post-discount margin is negative (${(marginPostDiscount * 100).toFixed(1)}%).`,
    });
  }

  if (
    marginPostDiscount >= 0 &&
    marginPostDiscount < input.red_zone_margin_pct &&
    input.target_margin_pct < 1.0
  ) {
    flags.push({
      type: "red_zone_margin",
      severity: "warning",
      message: `Post-discount margin (${(marginPostDiscount * 100).toFixed(1)}%) is below the red zone threshold (${(input.red_zone_margin_pct * 100).toFixed(1)}%).`,
    });
  }

  if (input.discount_pct > input.max_discount_no_approval_pct) {
    flags.push({
      type: "approval_required",
      severity: "warning",
      message: `Discount of ${(input.discount_pct * 100).toFixed(1)}% exceeds the ${(input.max_discount_no_approval_pct * 100).toFixed(1)}% max without approval.`,
    });
  }

  if (
    marginPostDiscount > 0 &&
    marginPostDiscount < input.red_zone_margin_pct &&
    input.discount_pct <= input.max_discount_no_approval_pct
  ) {
    // Margin is in the red zone but discount didn't trigger approval — still flag it
    flags.push({
      type: "approval_required",
      severity: "warning",
      message: `Post-discount margin (${(marginPostDiscount * 100).toFixed(1)}%) is in the red zone — approval recommended.`,
    });
  }

  return {
    tool_costs: toolCosts,
    blended_tool_cost_per_seat: round4(blendedToolCost),
    total_labor_cost_per_seat: round4(totalLabor),
    overhead_amount_per_seat: round4(overheadAmount),
    true_cost_per_seat: round4(trueCost),
    suggested_price_per_seat: round4(suggestedPrice),
    discounted_price_per_seat: round4(discountedPrice),
    margin_pct_pre_discount: round4(marginPreDiscount),
    margin_pct_post_discount: round4(marginPostDiscount),
    total_mrr: round4(totalMrr),
    total_arr: round4(totalArr),
    total_cost_mrr: round4(totalCostMrr),
    total_monthly_margin: round4(totalMonthlyMargin),
    contract_total_revenue: round4(contractTotalRevenue),
    flags,
    // v2 fields — not populated by calculatePricing (use computeBundleCost + computeSellPrice)
    msp_sell_price_monthly: 0,
    msp_gross_profit_monthly: 0,
    msp_gross_margin_pct: 0,
    normalized_tool_costs: [],
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// v2 Pricing Engine — vendor cost models + sell strategies
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the normalized monthly cost for a single tool given bundle assumptions.
 * Applies discounts: percentDiscount → flatDiscount → minMonthlyCommit.
 */
export function normalizeToMonthly(
  tool: PricingToolInput,
  assumptions: BundleAssumptions
): number {
  const {
    pricing_model,
    per_seat_cost,
    flat_monthly_cost,
    tier_rules,
    annual_flat_cost = 0,
    per_user_cost = 0,
    per_org_cost = 0,
    percent_discount = 0,
    flat_discount = 0,
    min_monthly_commit = null,
    quantity_multiplier = 1,
  } = tool;

  // Step 1 — Raw monthly cost based on model
  let rawMonthly: number;
  switch (pricing_model) {
    case "per_seat":
      rawMonthly = per_seat_cost * quantity_multiplier * assumptions.endpoints;
      break;
    case "per_user":
      rawMonthly = per_user_cost * quantity_multiplier * assumptions.users;
      break;
    case "flat_monthly":
      rawMonthly = flat_monthly_cost * assumptions.org_count;
      break;
    case "per_org":
      rawMonthly = per_org_cost * assumptions.org_count;
      break;
    case "annual_flat":
      rawMonthly = annual_flat_cost / 12;
      break;
    case "tiered": {
      const tieredRate = resolveTieredCost(tier_rules, assumptions.endpoints);
      rawMonthly = tieredRate * quantity_multiplier * assumptions.endpoints;
      break;
    }
    case "tiered_by_metric": {
      const metric = tool.tier_metric ?? "endpoints";
      const metricValue =
        metric === "users"
          ? assumptions.users
          : metric === "headcount"
            ? getHeadcount(assumptions)
            : assumptions.endpoints;
      const tierResult = resolveMetricTier(tier_rules, metricValue);
      rawMonthly = tierResult.monthlyCost * quantity_multiplier;
      break;
    }
    default:
      rawMonthly = 0;
  }

  // Step 2 — Apply percent discount
  let effective = rawMonthly * (1 - percent_discount);

  // Step 3 — Apply flat discount
  effective = Math.max(0, effective - flat_discount);

  // Step 4 — Enforce minimum monthly commit
  if (min_monthly_commit !== null && min_monthly_commit > 0) {
    effective = Math.max(effective, min_monthly_commit);
  }

  return round4(effective);
}

/**
 * Returns a human-readable annotation for tools with an annual-to-monthly normalization.
 * - "annual_flat" tools: always annotates from tool.annual_flat_cost
 * - "tiered_by_metric" tools with annualFlat tier: annotates the active tier (requires assumptions)
 * Returns null for all other models.
 */
export function annotateNormalization(
  tool: PricingToolInput,
  assumptions?: BundleAssumptions
): string | null {
  function fmtMoney(n: number) {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  if (tool.pricing_model === "annual_flat") {
    const annual = tool.annual_flat_cost ?? 0;
    const monthly = round4(annual / 12);
    return `${fmtMoney(annual)}/yr → ${fmtMoney(monthly)}/mo`;
  }

  if (tool.pricing_model === "tiered_by_metric" && assumptions) {
    const metric = tool.tier_metric ?? "endpoints";
    const metricValue =
      metric === "users"
        ? assumptions.users
        : metric === "headcount"
          ? getHeadcount(assumptions)
          : assumptions.endpoints;
    const { annualCost, priceType } = resolveMetricTier(
      tool.tier_rules,
      metricValue
    );
    if (priceType === "annualFlat" && annualCost !== null) {
      const monthly = round4(annualCost / 12);
      return `${fmtMoney(annualCost)}/yr → ${fmtMoney(monthly)}/mo`;
    }
  }

  return null;
}

/**
 * Computes the total normalized monthly cost for a bundle of tools at given assumptions.
 * Returns a per-tool breakdown with annotations for annual_flat tools.
 */
export function computeBundleCost(
  tools: PricingToolInput[],
  assumptions: BundleAssumptions
): BundleCostResult {
  const perToolBreakdown = tools.map((tool) => {
    const monthlyCost = normalizeToMonthly(tool, assumptions);
    const annotation = annotateNormalization(tool, assumptions);
    return {
      toolId: tool.id,
      toolName: tool.name,
      monthlyCost,
      annotation,
    };
  });

  const totalMonthlyCost = round4(
    perToolBreakdown.reduce((sum, t) => sum + t.monthlyCost, 0)
  );

  return { totalMonthlyCost, perToolBreakdown };
}

/**
 * Computes the MSP sell price and gross margin given a total monthly cost and sell strategy.
 */
export function computeSellPrice(
  totalMonthlyCost: number,
  sellConfig: SellConfig,
  assumptions: BundleAssumptions
): SellPriceResult {
  let sellPriceMonthly: number;

  switch (sellConfig.strategy) {
    case "cost_plus_margin": {
      const margin = sellConfig.target_margin_pct ?? 0;
      sellPriceMonthly = margin >= 1 ? 0 : round4(totalMonthlyCost / (1 - margin));
      break;
    }
    case "monthly_flat_rate":
      sellPriceMonthly = sellConfig.monthly_flat_price ?? 0;
      break;
    case "per_endpoint_monthly":
      sellPriceMonthly = round4(
        (sellConfig.per_endpoint_sell_price ?? 0) * assumptions.endpoints
      );
      break;
    case "per_user_monthly":
      sellPriceMonthly = round4(
        (sellConfig.per_user_sell_price ?? 0) * assumptions.users
      );
      break;
    default:
      sellPriceMonthly = 0;
  }

  const grossProfit = round4(sellPriceMonthly - totalMonthlyCost);
  const grossMarginPct =
    sellPriceMonthly > 0 ? round4(grossProfit / sellPriceMonthly) : 0;

  return { sellPriceMonthly, grossProfit, grossMarginPct };
}
