import type { TierRule } from "@/lib/types";

/**
 * Legacy tier resolver for the "tiered" pricing model.
 * Finds the matching tier by seatCount and returns the per-seat rate (costPerSeat).
 * Used by calculatePricing() for backward compatibility.
 */
export function resolveTieredCost(
  tierRules: TierRule[],
  seatCount: number
): number {
  if (tierRules.length === 0) return 0;

  for (const tier of tierRules) {
    const matchesMin = seatCount >= tier.minSeats;
    const matchesMax = tier.maxSeats === null || seatCount <= tier.maxSeats;
    if (matchesMin && matchesMax) {
      return tier.costPerSeat;
    }
  }

  // No tier matched — use the last tier as fallback
  return tierRules[tierRules.length - 1].costPerSeat;
}

/**
 * Result from resolving a tiered_by_metric tier.
 */
export interface MetricTierResult {
  monthlyCost: number;   // already normalized to monthly
  annualCost: number | null;  // the raw annual value if priceType = "annualFlat", else null
  priceType: string;
}

/**
 * Resolves a tiered_by_metric tier based on a metric value (endpoints, users, or headcount).
 * Supports priceType: "unitMonthly" | "flatMonthly" | "annualFlat".
 *
 * - unitMonthly: monthlyCost = metricValue × unitPriceMonthly (same as legacy costPerSeat × count)
 * - flatMonthly: monthlyCost = flatMonthly (fixed regardless of metric value within tier)
 * - annualFlat:  monthlyCost = annualFlat / 12 (normalize yearly to monthly)
 *
 * Falls back to legacy costPerSeat × metricValue if priceType is absent.
 */
export function resolveMetricTier(
  tierRules: TierRule[],
  metricValue: number
): MetricTierResult {
  if (tierRules.length === 0) {
    return { monthlyCost: 0, annualCost: null, priceType: "unitMonthly" };
  }

  // Find matching tier
  let matchedTier: TierRule | undefined;
  for (const tier of tierRules) {
    const matchesMin = metricValue >= tier.minSeats;
    const matchesMax = tier.maxSeats === null || metricValue <= tier.maxSeats;
    if (matchesMin && matchesMax) {
      matchedTier = tier;
      break;
    }
  }

  // Fallback to last tier if none matched
  if (!matchedTier) {
    matchedTier = tierRules[tierRules.length - 1];
  }

  const priceType = matchedTier.priceType ?? "unitMonthly";

  switch (priceType) {
    case "unitMonthly": {
      const rate = matchedTier.unitPriceMonthly ?? matchedTier.costPerSeat;
      return {
        monthlyCost: rate * metricValue,
        annualCost: null,
        priceType,
      };
    }
    case "flatMonthly": {
      return {
        monthlyCost: matchedTier.flatMonthly ?? 0,
        annualCost: null,
        priceType,
      };
    }
    case "annualFlat": {
      const annual = matchedTier.annualFlat ?? 0;
      return {
        monthlyCost: annual / 12,
        annualCost: annual,
        priceType,
      };
    }
    default:
      return { monthlyCost: 0, annualCost: null, priceType: "unitMonthly" };
  }
}
