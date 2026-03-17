"use server";

import { revalidatePath } from "next/cache";
import { upsertOrgVendorDiscount, deleteOrgVendorDiscount, getOrgVendorById } from "@/lib/db/vendors";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/db/profiles";
import { requireOrgMembership } from "@/lib/org-context";
import { hasOrgPermission } from "@/lib/constants";
import type { ActionResult, DiscountType } from "@/lib/types";

async function requireAuth() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");

  const { orgId, membership } = await requireOrgMembership();
  if (!hasOrgPermission(membership.role, "edit_bundles")) {
    throw new Error("You do not have permission to manage vendor discounts");
  }

  return { profile, orgId };
}

async function verifyOrgVendorOwnership(orgVendorId: string, orgId: string): Promise<boolean> {
  const vendor = await getOrgVendorById(orgId, orgVendorId);
  return vendor !== null;
}

async function markAffectedVersionsStale(orgVendorId: string) {
  const supabase = await createClient();

  // Find the vendor display name, then match tools by that vendor name
  const { data: vendor } = await supabase
    .from("org_vendors")
    .select("display_name, org_id")
    .eq("id", orgVendorId)
    .single();

  if (!vendor) return;

  // Find tools from this vendor (tools.vendor is a display name string)
  const { data: tools } = await supabase
    .from("tools")
    .select("id")
    .eq("org_id", vendor.org_id)
    .eq("vendor", vendor.display_name);

  if (!tools || tools.length === 0) return;

  const toolIds = tools.map((t) => t.id);

  // Find bundle version IDs using these tools
  const { data: versionTools } = await supabase
    .from("bundle_version_tools")
    .select("bundle_version_id")
    .in("tool_id", toolIds);

  if (!versionTools || versionTools.length === 0) return;

  const versionIds = [...new Set(versionTools.map((vt) => vt.bundle_version_id))];

  // Mark those versions stale
  await supabase
    .from("bundle_versions")
    .update({
      is_pricing_stale: true,
      stale_reason: "Vendor discount changed",
    })
    .in("id", versionIds);
}

export async function saveVendorDiscountAction(
  orgVendorId: string,
  discountType: DiscountType,
  value: number,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireAuth();

    const isOwned = await verifyOrgVendorOwnership(orgVendorId, orgId);
    if (!isOwned) {
      return { success: false, error: "Vendor not found" };
    }

    const discount = await upsertOrgVendorDiscount(orgVendorId, {
      discount_type: discountType,
      value,
    });

    await markAffectedVersionsStale(orgVendorId);

    revalidatePath("/settings");
    revalidatePath("/services");
    revalidatePath("/pricing");

    return { success: true, data: { id: discount.id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteVendorDiscountAction(
  orgVendorId: string,
): Promise<ActionResult<null>> {
  try {
    const { orgId } = await requireAuth();

    const isOwned = await verifyOrgVendorOwnership(orgVendorId, orgId);
    if (!isOwned) {
      return { success: false, error: "Vendor not found" };
    }

    await deleteOrgVendorDiscount(orgVendorId);
    await markAffectedVersionsStale(orgVendorId);

    revalidatePath("/settings");
    revalidatePath("/services");
    revalidatePath("/pricing");

    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
