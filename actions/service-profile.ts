"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateBundle as dbUpdateBundle, getBundleById } from "@/lib/db/bundles";
import { upsertServiceOutcome } from "@/lib/db/service-outcomes";
import { dismissActionCard as dbDismissActionCard } from "@/lib/db/action-cards";
import { getCurrentProfile } from "@/lib/db/profiles";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult, Bundle, BundleStatus } from "@/lib/types";

// ── Inline name edit ─────────────────────────────────────────────────────────

export async function updateServiceNameAction(
  bundleId: string,
  name: string
): Promise<ActionResult<Bundle>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_bundles")) {
      return { success: false, error: "No permission" };
    }

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      return { success: false, error: "Name must be 1-100 characters" };
    }

    const updated = await dbUpdateBundle(bundleId, { name: trimmed });

    await logAudit(profile.id, "bundle_updated", "bundle", bundleId, {
      field: "name",
      old: bundle.name,
      new: trimmed,
    }, orgId);

    revalidatePath(`/services/${bundleId}`);
    revalidatePath("/bundles");
    return { success: true, data: updated };
  } catch {
    return { success: false, error: "Failed to update name" };
  }
}

// ── Status change ────────────────────────────────────────────────────────────

const statusSchema = z.enum(["draft", "active", "archived"]);

export async function updateServiceStatusAction(
  bundleId: string,
  status: string
): Promise<ActionResult<Bundle>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_bundles")) {
      return { success: false, error: "No permission" };
    }

    const parsed = statusSchema.safeParse(status);
    if (!parsed.success) {
      return { success: false, error: "Invalid status" };
    }

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    // Enforce publish rules: active requires outcome + economics
    if (parsed.data === "active") {
      if (!bundle.outcome_layer_complete) {
        return { success: false, error: "Cannot publish: outcome layer is not complete" };
      }
      if (!bundle.economics_layer_complete) {
        return { success: false, error: "Cannot publish: no pricing configuration exists" };
      }
    }

    const updated = await dbUpdateBundle(bundleId, { status: parsed.data });

    await logAudit(profile.id, "bundle_updated", "bundle", bundleId, {
      field: "status",
      old: bundle.status,
      new: parsed.data,
    }, orgId);

    revalidatePath(`/services/${bundleId}`);
    revalidatePath("/bundles");
    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch {
    return { success: false, error: "Failed to update status" };
  }
}

// ── Dismiss action card ──────────────────────────────────────────────────────

export async function dismissActionCardAction(
  cardId: string
): Promise<ActionResult<void>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    await requireOrgMembership();
    await dbDismissActionCard(cardId);

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to dismiss" };
  }
}

// ── Update outcome (from modal) ──────────────────────────────────────────────

const outcomeSchema = z.object({
  outcome_type: z.enum(["compliance", "efficiency", "security", "growth", "custom"]),
  outcome_statement: z.string().max(2000).default(""),
  target_vertical: z.string().max(200).default(""),
  target_persona: z.string().max(200).default(""),
});

export async function updateServiceOutcomeAction(
  bundleId: string,
  data: unknown
): Promise<ActionResult<void>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_bundles")) {
      return { success: false, error: "No permission" };
    }

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const parsed = outcomeSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    await upsertServiceOutcome(orgId, bundleId, {
      outcome_type: parsed.data.outcome_type,
      outcome_statement: parsed.data.outcome_statement,
      target_vertical: parsed.data.target_vertical,
      target_persona: parsed.data.target_persona,
    });

    await dbUpdateBundle(bundleId, { outcome_layer_complete: true });

    await logAudit(profile.id, "bundle_updated", "bundle", bundleId, {
      via: "service_profile",
      layer: "outcome",
    }, orgId);

    revalidatePath(`/services/${bundleId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update outcome" };
  }
}

// ── Update capabilities (from modal) ─────────────────────────────────────────

const capabilitiesSchema = z.object({
  service_capabilities: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).default(""),
  })),
  bundle_type: z.enum(["ala_carte", "tiered", "vertical", "custom"]),
});

export async function updateServiceCapabilitiesAction(
  bundleId: string,
  data: unknown
): Promise<ActionResult<void>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_bundles")) {
      return { success: false, error: "No permission" };
    }

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const parsed = capabilitiesSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    await dbUpdateBundle(bundleId, { bundle_type: parsed.data.bundle_type });

    await upsertServiceOutcome(orgId, bundleId, {
      outcome_type: "custom",
      service_capabilities: parsed.data.service_capabilities.map((c) => ({
        name: c.name,
        description: c.description,
        met_by_tools: [],
      })),
    });

    await logAudit(profile.id, "bundle_updated", "bundle", bundleId, {
      via: "service_profile",
      layer: "service",
      capability_count: parsed.data.service_capabilities.length,
    }, orgId);

    revalidatePath(`/services/${bundleId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update capabilities" };
  }
}

// ── Assign to client ─────────────────────────────────────────────────────────

const assignSchema = z.object({
  client_id: z.string().uuid(),
  bundle_version_id: z.string().uuid(),
  seat_count: z.coerce.number().int().min(1).default(30),
  start_date: z.string().min(1),
  end_date: z.string().optional(),
});

export async function assignServiceToClientAction(
  bundleId: string,
  data: unknown
): Promise<ActionResult<{ contractId: string }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_clients")) {
      return { success: false, error: "No permission" };
    }

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const parsed = assignSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const { getOrgSettings } = await import("@/lib/db/org-settings");
    const settings = await getOrgSettings(orgId);
    if (!settings) return { success: false, error: "Settings not found" };

    const { createContract } = await import("@/lib/db/client-contracts");

    const today = new Date().toISOString().split("T")[0];
    const endDate = parsed.data.end_date || (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split("T")[0];
    })();

    const contract = await createContract({
      client_id: parsed.data.client_id,
      bundle_id: bundleId,
      bundle_version_id: parsed.data.bundle_version_id,
      seat_count: parsed.data.seat_count,
      start_date: parsed.data.start_date || today,
      end_date: endDate,
      notes: "",
      created_by: profile.id,
      workspace_settings: {
        default_overhead_pct: Number(settings.default_overhead_pct),
        default_labor_pct: Number(settings.default_labor_pct),
        default_target_margin_pct: Number(settings.default_target_margin_pct),
        red_zone_margin_pct: Number(settings.red_zone_margin_pct),
        max_discount_no_approval_pct: Number(settings.max_discount_no_approval_pct),
      },
    });

    await logAudit(profile.id, "contract_created", "client_contract", contract.id, {
      bundle_id: bundleId,
      client_id: parsed.data.client_id,
      via: "service_profile",
    }, orgId);

    revalidatePath(`/services/${bundleId}`);
    revalidatePath("/clients");
    return { success: true, data: { contractId: contract.id } };
  } catch {
    return { success: false, error: "Failed to assign service" };
  }
}
