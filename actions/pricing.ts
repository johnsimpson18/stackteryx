"use server";

import { revalidatePath } from "next/cache";
import {
  getVersionById,
  getStaleVersionsByOrgId,
} from "@/lib/db/bundle-versions";
import { calculatePricing } from "@/lib/pricing/engine";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/db/profiles";
import { requireOrgMembership } from "@/lib/org-context";
import { hasOrgPermission } from "@/lib/constants";
import { logAudit } from "@/lib/db/audit";
import type { ActionResult, PricingInput, PricingToolInput } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireAuth() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");

  const { orgId, membership } = await requireOrgMembership();
  if (!hasOrgPermission(membership.role, "edit_bundles")) {
    throw new Error("You do not have permission to manage pricing");
  }

  return { profile, orgId, membership };
}

// ── recalculateVersionAction ─────────────────────────────────────────────────

export async function recalculateVersionAction(
  versionId: string
): Promise<ActionResult<{ versionId: string }>> {
  try {
    const { profile, orgId } = await requireAuth();

    const version = await getVersionById(versionId);
    if (!version) {
      return { success: false, error: "Version not found" };
    }

    // Build PricingInput from stored params + fresh tool costs from DB
    const pricingTools: PricingToolInput[] = version.tools
      .filter((vt) => vt.tool != null)
      .map((vt) => {
        const tool = vt.tool!;
        return {
          id: tool.id,
          name: tool.name,
          pricing_model: tool.pricing_model,
          per_seat_cost: Number(tool.per_seat_cost),
          flat_monthly_cost: Number(tool.flat_monthly_cost),
          tier_rules: tool.tier_rules ?? [],
          vendor_minimum_monthly: tool.vendor_minimum_monthly
            ? Number(tool.vendor_minimum_monthly)
            : null,
          labor_cost_per_seat: tool.labor_cost_per_seat
            ? Number(tool.labor_cost_per_seat)
            : null,
          quantity_multiplier: vt.quantity_multiplier,
          annual_flat_cost: Number(tool.annual_flat_cost ?? 0),
          per_user_cost: Number(tool.per_user_cost ?? 0),
          per_org_cost: Number(tool.per_org_cost ?? 0),
          percent_discount: Number(tool.percent_discount ?? 0),
          flat_discount: Number(tool.flat_discount ?? 0),
          min_monthly_commit: tool.min_monthly_commit
            ? Number(tool.min_monthly_commit)
            : null,
          tier_metric: tool.tier_metric,
        };
      });

    const defaultAssumptions = {
      endpoints: version.seat_count,
      users: version.seat_count,
      org_count: 1,
    };

    const pricingInput: PricingInput = {
      tools: pricingTools,
      seat_count: version.seat_count,
      target_margin_pct: version.target_margin_pct,
      overhead_pct: version.overhead_pct,
      labor_pct: version.labor_pct,
      discount_pct: version.discount_pct,
      red_zone_margin_pct: 0.15, // fallback; overridden by org settings in createVersion
      max_discount_no_approval_pct: 0.2,
      contract_term_months: version.contract_term_months,
      assumptions: (version.assumptions as PricingInput["assumptions"]) ?? defaultAssumptions,
      sell_config: version.sell_config as PricingInput["sell_config"],
    };

    const pricing = calculatePricing(pricingInput);

    // UPDATE computed fields + clear staleness
    const supabase = await createClient();
    const { error } = await supabase
      .from("bundle_versions")
      .update({
        computed_true_cost_per_seat: pricing.true_cost_per_seat,
        computed_suggested_price: pricing.suggested_price_per_seat,
        computed_discounted_price: pricing.discounted_price_per_seat,
        computed_margin_pre_discount: pricing.margin_pct_pre_discount,
        computed_margin_post_discount: pricing.margin_pct_post_discount,
        computed_mrr: pricing.total_mrr,
        computed_arr: pricing.total_arr,
        pricing_flags: pricing.flags,
        computed_renewal_price_per_seat: pricing.renewal_suggested_price_per_seat,
        computed_renewal_margin: pricing.renewal_margin_post_discount,
        pricing_last_computed_at: new Date().toISOString(),
        is_pricing_stale: false,
        stale_reason: null,
      })
      .eq("id", versionId);

    if (error) throw error;

    await logAudit(
      profile.id,
      "bundle_updated",
      "bundle_version",
      versionId,
      { action: "recalculate_pricing" },
      orgId
    );

    revalidatePath("/services");
    revalidatePath("/pricing");

    return { success: true, data: { versionId } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to recalculate pricing",
    };
  }
}

// ── updateVersionSellPriceAction ─────────────────────────────────────────────

export async function updateVersionSellPriceAction(
  versionId: string,
  sellPrice: number
): Promise<ActionResult<{ versionId: string }>> {
  try {
    const { profile, orgId } = await requireAuth();

    const version = await getVersionById(versionId);
    if (!version) {
      return { success: false, error: "Version not found" };
    }

    // Set sell_config to monthly_flat_rate with total = sellPrice * seat_count
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from("bundle_versions")
      .update({
        sell_strategy: "monthly_flat_rate",
        sell_config: {
          strategy: "monthly_flat_rate",
          monthly_flat_price: sellPrice * version.seat_count,
        },
      })
      .eq("id", versionId);

    if (updateError) throw updateError;

    await logAudit(
      profile.id,
      "bundle_updated",
      "bundle_version",
      versionId,
      { action: "update_sell_price", sell_price: sellPrice },
      orgId
    );

    // Recalculate with new sell config
    const result = await recalculateVersionAction(versionId);
    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update sell price",
    };
  }
}

// ── batchRecalculateStaleAction ──────────────────────────────────────────────

export async function batchRecalculateStaleAction(): Promise<
  ActionResult<{ recalculated: number; errors: string[] }>
> {
  try {
    const { orgId } = await requireAuth();

    const staleVersions = await getStaleVersionsByOrgId(orgId);
    let recalculated = 0;
    const errors: string[] = [];

    for (const version of staleVersions) {
      const result = await recalculateVersionAction(version.id);
      if (result.success) {
        recalculated++;
      } else {
        errors.push(`v${version.version_number}: ${result.error}`);
      }
    }

    revalidatePath("/services");
    revalidatePath("/pricing");
    revalidatePath("/dashboard");

    return { success: true, data: { recalculated, errors } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to batch recalculate",
    };
  }
}
