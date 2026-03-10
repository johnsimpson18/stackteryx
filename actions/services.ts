"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createBundle as dbCreateBundle } from "@/lib/db/bundles";
import { createVersion as dbCreateVersion } from "@/lib/db/bundle-versions";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgSettingsOrDefaults } from "@/lib/db/org-settings";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult } from "@/lib/types";

const createServiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  bundle_type: z.enum(["ala_carte", "tiered", "vertical", "custom"]),
  description: z.string().max(2000).default(""),
  seat_count: z.coerce.number().int().min(1).default(30),
  risk_tier: z.enum(["low", "medium", "high"]).default("medium"),
  contract_term_months: z.coerce.number().int().min(1).default(12),
  target_margin_pct: z.coerce.number().min(0).max(0.99).default(0.35),
  overhead_pct: z.coerce.number().min(0).max(1).default(0.1),
  labor_pct: z.coerce.number().min(0).max(1).default(0.15),
  discount_pct: z.coerce.number().min(0).max(0.99).default(0),
  notes: z.string().max(5000).default(""),
  tools: z
    .array(
      z.object({
        tool_id: z.string().uuid("Invalid tool ID"),
        quantity_multiplier: z.coerce.number().min(0.1).default(1.0),
      })
    )
    .min(1, "At least one tool is required"),
});

export async function createServiceAction(
  formData: unknown
): Promise<ActionResult<{ bundleId: string; versionId: string }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_bundles")) {
      return {
        success: false,
        error: "You do not have permission to create services",
      };
    }

    const parsed = createServiceSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    const settings = await getOrgSettingsOrDefaults(orgId);

    // 1. Create the bundle
    const bundle = await dbCreateBundle({
      name: parsed.data.name,
      bundle_type: parsed.data.bundle_type,
      description: parsed.data.description,
      created_by: profile.id,
      org_id: orgId,
    });

    // 2. Create v1 with selected tools + pricing
    const result = await dbCreateVersion({
      bundle_id: bundle.id,
      seat_count: parsed.data.seat_count,
      risk_tier: parsed.data.risk_tier,
      contract_term_months: parsed.data.contract_term_months,
      target_margin_pct: parsed.data.target_margin_pct,
      overhead_pct: parsed.data.overhead_pct,
      labor_pct: parsed.data.labor_pct,
      discount_pct: parsed.data.discount_pct,
      notes: parsed.data.notes,
      tools: parsed.data.tools,
      created_by: profile.id,
      red_zone_margin_pct: Number(settings.red_zone_margin_pct),
      max_discount_no_approval_pct: Number(
        settings.max_discount_no_approval_pct
      ),
    });

    // 3. Audit log
    await logAudit(
      profile.id,
      "bundle_created",
      "bundle",
      bundle.id,
      {
        name: bundle.name,
        via: "service_wizard",
        tool_count: parsed.data.tools.length,
      },
      orgId
    );

    revalidatePath("/bundles");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { bundleId: bundle.id, versionId: result.version.id },
    };
  } catch {
    return { success: false, error: "Failed to create service" };
  }
}
