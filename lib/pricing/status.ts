import type { BundleVersion } from "@/lib/types";

export type PricingStatus = "READY" | "INCOMPLETE" | "STALE" | "NOT_SET";

/**
 * Computes the pricing status for a bundle version.
 *
 * - NOT_SET: no version exists
 * - STALE: version has is_pricing_stale flag set
 * - INCOMPLETE: version has zero-cost tools (pricing data is incomplete)
 * - READY: pricing is fully computed and up-to-date
 */
export function computePricingStatus(
  version: BundleVersion | null,
  hasZeroCostTools: boolean
): PricingStatus {
  if (!version) return "NOT_SET";

  if (version.is_pricing_stale) return "STALE";

  if (hasZeroCostTools) return "INCOMPLETE";

  if (
    version.computed_suggested_price == null ||
    version.computed_suggested_price === 0
  ) {
    return "INCOMPLETE";
  }

  return "READY";
}
