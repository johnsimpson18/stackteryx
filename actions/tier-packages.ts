"use server";

import { revalidatePath } from "next/cache";
import {
  createTierPackage as dbCreateTierPackage,
  updateTierPackage as dbUpdateTierPackage,
  deleteTierPackage as dbDeleteTierPackage,
  getTierPackageById,
  getTierPackageWithItems,
  upsertTierPackageItems,
} from "@/lib/db/tier-packages";
import { getCurrentProfile } from "@/lib/db/profiles";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult, TierPackage, TierPackageWithItems } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireAuth() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");

  const { orgId, membership } = await requireOrgMembership();
  if (!hasOrgPermission(membership.role, "create_bundles")) {
    throw new Error("You do not have permission to manage packages");
  }

  return { profile, orgId, membership };
}

// ── Create package ───────────────────────────────────────────────────────────

export async function createTierPackageAction(
  data: { name: string; description?: string }
): Promise<ActionResult<TierPackage>> {
  try {
    const { profile, orgId } = await requireAuth();

    const pkg = await dbCreateTierPackage(orgId, profile.id, {
      name: data.name,
      description: data.description,
    });

    await logAudit(profile.id, "bundle_created", "tier_package", pkg.id, {
      name: pkg.name,
      via: "packages",
    }, orgId);

    revalidatePath("/packages");
    return { success: true, data: pkg };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create package" };
  }
}

// ── Update package ───────────────────────────────────────────────────────────

export async function updateTierPackageAction(
  packageId: string,
  data: { name?: string; description?: string }
): Promise<ActionResult<TierPackage>> {
  try {
    const { profile, orgId } = await requireAuth();

    const existing = await getTierPackageById(orgId, packageId);
    if (!existing) return { success: false, error: "Package not found" };

    const pkg = await dbUpdateTierPackage(orgId, profile.id, packageId, data);

    await logAudit(profile.id, "bundle_updated", "tier_package", packageId, {
      via: "packages",
    }, orgId);

    revalidatePath("/packages");
    revalidatePath(`/packages/${packageId}`);
    return { success: true, data: pkg };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update package" };
  }
}

// ── Delete package ───────────────────────────────────────────────────────────

export async function deleteTierPackageAction(
  packageId: string
): Promise<ActionResult<void>> {
  try {
    const { profile, orgId } = await requireAuth();

    const existing = await getTierPackageById(orgId, packageId);
    if (!existing) return { success: false, error: "Package not found" };

    await dbDeleteTierPackage(orgId, packageId);

    await logAudit(profile.id, "bundle_updated", "tier_package", packageId, {
      action: "deleted",
      via: "packages",
    }, orgId);

    revalidatePath("/packages");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete package" };
  }
}

// ── Save items (replace all tiers in a package) ──────────────────────────────

export async function saveTierPackageItemsAction(
  packageId: string,
  items: {
    bundle_id: string;
    tier_label: string;
    sort_order: number;
    highlight?: boolean;
  }[]
): Promise<ActionResult<void>> {
  try {
    const { profile, orgId } = await requireAuth();

    const existing = await getTierPackageById(orgId, packageId);
    if (!existing) return { success: false, error: "Package not found" };

    await upsertTierPackageItems(packageId, items);

    await logAudit(profile.id, "bundle_updated", "tier_package", packageId, {
      action: "items_updated",
      item_count: items.length,
      via: "packages",
    }, orgId);

    revalidatePath("/packages");
    revalidatePath(`/packages/${packageId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save package items" };
  }
}

// ── Duplicate package ────────────────────────────────────────────────────────

export async function duplicateTierPackageAction(
  packageId: string
): Promise<ActionResult<TierPackage>> {
  try {
    const { profile, orgId } = await requireAuth();

    const source = await getTierPackageWithItems(orgId, packageId);
    if (!source) return { success: false, error: "Package not found" };

    // Create new package
    const newPkg = await dbCreateTierPackage(orgId, profile.id, {
      name: `${source.name} (Copy)`,
      description: source.description,
    });

    // Copy items
    if (source.items.length > 0) {
      await upsertTierPackageItems(
        newPkg.id,
        source.items.map((item) => ({
          bundle_id: item.bundle_id,
          tier_label: item.tier_label,
          sort_order: item.sort_order,
          highlight: item.highlight,
        }))
      );
    }

    await logAudit(profile.id, "bundle_created", "tier_package", newPkg.id, {
      action: "duplicated",
      source_id: packageId,
      via: "packages",
    }, orgId);

    revalidatePath("/packages");
    return { success: true, data: newPkg };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to duplicate package" };
  }
}

// ── Publish package ──────────────────────────────────────────────────────────

export async function publishTierPackageAction(
  packageId: string
): Promise<ActionResult<TierPackage>> {
  try {
    const { profile, orgId } = await requireAuth();

    const existing = await getTierPackageWithItems(orgId, packageId);
    if (!existing) return { success: false, error: "Package not found" };
    if (existing.items.length === 0) {
      return { success: false, error: "Cannot publish a package with no tiers" };
    }

    const pkg = await dbUpdateTierPackage(orgId, profile.id, packageId, {
      status: "published",
    });

    await logAudit(profile.id, "bundle_updated", "tier_package", packageId, {
      action: "published",
      via: "packages",
    }, orgId);

    revalidatePath("/packages");
    revalidatePath(`/packages/${packageId}`);
    return { success: true, data: pkg };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to publish package" };
  }
}

// ── Archive package ──────────────────────────────────────────────────────────

export async function archiveTierPackageAction(
  packageId: string
): Promise<ActionResult<TierPackage>> {
  try {
    const { profile, orgId } = await requireAuth();

    const existing = await getTierPackageById(orgId, packageId);
    if (!existing) return { success: false, error: "Package not found" };

    const pkg = await dbUpdateTierPackage(orgId, profile.id, packageId, {
      status: "archived",
    });

    await logAudit(profile.id, "bundle_updated", "tier_package", packageId, {
      action: "archived",
      via: "packages",
    }, orgId);

    revalidatePath("/packages");
    revalidatePath(`/packages/${packageId}`);
    return { success: true, data: pkg };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to archive package" };
  }
}
