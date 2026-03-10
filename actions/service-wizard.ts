"use server";

import { revalidatePath } from "next/cache";
import {
  createBundle as dbCreateBundle,
  updateBundle,
  getBundleById,
} from "@/lib/db/bundles";
import { createVersion as dbCreateVersion } from "@/lib/db/bundle-versions";
import { upsertServiceOutcome } from "@/lib/db/service-outcomes";
import { upsertEnablement } from "@/lib/db/enablement";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgSettingsOrDefaults } from "@/lib/db/org-settings";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import {
  outcomeStepSchema,
  serviceStepSchema,
  stackStepSchema,
  economicsStepSchema,
  enablementStepSchema,
} from "@/lib/schemas/service-wizard";
import type { ActionResult } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireAuth() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");

  const { orgId, membership } = await requireOrgMembership();
  if (!hasOrgPermission(membership.role, "create_bundles")) {
    throw new Error("You do not have permission to create services");
  }

  return { profile, orgId, membership };
}

// ── Step 1: Outcome ──────────────────────────────────────────────────────────

export async function saveOutcomeStepAction(
  data: unknown
): Promise<ActionResult<{ bundleId: string }>> {
  try {
    const { profile, orgId } = await requireAuth();

    const parsed = outcomeStepSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    // Create or update bundle
    const bundle = await dbCreateBundle({
      name: parsed.data.name,
      bundle_type: "custom",
      description: "",
      created_by: profile.id,
      org_id: orgId,
    });

    // Mark wizard in progress
    await updateBundle(bundle.id, {
      wizard_in_progress: true,
      wizard_step_completed: 1,
      outcome_layer_complete: true,
    });

    // Create service outcome
    await upsertServiceOutcome(orgId, bundle.id, {
      outcome_type: parsed.data.outcome_type,
      outcome_statement: parsed.data.outcome_statement,
      target_vertical: parsed.data.target_vertical,
      target_persona: parsed.data.target_persona,
    });

    await logAudit(profile.id, "bundle_created", "bundle", bundle.id, {
      name: bundle.name,
      via: "build_service_wizard",
      step: 1,
    }, orgId);

    revalidatePath("/bundles");
    revalidatePath("/services");

    return { success: true, data: { bundleId: bundle.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save outcome" };
  }
}

// ── Step 1 (resume): Update existing bundle's outcome ────────────────────────

export async function updateOutcomeStepAction(
  bundleId: string,
  data: unknown
): Promise<ActionResult<{ bundleId: string }>> {
  try {
    const { profile, orgId } = await requireAuth();

    const parsed = outcomeStepSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Bundle not found" };
    }

    await updateBundle(bundleId, {
      name: parsed.data.name,
      wizard_step_completed: Math.max(bundle.wizard_step_completed, 1),
      outcome_layer_complete: true,
    });

    await upsertServiceOutcome(orgId, bundleId, {
      outcome_type: parsed.data.outcome_type,
      outcome_statement: parsed.data.outcome_statement,
      target_vertical: parsed.data.target_vertical,
      target_persona: parsed.data.target_persona,
    });

    await logAudit(profile.id, "bundle_updated", "bundle", bundleId, {
      via: "build_service_wizard",
      step: 1,
    }, orgId);

    return { success: true, data: { bundleId } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update outcome" };
  }
}

// ── Step 2: Service Definition ───────────────────────────────────────────────

export async function saveServiceStepAction(
  bundleId: string,
  data: unknown
): Promise<ActionResult<void>> {
  try {
    const { profile, orgId } = await requireAuth();

    const parsed = serviceStepSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Bundle not found" };
    }

    await updateBundle(bundleId, {
      bundle_type: parsed.data.bundle_type,
      wizard_step_completed: Math.max(bundle.wizard_step_completed, 2),
    });

    // Update service_capabilities on the outcome row
    await upsertServiceOutcome(orgId, bundleId, {
      outcome_type: "custom", // preserved from step 1
      service_capabilities: parsed.data.service_capabilities.map((c) => ({
        name: c.name,
        description: c.description,
        met_by_tools: [],
      })),
    });

    await logAudit(profile.id, "bundle_updated", "bundle", bundleId, {
      via: "build_service_wizard",
      step: 2,
      capability_count: parsed.data.service_capabilities.length,
    }, orgId);

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save service definition" };
  }
}

// ── Step 3: Stack (tools stored in wizard state, validated here) ─────────────

export async function saveStackStepAction(
  bundleId: string,
  data: unknown
): Promise<ActionResult<void>> {
  try {
    const { profile, orgId } = await requireAuth();

    const parsed = stackStepSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Bundle not found" };
    }

    await updateBundle(bundleId, {
      wizard_step_completed: Math.max(bundle.wizard_step_completed, 3),
      stack_layer_complete: true,
    });

    await logAudit(profile.id, "bundle_updated", "bundle", bundleId, {
      via: "build_service_wizard",
      step: 3,
      tool_count: parsed.data.tools.length,
    }, orgId);

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save stack" };
  }
}

