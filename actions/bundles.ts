"use server";

import { revalidatePath } from "next/cache";
import {
  createBundleSchema,
  updateBundleSchema,
  createVersionSchema,
} from "@/lib/schemas/bundle";
import {
  createBundle as dbCreateBundle,
  updateBundle as dbUpdateBundle,
  archiveBundle as dbArchiveBundle,
} from "@/lib/db/bundles";
import { createVersion as dbCreateVersion } from "@/lib/db/bundle-versions";
import { getBundleById } from "@/lib/db/bundles";
import { getToolById } from "@/lib/db/tools";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgSettingsOrDefaults } from "@/lib/db/org-settings";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type {
  ActionResult,
  Bundle,
  BundleVersionWithTools,
  PricingOutput,
  PricingToolInput,
} from "@/lib/types";
import type { BundleRecommendation, ClientProfile } from "@/lib/types/recommend";
import { checkLimit } from "@/actions/billing";

export async function createBundleAction(
  formData: unknown
): Promise<ActionResult<Bundle>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_bundles")) {
      return {
        success: false,
        error: "You do not have permission to create bundles",
      };
    }

    // Plan limit check
    const limitCheck = await checkLimit("services");
    if (!limitCheck.allowed) {
      return { success: false, error: "LIMIT_REACHED" };
    }

    const parsed = createBundleSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    const bundle = await dbCreateBundle({
      name: parsed.data.name,
      bundle_type: parsed.data.bundle_type,
      description: parsed.data.description ?? "",
      created_by: profile.id,
      org_id: orgId,
    });

    await logAudit(profile.id, "bundle_created", "bundle", bundle.id, {
      name: bundle.name,
    }, orgId);

    revalidatePath("/services");
    return { success: true, data: bundle };
  } catch {
    return { success: false, error: "Failed to create bundle" };
  }
}

export async function updateBundleAction(
  id: string,
  formData: unknown
): Promise<ActionResult<Bundle>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_bundles")) {
      return {
        success: false,
        error: "You do not have permission to edit bundles",
      };
    }

    // Verify bundle belongs to the active org
    const existingBundle = await getBundleById(id);
    if (!existingBundle || existingBundle.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const parsed = updateBundleSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    const bundle = await dbUpdateBundle(id, parsed.data);

    await logAudit(profile.id, "bundle_updated", "bundle", bundle.id, {
      name: bundle.name,
    }, orgId);

    revalidatePath("/services");
    revalidatePath(`/services/${id}`);
    return { success: true, data: bundle };
  } catch {
    return { success: false, error: "Failed to update bundle" };
  }
}

export async function archiveBundleAction(
  id: string
): Promise<ActionResult<Bundle>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "archive_bundles")) {
      return {
        success: false,
        error: "You do not have permission to archive bundles",
      };
    }

    // Verify bundle belongs to the active org
    const existingBundle = await getBundleById(id);
    if (!existingBundle || existingBundle.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const bundle = await dbArchiveBundle(id);

    await logAudit(profile.id, "bundle_archived", "bundle", bundle.id, {
      name: bundle.name,
    }, orgId);

    revalidatePath("/services");
    revalidatePath(`/services/${id}`);
    return { success: true, data: bundle };
  } catch {
    return { success: false, error: "Failed to archive bundle" };
  }
}

export async function createVersionAction(
  bundleId: string,
  formData: unknown
): Promise<
  ActionResult<{ version: BundleVersionWithTools; pricing: PricingOutput }>
> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_versions")) {
      return {
        success: false,
        error: "You do not have permission to create versions",
      };
    }

    // Verify bundle belongs to the active org
    const bundleCheck = await getBundleById(bundleId);
    if (!bundleCheck || bundleCheck.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const parsed = createVersionSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    // Fetch workspace settings for red_zone and max_discount thresholds
    const settings = await getOrgSettingsOrDefaults(orgId);

    const result = await dbCreateVersion({
      bundle_id: bundleId,
      seat_count: parsed.data.seat_count,
      risk_tier: parsed.data.risk_tier,
      contract_term_months: parsed.data.contract_term_months,
      target_margin_pct: parsed.data.target_margin_pct,
      overhead_pct: parsed.data.overhead_pct,
      labor_pct: parsed.data.labor_pct,
      discount_pct: parsed.data.discount_pct,
      notes: parsed.data.notes ?? "",
      tools: parsed.data.tools,
      created_by: profile.id,
      red_zone_margin_pct: Number(settings.red_zone_margin_pct),
      max_discount_no_approval_pct: Number(
        settings.max_discount_no_approval_pct
      ),
      sell_strategy: parsed.data.sell_strategy,
      sell_config: parsed.data.sell_config as Record<string, unknown> | undefined,
      assumptions: parsed.data.assumptions as Record<string, unknown> | undefined,
    });

    await logAudit(profile.id, "version_created", "bundle_version", result.version.id, {
      bundle_id: bundleId,
      version_number: result.version.version_number,
    }, orgId);

    revalidatePath(`/services/${bundleId}`);
    revalidatePath("/services");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to create version" };
  }
}

