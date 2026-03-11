"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/db/profiles";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import {
  enableComplianceFramework,
  disableComplianceFramework,
  getOrgComplianceTargets,
  getClientComplianceScores,
  type OrgComplianceTarget,
  type ClientComplianceScoreRow,
} from "@/lib/db/compliance";
import {
  scoreClientCompliance,
  type ComplianceScore,
} from "@/lib/compliance/scoring";
import type { ActionResult } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireAuth() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");

  const { orgId, membership } = await requireOrgMembership();
  if (!hasOrgPermission(membership.role, "view_clients")) {
    throw new Error("You do not have permission to manage compliance");
  }

  return { profile, orgId, membership };
}

// ── Toggle framework ────────────────────────────────────────────────────────

export async function enableFrameworkAction(
  frameworkId: string
): Promise<ActionResult<OrgComplianceTarget>> {
  try {
    const { profile, orgId } = await requireAuth();

    const target = await enableComplianceFramework(orgId, frameworkId);

    await logAudit(
      profile.id,
      "bundle_updated",
      "org_compliance_target",
      target.id,
      { action: "enabled", framework_id: frameworkId, via: "compliance" },
      orgId
    );

    revalidatePath("/compliance");
    return { success: true, data: target };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to enable framework",
    };
  }
}

export async function disableFrameworkAction(
  frameworkId: string
): Promise<ActionResult<void>> {
  try {
    const { profile, orgId } = await requireAuth();

    await disableComplianceFramework(orgId, frameworkId);

    await logAudit(
      profile.id,
      "bundle_updated",
      "org_compliance_target",
      frameworkId,
      { action: "disabled", framework_id: frameworkId, via: "compliance" },
      orgId
    );

    revalidatePath("/compliance");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to disable framework",
    };
  }
}

// ── Get enabled frameworks ──────────────────────────────────────────────────

export async function getEnabledFrameworksAction(): Promise<
  ActionResult<OrgComplianceTarget[]>
> {
  try {
    const { orgId } = await requireAuth();
    const targets = await getOrgComplianceTargets(orgId);
    return { success: true, data: targets };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to fetch frameworks",
    };
  }
}

// ── Assess client compliance ────────────────────────────────────────────────

export async function assessClientComplianceAction(
  clientId: string,
  frameworkId: string
): Promise<ActionResult<ComplianceScore>> {
  try {
    const { profile, orgId } = await requireAuth();

    const score = await scoreClientCompliance(clientId, frameworkId, orgId);

    await logAudit(
      profile.id,
      "bundle_updated",
      "client_compliance_score",
      clientId,
      {
        action: "assessed",
        framework_id: frameworkId,
        score_pct: score.scorePct,
        via: "compliance",
      },
      orgId
    );

    revalidatePath("/compliance");
    revalidatePath(`/clients/${clientId}`);
    return { success: true, data: score };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to assess compliance",
    };
  }
}

// ── Batch assess all clients for a framework ────────────────────────────────

export async function assessAllClientsAction(
  frameworkId: string,
  clientIds: string[]
): Promise<ActionResult<{ assessed: number; errors: number }>> {
  try {
    const { profile, orgId } = await requireAuth();

    let assessed = 0;
    let errors = 0;

    for (const clientId of clientIds) {
      try {
        await scoreClientCompliance(clientId, frameworkId, orgId);
        assessed++;
      } catch {
        errors++;
      }
    }

    await logAudit(
      profile.id,
      "bundle_updated",
      "client_compliance_score",
      frameworkId,
      {
        action: "batch_assessed",
        framework_id: frameworkId,
        assessed,
        errors,
        via: "compliance",
      },
      orgId
    );

    revalidatePath("/compliance");
    return { success: true, data: { assessed, errors } };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to batch assess",
    };
  }
}

// ── Get client scores ───────────────────────────────────────────────────────

export async function getClientScoresAction(
  clientId: string
): Promise<ActionResult<ClientComplianceScoreRow[]>> {
  try {
    const { orgId } = await requireAuth();
    const scores = await getClientComplianceScores(orgId, clientId);
    return { success: true, data: scores };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to fetch scores",
    };
  }
}