// ── Step 4: Economics (creates version + tools) ──────────────────────────────

export async function saveEconomicsStepAction(
  bundleId: string,
  data: unknown
): Promise<ActionResult<{ versionId: string }>> {
  try {
    const { profile, orgId } = await requireAuth();

    const parsed = economicsStepSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Bundle not found" };
    }

    const settings = await getOrgSettingsOrDefaults(orgId);

    const result = await dbCreateVersion({
      bundle_id: bundleId,
      seat_count: parsed.data.seat_count,
      risk_tier: parsed.data.risk_tier,
      contract_term_months: parsed.data.contract_term_months,
      target_margin_pct: parsed.data.target_margin_pct,
      overhead_pct: parsed.data.overhead_pct,
      labor_pct: parsed.data.labor_pct,
      discount_pct: parsed.data.discount_pct,
      notes: "",
      tools: parsed.data.tools,
      created_by: profile.id,
      red_zone_margin_pct: Number(settings.red_zone_margin_pct),
      max_discount_no_approval_pct: Number(settings.max_discount_no_approval_pct),
    });

    await updateBundle(bundleId, {
      wizard_step_completed: Math.max(bundle.wizard_step_completed, 4),
      economics_layer_complete: true,
    });

    await logAudit(profile.id, "bundle_updated", "bundle", bundleId, {
      via: "build_service_wizard",
      step: 4,
      version_id: result.version.id,
    }, orgId);

    revalidatePath("/bundles");

    return { success: true, data: { versionId: result.version.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save economics" };
  }
}

// ── Step 5: Enablement Content ───────────────────────────────────────────────

export async function saveEnablementStepAction(
  bundleId: string,
  versionId: string,
  data: unknown
): Promise<ActionResult<void>> {
  try {
    const { profile, orgId } = await requireAuth();

    const parsed = enablementStepSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Bundle not found" };
    }

    await upsertEnablement(orgId, profile.id, versionId, {
      service_overview: parsed.data.service_overview,
      whats_included: parsed.data.whats_included,
      talking_points: parsed.data.talking_points,
      pricing_narrative: parsed.data.pricing_narrative,
      why_us: parsed.data.why_us,
    });

    await updateBundle(bundleId, {
      wizard_step_completed: Math.max(bundle.wizard_step_completed, 5),
      enablement_layer_complete: true,
    });

    await logAudit(profile.id, "bundle_updated", "bundle", bundleId, {
      via: "build_service_wizard",
      step: 5,
    }, orgId);

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save enablement" };
  }
}

// ── Step 7: Launch ───────────────────────────────────────────────────────────

export async function launchServiceAction(
  bundleId: string
): Promise<ActionResult<void>> {
  try {
    const { profile, orgId } = await requireAuth();

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Bundle not found" };
    }

    await updateBundle(bundleId, {
      status: "active",
      wizard_in_progress: false,
      wizard_step_completed: 7,
      outcome_layer_complete: true,
      stack_layer_complete: true,
      economics_layer_complete: true,
      enablement_layer_complete: true,
    });

    await logAudit(profile.id, "bundle_updated", "bundle", bundleId, {
      via: "build_service_wizard",
      step: 7,
      action: "launched",
    }, orgId);

    revalidatePath("/bundles");
    revalidatePath("/dashboard");
    revalidatePath("/services");

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to launch service" };
  }
}
