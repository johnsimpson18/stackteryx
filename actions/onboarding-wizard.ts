"use server";

import { requireOrgMembership } from "@/lib/org-context";
import { saveOnboardingStep } from "@/lib/db/org-settings";
import { saveOnboardingTools, updateToolPricing } from "@/lib/db/onboarding-tools";
import { updateOrg } from "@/lib/db/orgs";
import type { ActionResult, BillingBasis } from "@/lib/types";

export async function updateOrgNameAction(
  name: string
): Promise<ActionResult> {
  try {
    const { orgId } = await requireOrgMembership();
    await updateOrg(orgId, { name });
    return { success: true, data: undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[onboarding-wizard] updateOrgName failed:", msg);
    return { success: false, error: msg };
  }
}

export async function saveOnboardingStepAction(
  step: number,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    const { orgId } = await requireOrgMembership();
    await saveOnboardingStep(orgId, step, data);
    return { success: true, data: undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[onboarding-wizard] saveStep failed:", msg);
    return { success: false, error: msg };
  }
}

export async function saveOnboardingToolsAction(
  tools: Array<{
    tool_name: string;
    vendor_name?: string | null;
    category: string;
    is_custom?: boolean;
  }>
): Promise<ActionResult> {
  try {
    const { orgId } = await requireOrgMembership();
    await saveOnboardingTools(orgId, tools);
    return { success: true, data: undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[onboarding-wizard] saveTools failed:", msg);
    return { success: false, error: msg };
  }
}

export async function saveOnboardingPricingAction(
  pricing: Array<{
    tool_name: string;
    billing_basis?: string;
    cost_amount?: number | null;
    sell_amount?: number | null;
    min_commitment?: number | null;
    min_units?: number | null;
  }>
): Promise<ActionResult> {
  try {
    const { orgId } = await requireOrgMembership();
    for (const p of pricing) {
      await updateToolPricing(orgId, p.tool_name, {
        billing_basis: (p.billing_basis as BillingBasis) || undefined,
        cost_amount: p.cost_amount,
        sell_amount: p.sell_amount,
        min_commitment: p.min_commitment,
        min_units: p.min_units,
      });
    }
    return { success: true, data: undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[onboarding-wizard] savePricing failed:", msg);
    return { success: false, error: msg };
  }
}
