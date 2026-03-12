/**
 * Canonical Pricing Engine
 *
 * CONSOLIDATION NOTES (3 engines → 1):
 *
 * Previously three separate engines existed:
 *
 * 1. v1 calculatePricing (this file, original):
 *    - Handled only per_seat, flat_monthly, tiered (3 of 7 models)
 *    - Applied vendor minimum as: rawCost * seat_count < min → effective = min / seat_count
 *    - Did NOT apply tool-level discounts (percent_discount, flat_discount, min_monthly_commit)
 *    - Added labor (per-tool or fallback to labor_pct) and overhead (on blended+labor)
 *    - Sell price = trueCost / (1 - target_margin_pct) — only cost_plus_margin strategy
 *    - Bundle discount applied as: discountedPrice = suggestedPrice * (1 - discount_pct)
 *
 * 2. v2 normalizeToMonthly + computeBundleCost + computeSellPrice (this file, added later):
 *    - Handled all 7 pricing models (per_seat, per_user, flat_monthly, per_org, annual_flat, tiered, tiered_by_metric)
 *    - Applied tool-level discount chain: percent → flat → min_monthly_commit floor
 *    - Did NOT add labor or overhead — raw vendor cost only
 *    - Supported 4 sell strategies (cost_plus_margin, monthly_flat_rate, per_endpoint, per_user)
 *    - No bundle-level discount
 *    - No flags
 *
 * 3. Postgres RPC calculate_bundle_margin (migration 012):
 *    - Used cost_model_tiers + org_vendor_discounts tables
 *    - Set price = cost (margin engine was "TODO" — always 0% margin)
 *    - Never called from application code
 *
 * This canonical engine merges all three:
 *    - All 7 pricing models (from v2)
 *    - Tool-level discount chain (from v2)
 *    - Vendor minimum floor (from v1, applied after discount chain)
 *    - Labor and overhead (from v1)
 *    - All 4 sell strategies (from v2)
 *    - Bundle-level discount (from v1)
 *    - Pricing flags (from v1, expanded)
 *    - Renewal pricing (new — uses renewal_uplift_pct)
 */

