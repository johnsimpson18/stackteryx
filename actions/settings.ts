"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { workspaceSettingsSchema } from "@/lib/schemas/settings";
import { upsertOrgSettings } from "@/lib/db/org-settings";
import type { OrgSettings } from "@/lib/db/org-settings";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/db/profiles";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult } from "@/lib/types";

export async function updateSettingsAction(
  formData: unknown
): Promise<ActionResult<OrgSettings>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "update_settings")) {
      return {
        success: false,
        error: "You do not have permission to update settings",
      };
    }

    const parsed = workspaceSettingsSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    // Convert percentages from display (e.g. 10) to storage (e.g. 0.10)
    const settings = await upsertOrgSettings(orgId, {
      workspace_name: parsed.data.workspace_name,
      default_overhead_pct: parsed.data.default_overhead_pct / 100,
      default_labor_pct: parsed.data.default_labor_pct / 100,
      default_target_margin_pct: parsed.data.default_target_margin_pct / 100,
      red_zone_margin_pct: parsed.data.red_zone_margin_pct / 100,
      max_discount_no_approval_pct:
        parsed.data.max_discount_no_approval_pct / 100,
    });

    await logAudit(profile.id, "settings_updated", "org_settings", orgId, {
      workspace_name: settings.workspace_name,
    }, orgId);

    revalidatePath("/settings");
    return { success: true, data: settings };
  } catch {
    return { success: false, error: "Failed to update settings" };
  }
}

export async function resetOnboardingAction(): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "update_settings")) {
      return { success: false, error: "You do not have permission to do this" };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("org_settings")
      .update({ onboarding_complete: false })
      .eq("org_id", orgId);

    if (error) throw error;
  } catch {
    return { success: false, error: "Failed to reset onboarding" };
  }

  redirect("/onboarding");
}
