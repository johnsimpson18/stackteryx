/**
 * Canonical Pricing Types
 *
 * These types define the single source of truth for all pricing calculations
 * across the Stackteryx platform. All pricing surfaces — wizard, version builder,
 * contract creation, AI prompts — use these types.
 */

// ── Tool Input ────────────────────────────────────────────────────────────────

export interface PricingTool {
  tool_id: string;
  tool_name: string;
  pricing_model:
    | "per_seat"
    | "per_user"
    | "flat_monthly"
    | "per_org"
    | "annual_flat"
    | "tiered"
    | "tiered_by_metric";
  per_seat_cost: number;
  per_user_cost: number;
  flat_monthly_cost: number;
  per_org_cost: number;
  annual_flat_cost: number;
  tier_rules: TierRule[];
  tier_metric: string;
  vendor_minimum_monthly: number | null;
  min_monthly_commit: number | null;
  percent_discount: number; // 0-1 fraction
  flat_discount: number;
  labor_cost_per_seat: number | null;
  quantity_multiplier: number;
  renewal_uplift_pct: number; // 0-1 fraction, default 0
}

// Re-use the existing TierRule from lib/types to avoid type conflicts
export type { TierRule } from "@/lib/types";
import type { TierRule, BundleAssumptions } from "@/lib/types";

// PricingAssumptions is identical to BundleAssumptions for full compatibility
export type PricingAssumptions = BundleAssumptions;

export interface SellConfig {
  monthly_flat_price?: number;
  per_endpoint_sell_price?: number;
  per_user_sell_price?: number;
}

export type SellStrategy =
  | "cost_plus_margin"
  | "monthly_flat_rate"
  | "per_endpoint_monthly"
  | "per_user_monthly";

// ── Parameters ────────────────────────────────────────────────────────────────

export interface PricingParameters {
  seat_count: number;
  target_margin_pct: number; // 0-1 fraction
  overhead_pct: number; // 0-1 fraction
  labor_pct: number; // 0-1 fraction
  discount_pct: number; // 0-1 fraction
  contract_term_months: number;
  sell_strategy: SellStrategy;
  sell_config: SellConfig;
  red_zone_margin_pct: number; // from org settings, 0-1 fraction
  max_discount_no_approval_pct: number; // from org settings, 0-1 fraction
  assumptions: PricingAssumptions;
}

// ── Result Types ──────────────────────────────────────────────────────────────

export interface ToolCostBreakdown {
  tool_id: string;
  tool_name: string;
  raw_monthly_cost: number; // before discounts/minimums
  effective_monthly_cost: number; // after discounts/minimums
  labor_cost: number;
  vendor_minimum_applied: boolean;
  discount_applied: boolean;
}

export type PricingFlagType =
  | "vendor_minimum_applied"
  | "margin_below_red_zone"
  | "discount_requires_approval"
  | "zero_cost_tool"
  | "negative_margin"
  | "zero_seats";

export interface PricingFlag {
  type: PricingFlagType;
  severity: "info" | "warning" | "error";
  message: string;
  tool_id?: string;
}

export interface PricingResult {
  // Per-seat figures
  true_cost_per_seat: number;
  suggested_price_per_seat: number;
  discounted_price_per_seat: number;

  // Margin
  margin_pre_discount: number; // 0-1 fraction
  margin_post_discount: number; // 0-1 fraction

  // Monthly aggregates
  total_mrr: number; // suggested price * seat_count (before bundle discount)
  discounted_mrr: number; // discounted price * seat_count
  total_cost_mrr: number; // true cost * seat_count
  total_monthly_margin: number; // discounted_mrr - total_cost_mrr

  // Contract aggregates
  total_arr: number; // discounted_mrr * 12
  contract_total_revenue: number; // discounted_mrr * contract_term_months

  // Renewal pricing (from weighted renewal_uplift_pct across tools)
  renewal_suggested_price_per_seat: number;
  renewal_margin_post_discount: number;

  // Breakdown
  tool_breakdown: ToolCostBreakdown[];

  // Flags
  pricing_flags: PricingFlag[];
}
