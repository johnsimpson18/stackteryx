"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getActiveOrgId } from "@/lib/org-context";

export interface RenewalKitParams {
  clientId: string;
  clientName: string;
  briefId?: string;
  proposalId?: string;
}

export interface RenewalKitResult {
  briefUrl: string | null;
  proposalUrl: string | null;
  clientUrl: string;
}

/**
 * Assembles URLs for a renewal kit — links to the brief, proposal, and client detail.
 * Actual PDF export is handled by existing export actions when the user clicks each link.
 */
export async function assembleRenewalKit(
  params: RenewalKitParams,
): Promise<RenewalKitResult> {
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No active org");

  const service = createServiceClient();

  let briefUrl: string | null = null;
  let proposalUrl: string | null = null;

  // Verify brief exists
  if (params.briefId) {
    const { data: brief } = await service
      .from("fractional_cto_briefs")
      .select("id")
      .eq("id", params.briefId)
      .eq("org_id", orgId)
      .single();

    if (brief) {
      briefUrl = `/cto-briefs`;
    }
  }

  // Verify proposal exists
  if (params.proposalId) {
    const { data: proposal } = await service
      .from("proposals")
      .select("id")
      .eq("id", params.proposalId)
      .eq("org_id", orgId)
      .single();

    if (proposal) {
      proposalUrl = `/sales-studio`;
    }
  }

  return {
    briefUrl,
    proposalUrl,
    clientUrl: `/clients/${params.clientId}`,
  };
}
