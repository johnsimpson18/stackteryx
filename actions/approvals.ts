"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { reviewApproval as dbReviewApproval, getApprovalById } from "@/lib/db/approvals";
import { getCurrentProfile } from "@/lib/db/profiles";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult, Approval } from "@/lib/types";

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  review_notes: z.string().max(1000).default(""),
});

export async function reviewApprovalAction(
  approvalId: string,
  formData: unknown
): Promise<ActionResult<Approval>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "manage_approvals"))
      return { success: false, error: "Only org_owner or admin roles can review approvals" };

    // Verify approval belongs to the active org
    const existingApproval = await getApprovalById(approvalId);
    if (!existingApproval || existingApproval.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const parsed = reviewSchema.safeParse(formData);
    if (!parsed.success)
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };

    const approval = await dbReviewApproval(
      approvalId,
      profile.id,
      parsed.data.status,
      parsed.data.review_notes
    );

    await logAudit(profile.id, "approval_reviewed", "approval", approval.id, {
      status: parsed.data.status,
      bundle_name: approval.bundle_name,
      version_number: approval.version_number,
    }, orgId);

    revalidatePath("/approvals");
    revalidatePath("/dashboard");
    return { success: true, data: approval };
  } catch {
    return { success: false, error: "Failed to review approval" };
  }
}