import type {
  PricingInput,
  PricingOutput,
  PricingToolCost,
  PricingFlag as LegacyPricingFlag,
  PricingToolInput,
  BundleAssumptions,
  SellConfig as LegacySellConfig,
  BundleCostResult,
  SellPriceResult,
} from "@/lib/types";
import type {
  PricingTool,
  PricingParameters,
  PricingResult,
  PricingFlag,
  ToolCostBreakdown,
  PricingAssumptions,
  SellConfig,
} from "./types";
import { resolveTieredCost, resolveMetricTier } from "./tiers";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getHeadcount(assumptions: PricingAssumptions | BundleAssumptions): number {
  return (assumptions as PricingAssumptions).headcount ?? assumptions.endpoints;
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Resolves a named metric to a numeric value from assumptions. */
function resolveMetricValue(
  metric: string,
  assumptions: PricingAssumptions | BundleAssumptions
): number {
  switch (metric) {
    case "users":
      return assumptions.users;
    case "headcount":
      return getHeadcount(assumptions);
    case "endpoints":
      return assumptions.endpoints;
    default:
      return assumptions.endpoints;
  }
}

// ── Step 1: Normalize tool to monthly cost ──────────────────────────────────

function normalizeToolToMonthly(
  tool: PricingTool,
  assumptions: PricingAssumptions
): number {
  const { endpoints, users, org_count } = assumptions;
  let raw = 0;

  switch (tool.pricing_model) {
    case "per_seat":
      raw = tool.per_seat_cost * tool.quantity_multiplier * endpoints;
      break;
    case "per_user":
      raw = tool.per_user_cost * tool.quantity_multiplier * users;
      break;
    case "flat_monthly":
      raw = tool.flat_monthly_cost * org_count;
      break;
    case "per_org":
      raw = tool.per_org_cost * org_count;
      break;
    case "annual_flat":
      raw = tool.annual_flat_cost / 12;
      break;
    case "tiered": {
      const tieredRate = resolveTieredCost(tool.tier_rules, endpoints);
      raw = tieredRate * tool.quantity_multiplier * endpoints;
      break;
    }
    case "tiered_by_metric": {
      const metric = tool.tier_metric || "endpoints";
      const metricValue = resolveMetricValue(metric, assumptions);
      const tierResult = resolveMetricTier(tool.tier_rules, metricValue);
      raw = tierResult.monthlyCost * tool.quantity_multiplier;
      break;
    }
  }

  return raw;
}

// ── Canonical Engine ────────────────────────────────────────────────────────

export function calculatePricingCanonical(
  tools: PricingTool[],
  params: PricingParameters
): PricingResult {
  const flags: PricingFlag[] = [];

  const zeroResult = (): PricingResult => ({
    true_cost_per_seat: 0,
    suggested_price_per_seat: 0,
    discounted_price_per_seat: 0,
    margin_pre_discount: 0,
    margin_post_discount: 0,
    total_mrr: 0,
    discounted_mrr: 0,
    total_cost_mrr: 0,
    total_monthly_margin: 0,
    total_arr: 0,
    contract_total_revenue: 0,
    renewal_suggested_price_per_seat: 0,
    renewal_margin_post_discount: 0,
    tool_breakdown: [],
    pricing_flags: flags,
  });

  // Edge case: zero seats
  if (params.seat_count === 0) {
    flags.push({
      type: "zero_seats",
      severity: "error",
      message: "Seat count is zero — all monetary values are $0.",
    });
    return zeroResult();
  }

  // Edge case: empty tools
  if (tools.length === 0) {
    return { ...zeroResult(), pricing_flags: [] };
  }

  // ── Step 1-4: Per-tool cost resolution ──────────────────────────────────

  const toolBreakdown: ToolCostBreakdown[] = tools.map((tool) => {
    // Step 1 — Normalize to monthly
    const rawMonthly = normalizeToolToMonthly(tool, params.assumptions);

    // Step 2 — Apply discount chain
    let effective = rawMonthly * (1 - (tool.percent_discount ?? 0));
    effective = Math.max(0, effective - (tool.flat_discount ?? 0));
    if (tool.min_monthly_commit != null && tool.min_monthly_commit > 0) {
      effective = Math.max(effective, tool.min_monthly_commit);
    }
    const discountApplied = effective !== rawMonthly;

    // Step 3 — Vendor minimum (floor on total monthly spend for this tool)
    let vendorMinApplied = false;
    if (
      tool.vendor_minimum_monthly != null &&
      tool.vendor_minimum_monthly > 0 &&
      effective < tool.vendor_minimum_monthly
    ) {
      effective = tool.vendor_minimum_monthly;
      vendorMinApplied = true;
      flags.push({
        type: "vendor_minimum_applied",
        severity: "info",
        message: `Vendor minimum of $${tool.vendor_minimum_monthly.toFixed(2)}/mo applied to "${tool.tool_name}".`,
        tool_id: tool.tool_id,
      });
    }

    // Step 4 — Flag zero-cost tools
    if (effective === 0) {
      flags.push({
        type: "zero_cost_tool",
        severity: "warning",
        message: `"${tool.tool_name}" has no cost configured — verify pricing is correct.`,
        tool_id: tool.tool_id,
      });
    }

    // Step 5 — Compute labor
    const relevantQty =
      tool.pricing_model === "per_user"
        ? params.assumptions.users
        : params.assumptions.endpoints;
    const laborCost =
      tool.labor_cost_per_seat != null
        ? tool.labor_cost_per_seat * relevantQty
        : effective * params.labor_pct;

    return {
      tool_id: tool.tool_id,
      tool_name: tool.tool_name,
      raw_monthly_cost: round4(rawMonthly),
      effective_monthly_cost: round4(effective),
      labor_cost: round4(laborCost),
      vendor_minimum_applied: vendorMinApplied,
      discount_applied: discountApplied,
    };
  });

  // ── Step 6: Aggregate ────────────────────────────────────────────────────

  const blendedToolCost = round4(
    toolBreakdown.reduce((s, t) => s + t.effective_monthly_cost, 0)
  );
  const totalLabor = round4(
    toolBreakdown.reduce((s, t) => s + t.labor_cost, 0)
  );
  const overheadAmount = round4(
    (blendedToolCost + totalLabor) * params.overhead_pct
  );
  const trueCost = round4(blendedToolCost + totalLabor + overheadAmount);
  const trueCostPerSeat =
    params.seat_count > 0 ? round4(trueCost / params.seat_count) : 0;

  // ── Step 7: Compute sell price by strategy ───────────────────────────────

  let suggestedPrice = 0;
  const margin = Math.min(params.target_margin_pct, 0.99); // guard /0

  if (margin >= 1.0) {
    flags.push({
      type: "negative_margin",
      severity: "error",
      message:
        "Target margin is 100% or greater — pricing cannot be calculated.",
    });
  } else {
    switch (params.sell_strategy) {
      case "cost_plus_margin":
        suggestedPrice =
          margin === 0 ? trueCost : round4(trueCost / (1 - margin));
        break;
      case "monthly_flat_rate":
        suggestedPrice =
          params.sell_config.monthly_flat_price ??
          (margin === 0 ? trueCost : round4(trueCost / (1 - margin)));
        break;
      case "per_endpoint_monthly":
        suggestedPrice = round4(
          (params.sell_config.per_endpoint_sell_price ?? 0) *
            params.assumptions.endpoints
        );
        break;
      case "per_user_monthly":
        suggestedPrice = round4(
          (params.sell_config.per_user_sell_price ?? 0) *
            params.assumptions.users
        );
        break;
    }
  }

  const suggestedPricePerSeat =
    params.seat_count > 0 ? round4(suggestedPrice / params.seat_count) : 0;

  // ── Step 8: Apply bundle discount ────────────────────────────────────────

  const discountedPrice = round4(
    suggestedPrice * (1 - params.discount_pct)
  );
  const discountedPricePerSeat =
    params.seat_count > 0 ? round4(discountedPrice / params.seat_count) : 0;

  // ── Step 9: Compute margins ──────────────────────────────────────────────

  const marginPreDiscount =
    suggestedPrice > 0
      ? round4((suggestedPrice - trueCost) / suggestedPrice)
      : 0;
  const marginPostDiscount =
    discountedPrice > 0
      ? round4((discountedPrice - trueCost) / discountedPrice)
      : 0;

  // ── Step 10: Compute aggregates ──────────────────────────────────────────

  const totalMrr = round4(suggestedPrice);
  const discountedMrr = round4(discountedPrice);
  const totalCostMrr = round4(trueCost);
  const totalMonthlyMargin = round4(discountedMrr - totalCostMrr);
  const totalArr = round4(discountedMrr * 12);
  const contractTotalRevenue = round4(
    discountedMrr * params.contract_term_months
  );

  // ── Step 11: Compute renewal pricing ─────────────────────────────────────

  const totalEffectiveCost = blendedToolCost || 1; // guard /0
  const weightedUplift = tools.reduce((sum, tool, i) => {
    const weight = toolBreakdown[i].effective_monthly_cost / totalEffectiveCost;
    return sum + (tool.renewal_uplift_pct ?? 0) * weight;
  }, 0);

  const renewalSuggestedPricePerSeat = round4(
    suggestedPricePerSeat * (1 + weightedUplift)
  );
  const renewalDiscountedPrice = round4(
    renewalSuggestedPricePerSeat *
      params.seat_count *
      (1 - params.discount_pct)
  );
  const renewalMarginPostDiscount =
    renewalDiscountedPrice > 0
      ? round4(
          (renewalDiscountedPrice - totalCostMrr) / renewalDiscountedPrice
        )
      : 0;

  // ── Step 12: Margin and discount flags ───────────────────────────────────

  if (marginPostDiscount < 0 && params.target_margin_pct < 1.0) {
    flags.push({
      type: "negative_margin",
      severity: "error",
      message: `Post-discount margin is negative (${(marginPostDiscount * 100).toFixed(1)}%).`,
    });
  }

  if (
    marginPostDiscount >= 0 &&
    marginPostDiscount < params.red_zone_margin_pct &&
    params.target_margin_pct < 1.0
  ) {
    flags.push({
      type: "margin_below_red_zone",
      severity: "warning",
      message: `Margin ${(marginPostDiscount * 100).toFixed(1)}% is below your red zone of ${(params.red_zone_margin_pct * 100).toFixed(0)}%.`,
    });
  }

  if (params.discount_pct > params.max_discount_no_approval_pct) {
    flags.push({
      type: "discount_requires_approval",
      severity: "warning",
      message: `Discount ${(params.discount_pct * 100).toFixed(0)}% exceeds your approval threshold of ${(params.max_discount_no_approval_pct * 100).toFixed(0)}%.`,
    });
  }

  return {
    true_cost_per_seat: trueCostPerSeat,
    suggested_price_per_seat: suggestedPricePerSeat,
    discounted_price_per_seat: discountedPricePerSeat,
    margin_pre_discount: marginPreDiscount,
    margin_post_discount: marginPostDiscount,
    total_mrr: totalMrr,
    discounted_mrr: discountedMrr,
    total_cost_mrr: totalCostMrr,
    total_monthly_margin: totalMonthlyMargin,
    total_arr: totalArr,
    contract_total_revenue: contractTotalRevenue,
    renewal_suggested_price_per_seat: renewalSuggestedPricePerSeat,
    renewal_margin_post_discount: renewalMarginPostDiscount,
    tool_breakdown: toolBreakdown,
    pricing_flags: flags,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Legacy Compatibility Layer
//
// The functions below maintain backward compatibility with all existing callers.
// They delegate to the canonical engine internally.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Converts a legacy PricingToolInput to the canonical PricingTool shape.
 */
function legacyToolToCanonical(tool: PricingToolInput): PricingTool {
  return {
    tool_id: tool.id,
    tool_name: tool.name,
    pricing_model: tool.pricing_model,
    per_seat_cost: Number(tool.per_seat_cost),
    per_user_cost: Number(tool.per_user_cost ?? 0),
    flat_monthly_cost: Number(tool.flat_monthly_cost),
    per_org_cost: Number(tool.per_org_cost ?? 0),
    annual_flat_cost: Number(tool.annual_flat_cost ?? 0),
    tier_rules: tool.tier_rules ?? [],
    tier_metric: tool.tier_metric ?? "endpoints",
    vendor_minimum_monthly:
      tool.vendor_minimum_monthly != null
        ? Number(tool.vendor_minimum_monthly)
        : null,
    min_monthly_commit:
      tool.min_monthly_commit != null
        ? Number(tool.min_monthly_commit)
        : null,
    percent_discount: Number(tool.percent_discount ?? 0),
    flat_discount: Number(tool.flat_discount ?? 0),
    labor_cost_per_seat:
      tool.labor_cost_per_seat != null
        ? Number(tool.labor_cost_per_seat)
        : null,
    quantity_multiplier: Number(tool.quantity_multiplier ?? 1),
    renewal_uplift_pct: 0, // legacy tools don't pass this
  };
}

/**
 * Converts a legacy PricingInput to canonical PricingParameters.
 */
function legacyInputToCanonical(input: PricingInput): PricingParameters {
  return {
    seat_count: input.seat_count,
    target_margin_pct: input.target_margin_pct,
    overhead_pct: input.overhead_pct,
    labor_pct: input.labor_pct,
    discount_pct: input.discount_pct,
    contract_term_months: input.contract_term_months,
    sell_strategy:
      (input.sell_config?.strategy as PricingParameters["sell_strategy"]) ??
      "cost_plus_margin",
    sell_config: {
      monthly_flat_price: input.sell_config?.monthly_flat_price,
      per_endpoint_sell_price: input.sell_config?.per_endpoint_sell_price,
      per_user_sell_price: input.sell_config?.per_user_sell_price,
    },
    red_zone_margin_pct: input.red_zone_margin_pct,
    max_discount_no_approval_pct: input.max_discount_no_approval_pct,
    assumptions: input.assumptions ?? {
      endpoints: input.seat_count,
      users: input.seat_count,
      org_count: 1,
    },
  };
}

/**
 * Converts a canonical PricingResult back to the legacy PricingOutput shape.
 */
function canonicalToLegacyOutput(
  result: PricingResult,
  seatCount: number
): PricingOutput {
  // Map canonical flags back to legacy flag types
  const legacyFlags: LegacyPricingFlag[] = result.pricing_flags.map((f) => {
    let legacyType: LegacyPricingFlag["type"];
    switch (f.type) {
      case "vendor_minimum_applied":
        legacyType = "vendor_minimum_applied";
        break;
      case "margin_below_red_zone":
        legacyType = "red_zone_margin";
        break;
      case "discount_requires_approval":
        legacyType = "approval_required";
        break;
      case "negative_margin":
        legacyType = "negative_margin";
        break;
      case "zero_seats":
        legacyType = "zero_seats";
        break;
      default:
        // zero_cost_tool → no legacy equivalent, use vendor_minimum_applied as info
        legacyType = "vendor_minimum_applied";
    }
    return {
      type: legacyType,
      severity: f.severity,
      message: f.message,
      tool_id: f.tool_id,
    };
  });

  // Convert tool breakdown to legacy PricingToolCost shape
  const toolCosts: PricingToolCost[] = result.tool_breakdown.map((tb) => {
    const effectivePerSeat =
      seatCount > 0
        ? round4(tb.effective_monthly_cost / seatCount)
        : 0;
    const rawPerSeat =
      seatCount > 0 ? round4(tb.raw_monthly_cost / seatCount) : 0;
    const laborPerSeat =
      seatCount > 0 ? round4(tb.labor_cost / seatCount) : 0;

    return {
      tool_id: tb.tool_id,
      tool_name: tb.tool_name,
      raw_cost_per_seat: rawPerSeat,
      effective_cost_per_seat: effectivePerSeat,
      labor_cost_per_seat: laborPerSeat,
      monthly_total: round4(tb.effective_monthly_cost + tb.labor_cost),
      vendor_minimum_applied: tb.vendor_minimum_applied,
    };
  });

  const blendedToolCostPerSeat =
    seatCount > 0
      ? round4(
          result.tool_breakdown.reduce(
            (s, t) => s + t.effective_monthly_cost,
            0
          ) / seatCount
        )
      : 0;
  const totalLaborPerSeat =
    seatCount > 0
      ? round4(
          result.tool_breakdown.reduce((s, t) => s + t.labor_cost, 0) /
            seatCount
        )
      : 0;
  const overheadPerSeat =
    round4(result.true_cost_per_seat - blendedToolCostPerSeat - totalLaborPerSeat);

  return {
    tool_costs: toolCosts,
    blended_tool_cost_per_seat: blendedToolCostPerSeat,
    total_labor_cost_per_seat: totalLaborPerSeat,
    overhead_amount_per_seat: overheadPerSeat >= 0 ? overheadPerSeat : 0,
    true_cost_per_seat: result.true_cost_per_seat,
    suggested_price_per_seat: result.suggested_price_per_seat,
    discounted_price_per_seat: result.discounted_price_per_seat,
    margin_pct_pre_discount: result.margin_pre_discount,
    margin_pct_post_discount: result.margin_post_discount,
    total_mrr: result.discounted_mrr,
    total_arr: result.total_arr,
    total_cost_mrr: result.total_cost_mrr,
    total_monthly_margin: result.total_monthly_margin,
    contract_total_revenue: result.contract_total_revenue,
    flags: legacyFlags,
    // Renewal pricing
    renewal_suggested_price_per_seat: result.renewal_suggested_price_per_seat,
    renewal_margin_post_discount: result.renewal_margin_post_discount,
    // v2 compat fields
    msp_sell_price_monthly: result.total_mrr,
    msp_gross_profit_monthly: result.total_monthly_margin,
    msp_gross_margin_pct: result.margin_post_discount,
    normalized_tool_costs: result.tool_breakdown.map((tb) => ({
      tool_id: tb.tool_id,
      tool_name: tb.tool_name,
      normalized_monthly_cost: tb.effective_monthly_cost,
      annotation: null,
    })),
  };
}

/**
 * Legacy-compatible calculatePricing.
 * Accepts the old PricingInput shape and returns the old PricingOutput shape.
 * Internally delegates to calculatePricingCanonical.
 */
export function calculatePricing(input: PricingInput): PricingOutput {
  const tools = input.tools.map(legacyToolToCanonical);
  const params = legacyInputToCanonical(input);
  const result = calculatePricingCanonical(tools, params);
  return canonicalToLegacyOutput(result, input.seat_count);
}

// ══════════════════════════════════════════════════════════════════════════════
// Utility exports — used by UI components for single-tool cost preview
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the normalized monthly cost for a single tool given bundle assumptions.
 * Applies discounts: percentDiscount → flatDiscount → minMonthlyCommit.
 */
export function normalizeToMonthly(
  tool: PricingToolInput,
  assumptions: BundleAssumptions
): number {
  const canonical = legacyToolToCanonical(tool);
  const raw = normalizeToolToMonthly(canonical, assumptions);

  // Apply discount chain
  const percentDiscount = Number(tool.percent_discount ?? 0);
  const flatDiscount = Number(tool.flat_discount ?? 0);
  const minMonthlyCommit = tool.min_monthly_commit != null ? Number(tool.min_monthly_commit) : null;

  let effective = raw * (1 - percentDiscount);
  effective = Math.max(0, effective - flatDiscount);
  if (minMonthlyCommit != null && minMonthlyCommit > 0) {
    effective = Math.max(effective, minMonthlyCommit);
  }

  return round4(effective);
}

/**
 * Returns a human-readable annotation for tools with an annual-to-monthly normalization.
 */
export function annotateNormalization(
  tool: PricingToolInput,
  assumptions?: BundleAssumptions
): string | null {
  function fmtMoney(n: number) {
    return `$${n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
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
 * Computes the total normalized monthly cost for a bundle of tools.
 * Thin wrapper over normalizeToMonthly — used by version-builder.tsx.
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
 * Computes the MSP sell price and gross margin.
 * Thin wrapper — used by version-builder.tsx.
 */
export function computeSellPrice(
  totalMonthlyCost: number,
  sellConfig: LegacySellConfig,
  assumptions: BundleAssumptions
): SellPriceResult {
  let sellPriceMonthly: number;

  switch (sellConfig.strategy) {
    case "cost_plus_margin": {
      const m = sellConfig.target_margin_pct ?? 0;
      sellPriceMonthly =
        m >= 1 ? 0 : round4(totalMonthlyCost / (1 - m));
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
