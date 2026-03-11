"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createOrgVendor as dbCreateOrgVendor,
  updateOrgVendor as dbUpdateOrgVendor,
  createCostModel as dbCreateCostModel,
  updateCostModel as dbUpdateCostModel,
  upsertCostModelTiers as dbUpsertCostModelTiers,
  upsertOrgVendorDiscount as dbUpsertOrgVendorDiscount,
  updateCostModelTierPrice as dbUpdateCostModelTierPrice,
  getOrgVendorById,
  getOrgVendors,
} from "@/lib/db/vendors";
import { getCurrentProfile } from "@/lib/db/profiles";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult, OrgVendor, CostModelWithTiers, OrgVendorDiscount } from "@/lib/types";

// ── Schemas ──────────────────────────────────────────────────────────────────

const orgVendorSchema = z.object({
  display_name: z.string().min(1, "Vendor name is required").max(200),
  category: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  vendor_id: z.string().uuid().nullable().optional(),
});

const costModelSchema = z.object({
  org_vendor_id: z.string().uuid("Invalid vendor"),
  name: z.string().min(1, "Cost model name is required").max(200),
  billing_basis: z.enum([
    "per_user", "per_device", "per_domain", "per_location",
    "per_org", "flat_monthly", "usage", "tiered",
  ]),
  cadence: z.enum(["monthly", "annual"]),
  tiers: z.array(
    z.object({
      min_value: z.coerce.number().min(0, "Min value must be >= 0"),
      max_value: z.coerce.number().nullable().optional(),
      unit_price: z.coerce.number().positive("Unit price must be > 0"),
    })
  ).default([]),
});

const discountSchema = z.object({
  org_vendor_id: z.string().uuid("Invalid vendor"),
  discount_type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().positive("Discount value must be > 0"),
});

// ── Create org vendor ────────────────────────────────────────────────────────

export async function createOrgVendorAction(
  formData: unknown
): Promise<ActionResult<OrgVendor>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_tools")) {
      return { success: false, error: "You do not have permission to add vendors" };
    }

    const parsed = orgVendorSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const vendor = await dbCreateOrgVendor(orgId, profile.id, parsed.data);

    await logAudit(profile.id, "INSERT", "org_vendor", vendor.id, {
      display_name: vendor.display_name,
    }, orgId);

    revalidatePath("/vendors");
    return { success: true, data: vendor };
  } catch {
    return { success: false, error: "Failed to create vendor" };
  }
}

// ── Update org vendor ────────────────────────────────────────────────────────

export async function updateOrgVendorAction(
  vendorId: string,
  formData: unknown
): Promise<ActionResult<OrgVendor>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_tools")) {
      return { success: false, error: "You do not have permission to edit vendors" };
    }

    // Verify vendor belongs to the active org
    const existing = await getOrgVendorById(orgId, vendorId);
    if (!existing) {
      return { success: false, error: "Vendor not found" };
    }

    const parsed = orgVendorSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const vendor = await dbUpdateOrgVendor(orgId, profile.id, vendorId, parsed.data);

    await logAudit(profile.id, "UPDATE", "org_vendor", vendor.id, {
      display_name: vendor.display_name,
    }, orgId);

    revalidatePath("/vendors");
    revalidatePath(`/vendors/${vendorId}`);
    return { success: true, data: vendor };
  } catch {
    return { success: false, error: "Failed to update vendor" };
  }
}

// ── Save cost model (create or update) ───────────────────────────────────────

export async function saveCostModelAction(
  formData: unknown,
  costModelId?: string
): Promise<ActionResult<CostModelWithTiers>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_tools")) {
      return { success: false, error: "You do not have permission to manage cost models" };
    }

    const parsed = costModelSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    let model;
    if (costModelId) {
      model = await dbUpdateCostModel(orgId, profile.id, costModelId, {
        name: parsed.data.name,
        billing_basis: parsed.data.billing_basis,
        cadence: parsed.data.cadence,
      });
    } else {
      model = await dbCreateCostModel(orgId, profile.id, {
        org_vendor_id: parsed.data.org_vendor_id,
        name: parsed.data.name,
        billing_basis: parsed.data.billing_basis,
        cadence: parsed.data.cadence,
      });
    }

    // Upsert tiers
    const tiers = await dbUpsertCostModelTiers(model.id, parsed.data.tiers);

    await logAudit(
      profile.id,
      costModelId ? "UPDATE" : "INSERT",
      "cost_model",
      model.id,
      { name: model.name, tier_count: tiers.length },
      orgId
    );

    // Find the org_vendor_id to revalidate the right path
    revalidatePath(`/vendors/${model.org_vendor_id}`);
    return { success: true, data: { ...model, tiers } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save cost model";
    return { success: false, error: msg };
  }
}

