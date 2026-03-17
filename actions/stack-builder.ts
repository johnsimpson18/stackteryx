"use server";

import { revalidatePath } from "next/cache";
import { createBundle as dbCreateBundle, updateBundle } from "@/lib/db/bundles";
import { createVersion as dbCreateVersion } from "@/lib/db/bundle-versions";
import { upsertServiceOutcome } from "@/lib/db/service-outcomes";
import {
  createAdditionalService,
  addAdditionalServiceToVersion,
} from "@/lib/db/additional-services";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgSettingsOrDefaults } from "@/lib/db/org-settings";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import { checkLimit } from "@/actions/billing";
import { OUTCOME_LIBRARY } from "@/lib/outcome-library";
import type { ActionResult, SelectedOutcomeRecord, AdditionalServiceCategory } from "@/lib/types";

interface SaveStackAddonInput {
  addonId: string;
  name: string;
  description: string;
  category: string;
  monthlyPrice: number;
}

interface SaveStackInput {
  serviceName: string;
  toolIds: string[];
  seatCount: number;
  suggestedOutcomeIds?: string[];
  addonServices?: SaveStackAddonInput[];
}

// Map addon category strings to the DB enum
const ADDON_CATEGORY_MAP: Record<string, AdditionalServiceCategory> = {
  advisory: "consulting",
  response: "retainer",
  compliance: "compliance",
  support: "help_desk",
};

export async function saveStackAsService(
  input: SaveStackInput
): Promise<ActionResult<{ bundleId: string }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_bundles")) {
      return { success: false, error: "You do not have permission to create services" };
    }

    // Plan limit check
    const limitCheck = await checkLimit("services");
    if (!limitCheck.allowed) {
      return { success: false, error: "LIMIT_REACHED" };
    }

    // 1. Create the bundle (service)
    const bundle = await dbCreateBundle({
      name: input.serviceName,
      bundle_type: "custom",
      description: "",
      created_by: profile.id,
      org_id: orgId,
    });

    // 2. Save outcomes if suggested
    if (input.suggestedOutcomeIds && input.suggestedOutcomeIds.length > 0) {
      const outcomeMap = new Map(OUTCOME_LIBRARY.map((o) => [o.id, o]));
      const selectedOutcomes: SelectedOutcomeRecord[] = [];
      for (const id of input.suggestedOutcomeIds) {
        const preset = outcomeMap.get(id);
        if (!preset) continue;
        selectedOutcomes.push({
          id: preset.id,
          statement: preset.statement,
          description: preset.description,
          isCustom: false,
          complianceFrameworks: preset.complianceFrameworks,
        });
      }

      if (selectedOutcomes.length > 0) {
        await upsertServiceOutcome(orgId, bundle.id, {
          outcome_type: "preset",
          selected_outcomes: selectedOutcomes,
        });
      }
    }

    // 3. Mark wizard layers complete and set active
    await updateBundle(bundle.id, {
      wizard_in_progress: false,
      wizard_step_completed: 6,
      outcome_layer_complete: true,
      stack_layer_complete: true,
      economics_layer_complete: true,
      enablement_layer_complete: true,
      status: "active",
    });

    // 4. Fetch org settings for pricing thresholds
    const settings = await getOrgSettingsOrDefaults(orgId);

    // 5. Create the version with tools + pricing
    const result = await dbCreateVersion({
      bundle_id: bundle.id,
      seat_count: input.seatCount,
      risk_tier: "medium",
      contract_term_months: 12,
      target_margin_pct: 0.35,
      overhead_pct: 0.10,
      labor_pct: 0.15,
      discount_pct: 0,
      notes: "Created via Stack Builder",
      tools: input.toolIds.map((id) => ({ tool_id: id, quantity_multiplier: 1 })),
      created_by: profile.id,
      red_zone_margin_pct: Number(settings.red_zone_margin_pct),
      max_discount_no_approval_pct: Number(settings.max_discount_no_approval_pct),
    });

    // 6. Create and attach add-on services to the version
    if (input.addonServices && input.addonServices.length > 0) {
      for (const addon of input.addonServices) {
        const dbCategory = ADDON_CATEGORY_MAP[addon.category] ?? "consulting";
        const svc = await createAdditionalService({
          org_id: orgId,
          name: addon.name,
          description: addon.description,
          category: dbCategory,
          billing_type: "monthly",
          cost_type: "internal_labor",
          cost: 0,
          sell_price: addon.monthlyPrice,
          status: "active",
        });

        await addAdditionalServiceToVersion(
          result.version.id,
          svc.id,
          orgId,
          { sell_price_override: addon.monthlyPrice }
        );
      }
    }

    await logAudit(profile.id, "bundle_created", "bundle", bundle.id, {
      name: input.serviceName,
      via: "stack_builder",
      tool_count: input.toolIds.length,
      addon_count: input.addonServices?.length ?? 0,
    }, orgId);

    revalidatePath("/services");
    revalidatePath("/dashboard");

    return { success: true, data: { bundleId: bundle.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save service",
    };
  }
}
