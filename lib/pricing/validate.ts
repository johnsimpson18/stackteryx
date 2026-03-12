import type { PricingOutput } from "@/lib/types";

export interface PricingWarning {
  code:
    | "zero_cost_tool"
    | "margin_below_target"
    | "margin_in_red_zone"
    | "discount_requires_approval"
    | "vendor_minimum_dominance"
    | "negative_margin";
  severity: "warning" | "error";
  message: string;
  toolIds?: string[];
}

export interface ValidationParams {
  targetMarginPct: number;
  redZoneMarginPct: number;
  maxDiscountNoApprovalPct: number;
  discountPct: number;
}

export function validatePricing(
  result: PricingOutput,
  params: ValidationParams,
): PricingWarning[] {
  const warnings: PricingWarning[] = [];

  // 1. Zero-cost tools
  const zeroCost = result.tool_costs.filter(
    (tc) => tc.effective_cost_per_seat === 0,
  );
  if (zeroCost.length > 0) {
    warnings.push({
      code: "zero_cost_tool",
      severity: "warning",
      message: `${zeroCost.map((t) => t.tool_name).join(", ")} ${zeroCost.length === 1 ? "has" : "have"} no cost configured — margin may be overstated.`,
      toolIds: zeroCost.map((t) => t.tool_id),
    });
  }

  // 2. Negative margin
  if (result.margin_pct_post_discount < 0) {
    warnings.push({
      code: "negative_margin",
      severity: "error",
      message: `Margin is negative (${(result.margin_pct_post_discount * 100).toFixed(1)}%). You are losing money on this bundle.`,
    });
  }
  // 3. Margin in red zone (but not negative — handled above)
  else if (result.margin_pct_post_discount < params.redZoneMarginPct) {
    warnings.push({
      code: "margin_in_red_zone",
      severity: "error",
      message: `Margin (${(result.margin_pct_post_discount * 100).toFixed(1)}%) is in the red zone (below ${(params.redZoneMarginPct * 100).toFixed(0)}%).`,
    });
  }
  // 4. Margin below target (but above red zone)
  else if (result.margin_pct_post_discount < params.targetMarginPct) {
    warnings.push({
      code: "margin_below_target",
      severity: "warning",
      message: `Margin (${(result.margin_pct_post_discount * 100).toFixed(1)}%) is below target (${(params.targetMarginPct * 100).toFixed(0)}%).`,
    });
  }

  // 5. Discount requires approval
  if (params.discountPct > params.maxDiscountNoApprovalPct) {
    warnings.push({
      code: "discount_requires_approval",
      severity: "warning",
      message: `Discount of ${(params.discountPct * 100).toFixed(0)}% exceeds the ${(params.maxDiscountNoApprovalPct * 100).toFixed(0)}% auto-approval threshold.`,
    });
  }

  // 6. Vendor minimum dominance (any tool where minimum > normal cost × 1.5)
  const dominant = result.tool_costs.filter(
    (tc) =>
      tc.vendor_minimum_applied &&
      tc.raw_cost_per_seat > 0 &&
      tc.effective_cost_per_seat > tc.raw_cost_per_seat * 1.5,
  );
  if (dominant.length > 0) {
    warnings.push({
      code: "vendor_minimum_dominance",
      severity: "warning",
      message: `${dominant.map((t) => t.tool_name).join(", ")} ${dominant.length === 1 ? "is" : "are"} dominated by vendor minimum pricing (>1.5× normal cost).`,
      toolIds: dominant.map((t) => t.tool_id),
    });
  }

  return warnings;
}
