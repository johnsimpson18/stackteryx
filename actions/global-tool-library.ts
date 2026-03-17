"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTool as dbCreateTool, getTools } from "@/lib/db/tools";
import { createOrgVendor as dbCreateOrgVendor, getOrgVendors } from "@/lib/db/vendors";
import { getCurrentProfile } from "@/lib/db/profiles";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult, Tool, ToolCategory, PricingModel } from "@/lib/types";

// ── Global library row type ──────────────────────────────────────────────────

export interface GlobalToolEntry {
  id: string;
  name: string;
  vendor: string;
  category: string;
  subcategory: string | null;
  description: string;
  typical_use_case: string;
  pricing_model: string;
  typical_cost_low: number | null;
  typical_cost_high: number | null;
  cost_unit: string;
  mssp_tier: string;
  compliance_tags: string[];
  tags: string[];
  website_url: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Category mapping: global library → ToolCategory enum ─────────────────────

const GLOBAL_CATEGORY_TO_TOOL_CATEGORY: Record<string, ToolCategory> = {
  edr: "edr",
  mdr: "mdr",
  siem: "siem",
  idp: "identity",
  backup: "backup",
  network: "network_monitoring",
  "email-security": "email_security",
  vulnerability: "vulnerability_management",
  "dns-filtering": "dns_filtering",
  patch: "vulnerability_management",
  "dark-web": "dark_web",
  compliance: "documentation",
  psa: "psa",
  rmm: "rmm",
};

const GLOBAL_PRICING_TO_PRICING_MODEL: Record<string, PricingModel> = {
  per_seat: "per_seat",
  flat: "flat_monthly",
  usage: "flat_monthly",
};

// ── Fetch all active global tools ────────────────────────────────────────────

export async function getGlobalToolLibrary(): Promise<GlobalToolEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("global_tool_library")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("name");

  if (error) throw error;
  return (data as GlobalToolEntry[]) ?? [];
}

// ── Add a global library tool to the org's catalog ──────────────────────────

export async function addGlobalToolToOrg(
  globalToolId: string
): Promise<ActionResult<Tool>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_tools")) {
      return { success: false, error: "You do not have permission to add tools" };
    }

    // Fetch the global tool
    const supabase = await createClient();
    const { data: globalTool, error: fetchError } = await supabase
      .from("global_tool_library")
      .select("*")
      .eq("id", globalToolId)
      .single();

    if (fetchError || !globalTool) {
      return { success: false, error: "Tool not found in global library" };
    }

    const gt = globalTool as GlobalToolEntry;

    // Check for duplicate by name + vendor in org
    const existingTools = await getTools(orgId);
    const duplicate = existingTools.find(
      (t) =>
        t.name.toLowerCase() === gt.name.toLowerCase() &&
        t.vendor.toLowerCase() === gt.vendor.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: "This tool already exists in your catalog" };
    }

    // Ensure vendor exists as org_vendor
    const existingVendors = await getOrgVendors(orgId);
    const vendorKey = gt.vendor.toLowerCase();
    if (!existingVendors.some((v) => v.display_name.toLowerCase() === vendorKey)) {
      await dbCreateOrgVendor(orgId, profile.id, {
        display_name: gt.vendor,
        category: gt.category,
      });
    }

    // Map category & pricing model
    const category = GLOBAL_CATEGORY_TO_TOOL_CATEGORY[gt.category] ?? "other";
    const pricingModel = GLOBAL_PRICING_TO_PRICING_MODEL[gt.pricing_model] ?? "per_seat";

    // Use midpoint of cost range as default cost
    const midpointCost =
      gt.typical_cost_low != null && gt.typical_cost_high != null
        ? (gt.typical_cost_low + gt.typical_cost_high) / 2
        : gt.typical_cost_low ?? gt.typical_cost_high ?? 0;

    const tool = await dbCreateTool({
      org_id: orgId,
      name: gt.name,
      vendor: gt.vendor,
      category,
      pricing_model: pricingModel,
      per_seat_cost: pricingModel === "per_seat" ? midpointCost : 0,
      flat_monthly_cost: pricingModel === "flat_monthly" ? midpointCost : 0,
      tier_rules: [],
      vendor_minimum_monthly: null,
      labor_cost_per_seat: null,
      support_complexity: 3,
      renewal_uplift_pct: 0,
      annual_flat_cost: 0,
      per_user_cost: 0,
      per_org_cost: 0,
      percent_discount: 0,
      flat_discount: 0,
      min_monthly_commit: null,
    });

    await logAudit(profile.id, "tool_created", "tool", tool.id, {
      name: tool.name,
      source: "global_library",
      global_tool_id: globalToolId,
    }, orgId);

    revalidatePath("/tools");
    revalidatePath("/stack-catalog");
    revalidatePath("/stack-builder");
    return { success: true, data: tool };
  } catch {
    return { success: false, error: "Failed to add tool from global library" };
  }
}
