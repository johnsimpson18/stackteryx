"use server";

import { revalidatePath } from "next/cache";
import { toolFormSchema } from "@/lib/schemas/tool";
import {
  createTool as dbCreateTool,
  updateTool as dbUpdateTool,
  deactivateTool as dbDeactivateTool,
  getToolById,
  getTools,
} from "@/lib/db/tools";
import { createOrgVendor as dbCreateOrgVendor, getOrgVendors } from "@/lib/db/vendors";
import { getCurrentProfile } from "@/lib/db/profiles";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult, Tool } from "@/lib/types";
import {
  TOOL_LIBRARY,
  DOMAIN_TO_CATEGORY,
  BILLING_UNIT_TO_PRICING_MODEL,
} from "@/lib/data/tool-library";
import type { LibraryTool, LibraryDomain, BillingUnit } from "@/lib/data/tool-library";

export async function createToolAction(
  formData: unknown
): Promise<ActionResult<Tool>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_tools")) {
      return { success: false, error: "You do not have permission to create tools" };
    }

    const parsed = toolFormSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    const tool = await dbCreateTool({ ...parsed.data, org_id: orgId });

    await logAudit(profile.id, "tool_created", "tool", tool.id, {
      name: tool.name,
    }, orgId);

    revalidatePath("/tools");
    return { success: true, data: tool };
  } catch {
    return { success: false, error: "Failed to create tool" };
  }
}

export async function updateToolAction(
  id: string,
  formData: unknown
): Promise<ActionResult<Tool>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_tools")) {
      return { success: false, error: "You do not have permission to edit tools" };
    }

    // Verify tool belongs to the active org
    const existingTool = await getToolById(id);
    if (!existingTool || existingTool.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const parsed = toolFormSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    const tool = await dbUpdateTool(id, parsed.data);

    await logAudit(profile.id, "tool_updated", "tool", tool.id, {
      name: tool.name,
    }, orgId);

    revalidatePath("/tools");
    revalidatePath(`/tools/${id}/edit`);
    return { success: true, data: tool };
  } catch {
    return { success: false, error: "Failed to update tool" };
  }
}

export async function deactivateToolAction(
  id: string
): Promise<ActionResult<Tool>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "deactivate_tools")) {
      return {
        success: false,
        error: "You do not have permission to deactivate tools",
      };
    }

    // Verify tool belongs to the active org
    const existingTool = await getToolById(id);
    if (!existingTool || existingTool.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const tool = await dbDeactivateTool(id);

    await logAudit(profile.id, "tool_deactivated", "tool", tool.id, {
      name: tool.name,
    }, orgId);

    revalidatePath("/tools");
    return { success: true, data: tool };
  } catch {
    return { success: false, error: "Failed to deactivate tool" };
  }
}

// ── Add tools from library ──────────────────────────────────────────────────

export async function addToolsFromLibraryAction(
  libraryIds: string[]
): Promise<ActionResult<{ count: number; tools: Tool[] }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_tools")) {
      return { success: false, error: "You do not have permission to add tools" };
    }

    if (libraryIds.length === 0) {
      return { success: false, error: "No tools selected" };
    }

    // Get the library entries for the selected IDs
    const selectedTools = TOOL_LIBRARY.filter((t) => libraryIds.includes(t.id));
    if (selectedTools.length === 0) {
      return { success: false, error: "No valid tools selected" };
    }

    // Get existing tools to avoid duplicates (by name)
    const existingTools = await getTools(orgId);
    const existingNames = new Set(existingTools.map((t) => t.name.toLowerCase()));

    // Get existing org vendors to find or create vendor records
    const existingVendors = await getOrgVendors(orgId);
    const vendorMap = new Map(
      existingVendors.map((v) => [v.display_name.toLowerCase(), v.id])
    );

    const createdTools: Tool[] = [];

    for (const libTool of selectedTools) {
      // Skip if a tool with this name already exists
      if (existingNames.has(libTool.name.toLowerCase())) continue;

      // Create vendor if not already in org
      const vendorKey = libTool.vendor.toLowerCase();
      if (!vendorMap.has(vendorKey)) {
        const newVendor = await dbCreateOrgVendor(orgId, profile.id, {
          display_name: libTool.vendor,
          category: libTool.domain,
        });
        vendorMap.set(vendorKey, newVendor.id);
      }

      const category = DOMAIN_TO_CATEGORY[libTool.domain];
      const pricingModel = BILLING_UNIT_TO_PRICING_MODEL[libTool.billing_unit];

      const toolData = buildToolData(libTool, category, pricingModel, orgId);
      const tool = await dbCreateTool(toolData);
      existingNames.add(tool.name.toLowerCase());
      createdTools.push(tool);

      await logAudit(profile.id, "tool_created", "tool", tool.id, {
        name: tool.name,
        source: "library",
      }, orgId);
    }

    revalidatePath("/tools");
    revalidatePath("/stack-catalog");
    revalidatePath("/vendors");
    return { success: true, data: { count: createdTools.length, tools: createdTools } };
  } catch {
    return { success: false, error: "Failed to add tools from library" };
  }
}

