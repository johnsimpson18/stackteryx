"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createClient_ as dbCreateClient,
  updateClient as dbUpdateClient,
  getClientById,
} from "@/lib/db/clients";
import {
  createContract as dbCreateContract,
  cancelContract as dbCancelContract,
} from "@/lib/db/client-contracts";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgSettings } from "@/lib/db/org-settings";
import { logAudit } from "@/lib/db/audit";
import { hasOrgPermission } from "@/lib/constants";
import { requireOrgMembership } from "@/lib/org-context";
import type { ActionResult, Client, ClientContract } from "@/lib/types";

const clientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(200),
  industry: z.string().max(100).default(""),
  contact_name: z.string().max(200).default(""),
  contact_email: z.string().email("Invalid email").or(z.literal("")).default(""),
  status: z.enum(["prospect", "active", "churned"]).default("prospect"),
  notes: z.string().max(2000).default(""),
});

const contractSchema = z.object({
  bundle_id: z.string().uuid("Invalid bundle"),
  bundle_version_id: z.string().uuid("Invalid version"),
  seat_count: z.coerce.number().int().min(1, "Seat count must be at least 1"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  notes: z.string().max(1000).default(""),
});

export async function createClientAction(
  formData: unknown
): Promise<ActionResult<Client>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_clients"))
      return { success: false, error: "You do not have permission to create clients" };

    const parsed = clientSchema.safeParse(formData);
    if (!parsed.success)
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };

    const client = await dbCreateClient({ ...parsed.data, created_by: profile.id, org_id: orgId });

    await logAudit(profile.id, "client_created", "client", client.id, {
      name: client.name,
    }, orgId);

    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true, data: client };
  } catch {
    return { success: false, error: "Failed to create client" };
  }
}

export async function updateClientAction(
  id: string,
  formData: unknown
): Promise<ActionResult<Client>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_clients"))
      return { success: false, error: "You do not have permission to edit clients" };

    // Verify client belongs to the active org
    const existingClient = await getClientById(id);
    if (!existingClient || existingClient.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const parsed = clientSchema.safeParse(formData);
    if (!parsed.success)
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };

    const client = await dbUpdateClient(id, parsed.data);

    await logAudit(profile.id, "client_updated", "client", client.id, {
      name: client.name,
    }, orgId);

    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { success: true, data: client };
  } catch {
    return { success: false, error: "Failed to update client" };
  }
}

export async function createContractAction(
  clientId: string,
  formData: unknown
): Promise<ActionResult<ClientContract>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "create_clients"))
      return { success: false, error: "You do not have permission to create contracts" };

    // Verify client belongs to the active org
    const existingClient = await getClientById(clientId);
    if (!existingClient || existingClient.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const parsed = contractSchema.safeParse(formData);
    if (!parsed.success)
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") };

    const settings = await getOrgSettings(orgId);
    if (!settings) return { success: false, error: "Settings not found" };

    const contract = await dbCreateContract({
      client_id: clientId,
      bundle_id: parsed.data.bundle_id,
      bundle_version_id: parsed.data.bundle_version_id,
      seat_count: parsed.data.seat_count,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      notes: parsed.data.notes,
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
      client_id: clientId,
      bundle_version_id: parsed.data.bundle_version_id,
      seat_count: parsed.data.seat_count,
    }, orgId);

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true, data: contract };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create contract";
    return { success: false, error: message };
  }
}

export async function cancelContractAction(
  contractId: string,
  clientId: string
): Promise<ActionResult<ClientContract>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };
    const { orgId, membership } = await requireOrgMembership();
    if (!hasOrgPermission(membership.role, "edit_clients"))
      return { success: false, error: "You do not have permission to cancel contracts" };

    // Verify client belongs to the active org
    const existingClient = await getClientById(clientId);
    if (!existingClient || existingClient.org_id !== orgId) {
      return { success: false, error: "Not found" };
    }

    const contract = await dbCancelContract(contractId);

    await logAudit(profile.id, "contract_cancelled", "client_contract", contract.id, {
      client_id: clientId,
    }, orgId);

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true, data: contract };
  } catch {
    return { success: false, error: "Failed to cancel contract" };
  }
}
