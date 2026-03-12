"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createAdditionalService as dbCreate,
  updateAdditionalService as dbUpdate,
  archiveAdditionalService as dbArchive,
  getAdditionalServiceById,
  addAdditionalServiceToVersion as dbAddToVersion,
  updateAdditionalServiceOnVersion as dbUpdateOnVersion,
  removeAdditionalServiceFromVersion as dbRemoveFromVersion,
} from "@/lib/db/additional-services";
import { getCurrentProfile } from "@/lib/db/profiles";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult, AdditionalService, BundleVersionAdditionalService } from "@/lib/types";

// ── Schemas ──────────────────────────────────────────────────────────────────

const additionalServiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  category: z.enum(["consulting", "help_desk", "retainer", "training", "project", "compliance"]),
  billing_type: z.enum(["monthly", "per_user", "per_device", "per_site", "hourly", "one_time"]),
  cost_type: z.enum(["internal_labor", "subcontractor", "zero_cost"]).default("internal_labor"),
  cost: z.coerce.number().min(0).default(0),
  cost_unit: z.string().max(50).nullable().optional(),
  sell_price: z.coerce.number().min(0).default(0),
  sell_unit: z.string().max(50).nullable().optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// ── Catalog actions ──────────────────────────────────────────────────────────

export async function createAdditionalServiceAction(
  formData: unknown
): Promise<ActionResult<AdditionalService>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_tools")) {
      return { success: false, error: "You do not have permission to create services" };
    }

    const parsed = additionalServiceSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const svc = await dbCreate({ ...parsed.data, org_id: orgId });

    await logAudit(profile.id, "INSERT", "additional_service", svc.id, {
      name: svc.name, category: svc.category,
    }, orgId);

    revalidatePath("/additional-services");
    revalidatePath("/services");
    return { success: true, data: svc };
  } catch {
    return { success: false, error: "Failed to create additional service" };
  }
}

export async function updateAdditionalServiceAction(
  id: string,
  formData: unknown
): Promise<ActionResult<AdditionalService>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_tools")) {
      return { success: false, error: "You do not have permission to edit services" };
    }

    const existing = await getAdditionalServiceById(id);
    if (!existing || existing.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const parsed = additionalServiceSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const svc = await dbUpdate(id, parsed.data);

    await logAudit(profile.id, "UPDATE", "additional_service", svc.id, {
      name: svc.name,
    }, orgId);

    revalidatePath("/additional-services");
    revalidatePath("/services");
    return { success: true, data: svc };
  } catch {
    return { success: false, error: "Failed to update additional service" };
  }
}

export async function archiveAdditionalServiceAction(
  id: string
): Promise<ActionResult<AdditionalService>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_tools")) {
      return { success: false, error: "You do not have permission to archive services" };
    }

    const existing = await getAdditionalServiceById(id);
    if (!existing || existing.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const svc = await dbArchive(id);

    await logAudit(profile.id, "UPDATE", "additional_service", svc.id, {
      name: svc.name, action: "archived",
    }, orgId);

    revalidatePath("/additional-services");
    return { success: true, data: svc };
  } catch {
    return { success: false, error: "Failed to archive additional service" };
  }
}

// ── Inline cost/sell price update (for InlinePriceEditor) ────────────────────

export async function updateAdditionalServicePriceAction(
  id: string,
  field: "cost" | "sell_price",
  value: number
): Promise<ActionResult<AdditionalService>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_tools")) {
      return { success: false, error: "You do not have permission to edit services" };
    }

    if (typeof value !== "number" || isNaN(value) || value < 0) {
      return { success: false, error: "Value must be ≥ 0" };
    }

    const existing = await getAdditionalServiceById(id);
    if (!existing || existing.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const svc = await dbUpdate(id, { [field]: value });

    await logAudit(profile.id, "UPDATE", "additional_service", svc.id, {
      field, old_value: Number(existing[field]), new_value: value,
    }, orgId);

    revalidatePath("/additional-services");
    revalidatePath("/services");
    return { success: true, data: svc };
  } catch {
    return { success: false, error: "Failed to update price" };
  }
}

// ── Bundle version junction actions ──────────────────────────────────────────

export async function addToVersionAction(
  versionId: string,
  serviceId: string,
  overrides?: { cost_override?: number | null; sell_price_override?: number | null; quantity?: number }
): Promise<ActionResult<BundleVersionAdditionalService>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_versions")) {
      return { success: false, error: "You do not have permission" };
    }

    const bvas = await dbAddToVersion(versionId, serviceId, orgId, overrides);

    await logAudit(profile.id, "INSERT", "bundle_version_additional_service", bvas.id, {
      bundle_version_id: versionId, additional_service_id: serviceId,
    }, orgId);

    revalidatePath("/services");
    return { success: true, data: bvas };
  } catch {
    return { success: false, error: "Failed to add service to version" };
  }
}

export async function updateOnVersionAction(
  bvasId: string,
  updates: { cost_override?: number | null; sell_price_override?: number | null; quantity?: number }
): Promise<ActionResult<BundleVersionAdditionalService>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_versions")) {
      return { success: false, error: "You do not have permission" };
    }

    const bvas = await dbUpdateOnVersion(bvasId, updates);
    revalidatePath("/services");
    return { success: true, data: bvas };
  } catch {
    return { success: false, error: "Failed to update service on version" };
  }
}

export async function removeFromVersionAction(
  bvasId: string
): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_versions")) {
      return { success: false, error: "You do not have permission" };
    }

    await dbRemoveFromVersion(bvasId);

    await logAudit(profile.id, "DELETE", "bundle_version_additional_service", bvasId, {}, orgId);

    revalidatePath("/services");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to remove service from version" };
  }
}
