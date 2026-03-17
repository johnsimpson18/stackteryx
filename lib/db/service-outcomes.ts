import { createClient } from "@/lib/supabase/server";
import type { ServiceOutcome, ServiceCapability, SelectedOutcomeRecord } from "@/lib/types";

export async function upsertServiceOutcome(
  orgId: string,
  bundleId: string,
  data: {
    outcome_type: string;
    outcome_statement?: string;
    target_vertical?: string;
    target_persona?: string;
    service_capabilities?: ServiceCapability[];
    selected_outcomes?: SelectedOutcomeRecord[];
    ai_drafted?: boolean;
  }
): Promise<ServiceOutcome> {
  const supabase = await createClient();

  // Only include fields that are explicitly provided — prevents overwriting
  // data saved by other wizard steps (e.g. step 1 re-save wiping step 2 capabilities)
  const row: Record<string, unknown> = {
    org_id: orgId,
    bundle_id: bundleId,
    outcome_type: data.outcome_type,
  };

  if (data.outcome_statement !== undefined) row.outcome_statement = data.outcome_statement || null;
  if (data.target_vertical !== undefined) row.target_vertical = data.target_vertical || null;
  if (data.target_persona !== undefined) row.target_persona = data.target_persona || null;
  if (data.service_capabilities !== undefined) row.service_capabilities = data.service_capabilities;
  if (data.selected_outcomes !== undefined) row.selected_outcomes = data.selected_outcomes;
  if (data.ai_drafted !== undefined) row.ai_drafted = data.ai_drafted;

  const { data: result, error } = await supabase
    .from("service_outcomes")
    .upsert(row, { onConflict: "bundle_id" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return result as ServiceOutcome;
}

export async function getServiceOutcomesByOrgId(
  orgId: string
): Promise<ServiceOutcome[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_outcomes")
    .select("*")
    .eq("org_id", orgId);

  if (error) throw error;
  return (data as ServiceOutcome[]) ?? [];
}

export async function getServiceOutcome(
  bundleId: string
): Promise<ServiceOutcome | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_outcomes")
    .select("*")
    .eq("bundle_id", bundleId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as ServiceOutcome;
}