// ── AI Recommendation → Bundle ────────────────────────────────────────────────

export async function createBundleFromRecommendation(
  recommendation: BundleRecommendation,
  clientProfile: ClientProfile
): Promise<ActionResult<{ bundleId: string; versionId: string }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_bundles")) {
      return { success: false, error: "You do not have permission to create bundles" };
    }

    // Plan limit check
    const limitCheck = await checkLimit("services");
    if (!limitCheck.allowed) {
      return { success: false, error: "LIMIT_REACHED" };
    }

    const settings = await getOrgSettingsOrDefaults(orgId);

    // ── 1. Resolve tools (only include tools belonging to the active org) ─
    const resolvedTools: PricingToolInput[] = [];
    for (const toolId of recommendation.toolIds) {
      const tool = await getToolById(toolId);
      if (!tool || tool.org_id !== orgId) continue;
      resolvedTools.push({
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
        quantity_multiplier: 1,
        annual_flat_cost: tool.annual_flat_cost,
        per_user_cost: tool.per_user_cost,
        per_org_cost: tool.per_org_cost,
        percent_discount: tool.percent_discount,
        flat_discount: tool.flat_discount,
        min_monthly_commit: tool.min_monthly_commit,
        tier_metric: tool.tier_metric,
      });
    }

    if (resolvedTools.length === 0) {
      return { success: false, error: "None of the recommended tools were found in the catalog." };
    }

    // ── 2. Create bundle ──────────────────────────────────────────────────
    const bundle = await dbCreateBundle({
      name: recommendation.name,
      bundle_type: "custom",
      description: recommendation.description,
      created_by: profile.id,
      org_id: orgId,
    });

    // ── 3. Create version with pricing ────────────────────────────────────
    const s = recommendation.suggestedSettings;
    const result = await dbCreateVersion({
      bundle_id: bundle.id,
      seat_count: clientProfile.seatCount,
      risk_tier: s.riskTier,
      contract_term_months: s.contractTermMonths,
      target_margin_pct: s.targetMarginPct,
      overhead_pct: s.overheadPct,
      labor_pct: s.laborPct,
      discount_pct: s.discountPct,
      notes: `Generated by AI for ${clientProfile.clientName} (${clientProfile.industry}, ${clientProfile.seatCount} seats). Tier: ${recommendation.tier}.`,
      tools: resolvedTools.map((t) => ({
        tool_id: t.id,
        quantity_multiplier: 1,
      })),
      created_by: profile.id,
      red_zone_margin_pct: Number(settings.red_zone_margin_pct),
      max_discount_no_approval_pct: Number(settings.max_discount_no_approval_pct),
    });

    // ── 4. Audit log ──────────────────────────────────────────────────────
    await logAudit(
      profile.id,
      "bundle_created_from_recommendation",
      "bundle",
      bundle.id,
      {
        tier: recommendation.tier,
        client_name: clientProfile.clientName,
        industry: clientProfile.industry,
        seat_count: clientProfile.seatCount,
        tool_count: resolvedTools.length,
      },
      orgId
    );

    revalidatePath("/services");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { bundleId: bundle.id, versionId: result.version.id },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create bundle";
    return { success: false, error: msg };
  }
}

/**
 * Archive multiple bundles at once (used by onboarding to skip rejected suggestions).
 */
export async function archiveBundlesAction(
  bundleIds: string[]
): Promise<ActionResult<{ archived: number }>> {
  try {
    if (bundleIds.length === 0) return { success: true, data: { archived: 0 } };

    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "archive_bundles")) {
      return {
        success: false,
        error: "You do not have permission to archive bundles",
      };
    }

    let archived = 0;

    for (const id of bundleIds) {
      const bundle = await getBundleById(id);
      if (bundle && bundle.org_id === orgId) {
        await dbArchiveBundle(id);
        archived++;
      }
    }

    revalidatePath("/services");
    revalidatePath("/dashboard");
    return { success: true, data: { archived } };
  } catch {
    return { success: false, error: "Failed to archive bundles" };
  }
}
