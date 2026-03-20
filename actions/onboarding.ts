"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/db/profiles";
import { updateProfile } from "@/lib/db/profiles";
import { createTool } from "@/lib/db/tools";
import { createBundle } from "@/lib/db/bundles";
import { createScenario } from "@/lib/db/scenarios";
import { logAudit } from "@/lib/db/audit";
import { upsertOrgSettings } from "@/lib/db/org-settings";
import { requireOrgMembership } from "@/lib/org-context";
import { VENDOR_CATALOG, ENDPOINT_RANGE_VALUES } from "@/lib/onboarding/vendor-catalog";
import type { ActionResult, SellStrategy, SellConfig } from "@/lib/types";

export interface OnboardingPayload {
  // Step 1
  workspaceName: string;
  displayName: string;
  // Step 2
  selectedVendorIds: string[];
  // Step 3
  endpointRange: "small" | "smb" | "mid" | "enterprise";
  sellStrategy: SellStrategy;
  targetMarginPct: number;
  // Step 4
  overheadPct: number;
  laborPct: number;
  redZonePct: number;
  maxDiscountPct: number;
}

export interface OnboardingResult {
  bundleId: string;
  toolCount: number;
}

export async function completeOnboardingAction(
  payload: OnboardingPayload
): Promise<ActionResult<OnboardingResult>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    // Verify the user is a member of the active org before proceeding
    const { orgId } = await requireOrgMembership();

    // ── 1. Update display name ──────────────────────────────────────────────
    await updateProfile(profile.id, { display_name: payload.displayName });

    // ── 2. Upsert org settings ──────────────────────────────────────────────
    await upsertOrgSettings(orgId, {
      workspace_name: payload.workspaceName,
      default_target_margin_pct: payload.targetMarginPct,
      default_overhead_pct: payload.overheadPct,
      default_labor_pct: payload.laborPct,
      red_zone_margin_pct: payload.redZonePct,
      max_discount_no_approval_pct: payload.maxDiscountPct,
      onboarding_completed: true,
    });

    // ── 3. Create tools from selected vendors ──────────────────────────────
    // Each tool creation is wrapped individually so a single column-not-found
    // error (e.g. migrations 004/005 not applied) doesn't abort the whole flow.
    const selectedVendors = VENDOR_CATALOG.filter((v) =>
      payload.selectedVendorIds.includes(v.id)
    );

    const createdTools: { id: string }[] = [];
    for (const vendor of selectedVendors) {
      try {
        const tool = await createTool({
          name: vendor.name,
          vendor: vendor.vendor,
          category: vendor.category,
          // Fall back to a base pricing model if tiered_by_metric isn't in the DB enum yet
          pricing_model:
            vendor.pricing_model === "tiered_by_metric"
              ? "tiered"
              : vendor.pricing_model,
          per_seat_cost: vendor.per_seat_cost,
          flat_monthly_cost: vendor.flat_monthly_cost,
          annual_flat_cost: vendor.annual_flat_cost,
          per_user_cost: vendor.per_user_cost,
          per_org_cost: vendor.per_org_cost,
          tier_rules: vendor.tier_rules,
          tier_metric: vendor.tier_metric,
          vendor_minimum_monthly: vendor.vendor_minimum_monthly,
          labor_cost_per_seat: null,
          support_complexity: vendor.support_complexity,
          renewal_uplift_pct: vendor.renewal_uplift_pct,
          percent_discount: 0,
          flat_discount: 0,
          min_monthly_commit: null,
          org_id: orgId,
        });
        createdTools.push({ id: tool.id });
        // Audit log is non-fatal
        logAudit(profile.id, "tool_created", "tool", tool.id, {
          name: tool.name,
          source: "onboarding",
        }, orgId).catch(() => {});
      } catch (toolErr) {
        // Log but don't abort — partial tool creation is better than no onboarding
        console.error(
          `[onboarding] Failed to create tool "${vendor.name}":`,
          toolErr instanceof Error ? toolErr.message : toolErr
        );
      }
    }

    // ── 4. Create a starter bundle ─────────────────────────────────────────
    const bundle = await createBundle({
      name: "Standard Security Stack",
      bundle_type: "ala_carte",
      description: `Your core security bundle — created during setup with ${createdTools.length} tool${createdTools.length !== 1 ? "s" : ""}.`,
      created_by: profile.id,
      org_id: orgId,
    });

    logAudit(profile.id, "bundle_created", "bundle", bundle.id, {
      name: bundle.name,
      source: "onboarding",
    }, orgId).catch(() => {});

    // ── 5. Create default scenario ─────────────────────────────────────────
    const endpoints = ENDPOINT_RANGE_VALUES[payload.endpointRange] ?? 30;

    const sellConfig: SellConfig = buildSellConfig(
      payload.sellStrategy,
      payload.targetMarginPct,
      endpoints
    );

    // Scenario creation is non-fatal — bundle is the important artifact
    try {
      await createScenario({
        bundle_id: bundle.id,
        name: scenarioName(payload.endpointRange),
        endpoints,
        users: endpoints,
        headcount: Math.round(endpoints * 1.5),
        org_count: 1,
        contract_term_months: 12,
        sites: 1,
        sell_config: sellConfig,
        is_default: true,
      });
    } catch (scenarioErr) {
      console.error(
        "[onboarding] Failed to create default scenario:",
        scenarioErr instanceof Error ? scenarioErr.message : scenarioErr
      );
    }

    revalidatePath("/dashboard");
    revalidatePath("/tools");
    revalidatePath("/services");

    return {
      success: true,
      data: { bundleId: bundle.id, toolCount: createdTools.length },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[onboarding] completeOnboardingAction failed:", msg);
    return { success: false, error: `Setup failed: ${msg}` };
  }
}

