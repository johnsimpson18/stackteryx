"use server";

import { redirect } from "next/navigation";
import { requireOrgMembership } from "@/lib/org-context";
import { saveOnboardingStep } from "@/lib/db/org-settings";
import { updateOrg } from "@/lib/db/orgs";

export async function launchStackteryxAction(data: {
  target_margin_pct: number;
  compliance_targets: string[];
  additional_context: string;
  outcome_targets: string[];
}): Promise<void> {
  const { orgId } = await requireOrgMembership();

  await saveOnboardingStep(orgId, 7, {
    target_margin_pct: data.target_margin_pct,
    compliance_targets: data.compliance_targets.length > 0 ? data.compliance_targets : null,
    additional_context: data.additional_context || null,
  });

  // Save outcome targets to the orgs table
  if (data.outcome_targets.length > 0) {
    await updateOrg(orgId, {
      org_outcome_targets: data.outcome_targets,
    });
  }

  redirect("/onboarding/building");
}