// ── Save discount ────────────────────────────────────────────────────────────

export async function saveDiscountAction(
  formData: unknown
): Promise<ActionResult<OrgVendorDiscount>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_tools")) {
      return { success: false, error: "You do not have permission to manage discounts" };
    }

    const parsed = discountSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    // Verify the org_vendor belongs to this org
    const vendor = await getOrgVendorById(orgId, parsed.data.org_vendor_id);
    if (!vendor) {
      return { success: false, error: "Vendor not found" };
    }

    const discount = await dbUpsertOrgVendorDiscount(parsed.data.org_vendor_id, {
      discount_type: parsed.data.discount_type,
      value: parsed.data.value,
    });

    await logAudit(profile.id, "UPDATE", "org_vendor_discount", discount.id, {
      org_vendor_id: parsed.data.org_vendor_id,
      discount_type: parsed.data.discount_type,
    }, orgId);

    revalidatePath(`/vendors/${parsed.data.org_vendor_id}`);
    return { success: true, data: discount };
  } catch {
    return { success: false, error: "Failed to save discount" };
  }
}

// ── Update single tier price ──────────────────────────────────────────────

export async function updateTierPriceAction(
  tierId: string,
  unitPrice: number
): Promise<ActionResult<{ id: string; unit_price: number }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_tools")) {
      return { success: false, error: "You do not have permission to edit tier pricing" };
    }

    if (typeof unitPrice !== "number" || isNaN(unitPrice) || unitPrice < 0) {
      return { success: false, error: "Unit price must be ≥ 0" };
    }

    const tier = await dbUpdateCostModelTierPrice(tierId, unitPrice, orgId);

    await logAudit(profile.id, "UPDATE", "cost_model_tier", tier.id, {
      unit_price: unitPrice,
    }, orgId);

    revalidatePath("/vendors");
    return { success: true, data: { id: tier.id, unit_price: tier.unit_price } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update tier price";
    return { success: false, error: msg };
  }
}

// ── Delete cost model ────────────────────────────────────────────────────────

export async function deleteCostModelAction(
  costModelId: string,
  orgVendorId: string
): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_tools")) {
      return { success: false, error: "You do not have permission to delete cost models" };
    }

    // Verify the vendor belongs to this org
    const vendor = await getOrgVendorById(orgId, orgVendorId);
    if (!vendor) {
      return { success: false, error: "Not found" };
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Delete tiers first (cascade), then the cost model
    await supabase.from("cost_model_tiers").delete().eq("cost_model_id", costModelId);
    const { error } = await supabase.from("cost_models").delete().eq("id", costModelId);
    if (error) throw error;

    await logAudit(profile.id, "DELETE", "cost_model", costModelId, {}, orgId);

    revalidatePath(`/vendors/${orgVendorId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete cost model" };
  }
}

// ── Add vendors from library ────────────────────────────────────────────────

export async function addVendorsFromLibraryAction(
  vendorNames: string[]
): Promise<ActionResult<{ count: number }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_tools")) {
      return { success: false, error: "You do not have permission to add vendors" };
    }

    if (vendorNames.length === 0) {
      return { success: false, error: "No vendors selected" };
    }

    // Get existing org vendors to avoid duplicates
    const existingVendors = await getOrgVendors(orgId);
    const existingNames = new Set(
      existingVendors.map((v) => v.display_name.toLowerCase())
    );

    let addedCount = 0;

    for (const name of vendorNames) {
      if (existingNames.has(name.toLowerCase())) continue;

      const vendor = await dbCreateOrgVendor(orgId, profile.id, {
        display_name: name,
      });

      await logAudit(profile.id, "INSERT", "org_vendor", vendor.id, {
        display_name: vendor.display_name,
        source: "library",
      }, orgId);

      existingNames.add(name.toLowerCase());
      addedCount++;
    }

    revalidatePath("/vendors");
    return { success: true, data: { count: addedCount } };
  } catch {
    return { success: false, error: "Failed to add vendors from library" };
  }
}
