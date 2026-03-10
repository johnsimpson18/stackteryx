"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/db/profiles";
import {
  updateOrgMemberRole,
  removeOrgMember,
  addOrgMember,
  getOrgMember,
} from "@/lib/db/org-members";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult, OrgRole } from "@/lib/types";

export async function changeRoleAction(
  userId: string,
  role: OrgRole
): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "manage_members")) {
      return {
        success: false,
        error: "You do not have permission to manage members",
      };
    }

    // Prevent self-demotion from org_owner
    if (userId === profile.id && membership.role === "org_owner" && role !== "org_owner") {
      return {
        success: false,
        error: "You cannot demote yourself from org_owner",
      };
    }

    await updateOrgMemberRole(orgId, userId, role);

    await logAudit(profile.id, "org_member_role_changed", "org_member", userId, {
      new_role: role,
    }, orgId);

    revalidatePath("/settings/members");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to change role" };
  }
}

export async function removeMemberAction(
  userId: string
): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "manage_members")) {
      return {
        success: false,
        error: "You do not have permission to manage members",
      };
    }

    if (userId === profile.id) {
      return { success: false, error: "You cannot remove yourself" };
    }

    await removeOrgMember(orgId, userId);

    await logAudit(profile.id, "org_member_removed", "org_member", userId, {}, orgId);

    revalidatePath("/settings/members");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to remove member" };
  }
}

export async function inviteMemberAction(
  email: string,
  role: OrgRole
): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "manage_members")) {
      return {
        success: false,
        error: "You do not have permission to invite members",
      };
    }

    // TODO: In a future phase, send an actual invitation email.
    // For now, we just log the intent.
    await logAudit(profile.id, "org_member_added", "org_member", null, {
      email,
      role,
    }, orgId);

    revalidatePath("/settings/members");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to invite member" };
  }
}
