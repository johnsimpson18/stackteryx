"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createScenario as dbCreate,
  updateScenario as dbUpdate,
  deleteScenario as dbDelete,
  getScenarioById,
} from "@/lib/db/scenarios";
import { getBundleById } from "@/lib/db/bundles";
import { getCurrentProfile } from "@/lib/db/profiles";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult, ScenarioInputs } from "@/lib/types";

const scenarioSchema = z.object({
  bundle_id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(100),
  endpoints: z.coerce.number().int().min(0).default(30),
  users: z.coerce.number().int().min(0).default(30),
  headcount: z.coerce.number().int().min(0).default(30),
  org_count: z.coerce.number().int().min(1).default(1),
  contract_term_months: z.coerce.number().int().min(1).default(12),
  sites: z.coerce.number().int().min(1).default(1),
  sell_config: z
    .object({
      strategy: z.string(),
      monthly_flat_price: z.number().optional(),
      per_endpoint_sell_price: z.number().optional(),
      per_user_sell_price: z.number().optional(),
      target_margin_pct: z.number().optional(),
    })
    .default({ strategy: "cost_plus_margin", target_margin_pct: 0.35 }),
  is_default: z.boolean().default(false),
});

export async function createScenarioAction(
  formData: unknown
): Promise<ActionResult<ScenarioInputs>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_bundles")) {
      return { success: false, error: "You do not have permission to create scenarios" };
    }

    const parsed = scenarioSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    // Verify the bundle belongs to the active org
    const bundle = await getBundleById(parsed.data.bundle_id);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const scenario = await dbCreate({
      ...parsed.data,
      sell_config: parsed.data.sell_config as import("@/lib/types").SellConfig,
    });

    revalidatePath(`/services/${parsed.data.bundle_id}`);
    revalidatePath(`/services/${parsed.data.bundle_id}/versions/new`);
    return { success: true, data: scenario };
  } catch {
    return { success: false, error: "Failed to create scenario" };
  }
}

export async function updateScenarioAction(
  id: string,
  formData: unknown
): Promise<ActionResult<ScenarioInputs>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_bundles")) {
      return { success: false, error: "You do not have permission to update scenarios" };
    }

    // Verify scenario belongs to the active org (via its bundle)
    const existingScenario = await getScenarioById(id);
    if (!existingScenario) {
      return { success: false, error: "Not found" };
    }
    const scenarioBundle = await getBundleById(existingScenario.bundle_id);
    if (!scenarioBundle || scenarioBundle.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const parsed = scenarioSchema.partial().safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    const { bundle_id, ...updates } = parsed.data;
    const scenario = await dbUpdate(id, {
      ...updates,
      sell_config: updates.sell_config as import("@/lib/types").SellConfig | undefined,
    });

    if (bundle_id) {
      revalidatePath(`/services/${bundle_id}/versions/new`);
    }
    return { success: true, data: scenario };
  } catch {
    return { success: false, error: "Failed to update scenario" };
  }
}

export async function deleteScenarioAction(
  id: string,
  bundleId: string
): Promise<ActionResult<void>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_bundles")) {
      return { success: false, error: "You do not have permission to delete scenarios" };
    }

    // Verify scenario belongs to the active org (via its bundle)
    const existingScenario = await getScenarioById(id);
    if (!existingScenario) {
      return { success: false, error: "Not found" };
    }
    const scenarioBundle = await getBundleById(existingScenario.bundle_id);
    if (!scenarioBundle || scenarioBundle.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    await dbDelete(id);
    revalidatePath(`/services/${bundleId}/versions/new`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete scenario" };
  }
}