function buildToolData(
  libTool: LibraryTool,
  category: Tool["category"],
  pricingModel: Tool["pricing_model"],
  orgId: string
) {
  return {
    org_id: orgId,
    name: libTool.name,
    vendor: libTool.vendor,
    category,
    pricing_model: pricingModel,
    per_seat_cost: pricingModel === "per_seat" ? libTool.typical_cost_per_user : 0,
    flat_monthly_cost: pricingModel === "flat_monthly" ? libTool.typical_cost_per_user : 0,
    tier_rules: [] as Tool["tier_rules"],
    vendor_minimum_monthly: null,
    labor_cost_per_seat: null,
    support_complexity: 3,
    renewal_uplift_pct: 0,
    annual_flat_cost: 0,
    per_user_cost: pricingModel === "per_user" ? libTool.typical_cost_per_user : 0,
    per_org_cost: 0,
    percent_discount: 0,
    flat_discount: 0,
    min_monthly_commit: null,
  };
}

// ── Inline tool cost update ──────────────────────────────────────────────────

const ALLOWED_COST_FIELDS = [
  "per_seat_cost",
  "per_user_cost",
  "per_org_cost",
  "flat_monthly_cost",
  "annual_flat_cost",
] as const;

type CostFieldName = (typeof ALLOWED_COST_FIELDS)[number];

export async function updateToolCostAction(
  toolId: string,
  fieldName: string,
  value: number
): Promise<ActionResult<Tool>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_tools")) {
      return { success: false, error: "You do not have permission to edit tools" };
    }

    // Validate field name
    if (!ALLOWED_COST_FIELDS.includes(fieldName as CostFieldName)) {
      return { success: false, error: "Invalid cost field" };
    }

    // Validate value
    if (typeof value !== "number" || isNaN(value) || value < 0) {
      return { success: false, error: "Cost must be ≥ 0" };
    }

    // Verify tool belongs to the active org
    const existingTool = await getToolById(toolId);
    if (!existingTool || existingTool.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const tool = await dbUpdateTool(toolId, { [fieldName]: value });

    await logAudit(profile.id, "tool_updated", "tool", tool.id, {
      name: tool.name,
      field: fieldName,
      old_value: Number(existingTool[fieldName as CostFieldName]),
      new_value: value,
    }, orgId);

    revalidatePath("/stack-catalog");
    revalidatePath("/services");
    revalidatePath("/tools");
    return { success: true, data: tool };
  } catch {
    return { success: false, error: "Failed to update tool cost" };
  }
}

// ── Inline tool creation (wizard Step 3) ────────────────────────────────────

export async function createToolInlineAction(data: {
  name: string;
  vendor: string;
  domain: LibraryDomain;
  cost: number;
  billing_unit: BillingUnit;
}): Promise<ActionResult<Tool>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_tools")) {
      return { success: false, error: "You do not have permission to add tools" };
    }

    if (!data.name.trim() || !data.vendor.trim()) {
      return { success: false, error: "Name and vendor are required" };
    }

    // Ensure vendor exists as org_vendor
    const existingVendors = await getOrgVendors(orgId);
    const vendorKey = data.vendor.toLowerCase();
    if (!existingVendors.some((v) => v.display_name.toLowerCase() === vendorKey)) {
      await dbCreateOrgVendor(orgId, profile.id, {
        display_name: data.vendor,
        category: data.domain,
      });
    }

    const category = DOMAIN_TO_CATEGORY[data.domain];
    const pricingModel = BILLING_UNIT_TO_PRICING_MODEL[data.billing_unit];

    const tool = await dbCreateTool({
      org_id: orgId,
      name: data.name.trim(),
      vendor: data.vendor.trim(),
      category,
      pricing_model: pricingModel,
      per_seat_cost: pricingModel === "per_seat" ? data.cost : 0,
      flat_monthly_cost: pricingModel === "flat_monthly" ? data.cost : 0,
      tier_rules: [] as Tool["tier_rules"],
      vendor_minimum_monthly: null,
      labor_cost_per_seat: null,
      support_complexity: 3,
      renewal_uplift_pct: 0,
      annual_flat_cost: 0,
      per_user_cost: pricingModel === "per_user" ? data.cost : 0,
      per_org_cost: 0,
      percent_discount: 0,
      flat_discount: 0,
      min_monthly_commit: null,
    });

    await logAudit(profile.id, "tool_created", "tool", tool.id, {
      name: tool.name,
      source: "wizard_inline",
    }, orgId);

    revalidatePath("/tools");
    return { success: true, data: tool };
  } catch {
    return { success: false, error: "Failed to create tool" };
  }
}