function buildSellConfig(
  strategy: SellStrategy,
  targetMarginPct: number,
  endpoints: number
): SellConfig {
  switch (strategy) {
    case "cost_plus_margin":
      return { strategy, target_margin_pct: targetMarginPct };
    case "per_endpoint_monthly":
      // Rough default: assume $15/endpoint at requested margin
      return {
        strategy,
        per_endpoint_sell_price: Math.round(
          (endpoints > 0 ? (endpoints * 8) / (endpoints * (1 - targetMarginPct)) : 15) * 100
        ) / 100,
      };
    case "per_user_monthly":
      return {
        strategy,
        per_user_sell_price: Math.round(
          (endpoints > 0 ? (endpoints * 8) / (endpoints * (1 - targetMarginPct)) : 15) * 100
        ) / 100,
      };
    default:
      return { strategy: "cost_plus_margin", target_margin_pct: targetMarginPct };
  }
}

function scenarioName(range: string): string {
  switch (range) {
    case "small":
      return "Small Client (~15 endpoints)";
    case "smb":
      return "SMB Client (~50 endpoints)";
    case "mid":
      return "Mid-Market (~200 endpoints)";
    case "enterprise":
      return "Enterprise (~750 endpoints)";
    default:
      return "Default Client";
  }
}

// ── Tour completion ──────────────────────────────────────────────────────────

export async function markTourCompleted(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ tour_completed: true, tour_completed_at: new Date().toISOString() })
    .eq("id", profile.id);
}

export async function resetTourCompleted(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ tour_completed: false, tour_completed_at: null })
    .eq("id", profile.id);
}

// ── Onboarding chat helpers ─────────────────────────────────────────────────

export async function saveOnboardingChatAnswer(
  orgId: string,
  field: string,
  value: unknown,
): Promise<void> {
  const { saveOnboardingStep } = await import("@/lib/db/org-settings");

  const stepMap: Record<string, { step: number; key: string }> = {
    sales_model: { step: 6, key: "sales_model" },
    target_verticals: { step: 2, key: "target_verticals" },
    client_count_range: { step: 1, key: "company_size" },
    company_size: { step: 1, key: "company_size" },
    additional_context: { step: 7, key: "additional_context" },
    primary_goal: { step: 7, key: "additional_context" },
    tool_hints: { step: 7, key: "additional_context" },
  };

  const mapping = stepMap[field];
  if (mapping) {
    await saveOnboardingStep(orgId, mapping.step, { [mapping.key]: value });
  }
}

export async function completeOnboardingFromChat(
  orgId: string,
): Promise<void> {
  const { markOnboardingComplete } = await import("@/lib/db/org-settings");
  await markOnboardingComplete(orgId, false);
}
