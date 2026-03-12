/**
 * Additional Services Pricing
 *
 * Computes recurring MRR and cost for additional services attached to a bundle version.
 * One-time and hourly services are tracked in the breakdown but excluded from MRR totals.
 */

import { round4 } from "./engine";
import type { PricingAssumptions } from "./types";

export interface AdditionalServiceInput {
  service_id: string;
  service_name: string;
  billing_type:
    | "monthly"
    | "per_user"
    | "per_device"
    | "per_site"
    | "hourly"
    | "one_time";
  cost: number;
  sell_price: number;
  cost_override: number | null;
  sell_price_override: number | null;
  quantity: number;
}

export interface AdditionalServiceResult {
  service_id: string;
  service_name: string;
  monthly_cost: number;
  monthly_revenue: number;
  margin_pct: number;
  included_in_mrr: boolean; // false for one_time and hourly
}

export interface AdditionalServicesTotals {
  total_mrr: number;
  total_cost_mrr: number;
  breakdown: AdditionalServiceResult[];
}

export function calculateAdditionalServicesMrr(
  services: AdditionalServiceInput[],
  assumptions: PricingAssumptions
): AdditionalServicesTotals {
  const breakdown: AdditionalServiceResult[] = services.map((s) => {
    const effectiveCost = s.cost_override ?? s.cost;
    const effectiveSell = s.sell_price_override ?? s.sell_price;
    const qty = s.quantity ?? 1;
    let monthlyCost = 0;
    let monthlyRevenue = 0;
    let includedInMrr = true;

    switch (s.billing_type) {
      case "monthly":
        monthlyCost = effectiveCost * qty;
        monthlyRevenue = effectiveSell * qty;
        break;
      case "per_user":
        monthlyCost = effectiveCost * assumptions.users * qty;
        monthlyRevenue = effectiveSell * assumptions.users * qty;
        break;
      case "per_device":
        monthlyCost = effectiveCost * assumptions.endpoints * qty;
        monthlyRevenue = effectiveSell * assumptions.endpoints * qty;
        break;
      case "per_site":
        monthlyCost = effectiveCost * (assumptions.org_count ?? 1) * qty;
        monthlyRevenue = effectiveSell * (assumptions.org_count ?? 1) * qty;
        break;
      case "hourly":
      case "one_time":
        includedInMrr = false;
        break;
    }

    const marginPct =
      monthlyRevenue > 0
        ? round4((monthlyRevenue - monthlyCost) / monthlyRevenue)
        : 0;

    return {
      service_id: s.service_id,
      service_name: s.service_name,
      monthly_cost: round4(monthlyCost),
      monthly_revenue: round4(monthlyRevenue),
      margin_pct: marginPct,
      included_in_mrr: includedInMrr,
    };
  });

  const recurring = breakdown.filter((s) => s.included_in_mrr);
  return {
    total_mrr: round4(recurring.reduce((s, r) => s + r.monthly_revenue, 0)),
    total_cost_mrr: round4(recurring.reduce((s, r) => s + r.monthly_cost, 0)),
    breakdown,
  };
}
