"use server";

import { revalidatePath } from "next/cache";
import { createOrg as dbCreateOrg, updateOrg as dbUpdateOrg } from "@/lib/db/orgs";
import { ensureOrgSettings } from "@/lib/db/org-settings";
import { addOrgMember } from "@/lib/db/org-members";
import { getCurrentProfile } from "@/lib/db/profiles";
import { logAudit } from "@/lib/db/audit";
import { setActiveOrg, getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { hasOrgPermission } from "@/lib/constants";
import type { ActionResult, Org } from "@/lib/types";

export async function createOrgAction(data: {
  name: string;
  slug: string;
}): Promise<ActionResult<Org>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const org = await dbCreateOrg({
      name: data.name,
      slug: data.slug,
      created_by: profile.id,
    });

    // Add creator as org_owner
    await addOrgMember({
      org_id: org.id,
      user_id: profile.id,
      role: "org_owner",
      invited_by: profile.id,
    });

    // Create org_settings row so the onboarding gate triggers
    await ensureOrgSettings(org.id);

    // Set as active org
    await setActiveOrg(org.id);

    const orgId = await getActiveOrgId();
    await logAudit(profile.id, "org_created", "org", org.id, {
      name: org.name,
    }, orgId ?? org.id);

    revalidatePath("/dashboard");
    return { success: true, data: org };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create org";
    return { success: false, error: msg };
  }
}

export async function switchOrgAction(
  orgId: string
): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    // Verify user is a member of the target org before switching
    const membership = await getOrgMembership(orgId);
    if (!membership) {
      return { success: false, error: "Not found" };
    }

    await setActiveOrg(orgId);

    await logAudit(profile.id, "org_switched", "org", orgId, {}, orgId);

    revalidatePath("/dashboard");
    revalidatePath("/tools");
    revalidatePath("/bundles");
    revalidatePath("/clients");
    revalidatePath("/settings");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to switch org" };
  }
}

export async function updateOrgAction(
  orgId: string,
  data: { name?: string; slug?: string }
): Promise<ActionResult<Org>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    // Verify user is a member of the target org with sufficient permissions
    const membership = await getOrgMembership(orgId);
    if (!membership) {
      return { success: false, error: "Not found" };
    }
    if (!hasOrgPermission(membership.role, "update_settings")) {
      return { success: false, error: "You do not have permission to update this organization" };
    }

    const org = await dbUpdateOrg(orgId, data);

    await logAudit(profile.id, "org_updated", "org", org.id, {
      name: org.name,
    }, orgId);

    revalidatePath("/settings");
    return { success: true, data: org };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update org";
    return { success: false, error: msg };
  }
}
