"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getVendorImportById } from "@/lib/db/vendors";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult, ExtractedVendor } from "@/lib/types";

// ── Confirm import — creates org_vendors, cost_models, cost_model_tiers ────

export async function confirmImportAction(
  importId: string
): Promise<ActionResult<{ vendors_created: number; cost_models_created: number }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_tools")) {
      return { success: false, error: "You do not have permission to import vendors" };
    }

    const importRecord = await getVendorImportById(orgId, importId);
    if (!importRecord) {
      return { success: false, error: "Import not found" };
    }

    if (importRecord.status !== "pending") {
      return { success: false, error: "Import is not in a confirmable state" };
    }

    const extracted = importRecord.raw_extraction as ExtractedVendor[] | null;
    if (!extracted || extracted.length === 0) {
      return { success: false, error: "No extracted data to import" };
    }

    const supabase = await createClient();
    let vendorsCreated = 0;
    let costModelsCreated = 0;

    // Process each extracted vendor
    for (const vendor of extracted) {
      // Create org_vendor
      const { data: orgVendor, error: vendorError } = await supabase
        .from("org_vendors")
        .insert({
          org_id: orgId,
          display_name: vendor.vendor_name,
          category: vendor.category,
          created_by: profile.id,
          updated_by: profile.id,
        })
        .select("id")
        .single();

      if (vendorError) {
        console.error("Failed to create vendor:", vendor.vendor_name, vendorError);
        continue;
      }

      vendorsCreated++;

      // Create cost models and tiers for this vendor
      for (const cm of vendor.cost_models) {
        const { data: costModel, error: cmError } = await supabase
          .from("cost_models")
          .insert({
            org_vendor_id: orgVendor.id,
            org_id: orgId,
            name: cm.name,
            billing_basis: cm.billing_basis,
            cadence: cm.cadence,
            created_by: profile.id,
            updated_by: profile.id,
          })
          .select("id")
          .single();

        if (cmError) {
          console.error("Failed to create cost model:", cm.name, cmError);
          continue;
        }

        costModelsCreated++;

        // Insert tiers
        if (cm.tiers.length > 0) {
          const { error: tierError } = await supabase
            .from("cost_model_tiers")
            .insert(
              cm.tiers.map((t) => ({
                cost_model_id: costModel.id,
                min_value: t.min_value,
                max_value: t.max_value,
                unit_price: t.unit_price,
              }))
            );

          if (tierError) {
            console.error("Failed to create tiers for:", cm.name, tierError);
          }
        }
      }
    }

    // Update import record as completed
    const summary = { vendors_created: vendorsCreated, cost_models_created: costModelsCreated };
    await supabase
      .from("vendor_imports")
      .update({
        status: "completed",
        import_summary: summary,
      })
      .eq("id", importId);

    await logAudit(profile.id, "INSERT", "vendor_import", importId, {
      filename: importRecord.filename,
      ...summary,
    }, orgId);

    revalidatePath("/vendors");
    return { success: true, data: summary };
  } catch {
    return { success: false, error: "Failed to confirm import" };
  }
}

// ── Discard import ──────────────────────────────────────────────────────────

export async function discardImportAction(
  importId: string
): Promise<ActionResult<null>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId } = await requireOrgMembership();

    const importRecord = await getVendorImportById(orgId, importId);
    if (!importRecord) {
      return { success: false, error: "Import not found" };
    }

    const supabase = await createClient();
    await supabase
      .from("vendor_imports")
      .update({ status: "discarded" })
      .eq("id", importId);

    return { success: true, data: null };
  } catch {
    return { success: false, error: "Failed to discard import" };
  }
}
