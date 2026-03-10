import { createClient } from "@/lib/supabase/server";
import type { ServiceOutcome, ServiceCapability } from "@/lib/types";

export async function upsertServiceOutcome(
  orgId: string,
  bundleId: string,
  data: {
    outcome_type: string;
    outcome_statement?: string;
    target_vertical?: string;
    target_persona?: string;
    service_capabilities?: ServiceCapability[];
    ai_drafted?: boolean;
  }
): Promise<ServiceOutcome> {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("service_outcomes")
    .upsert(
      {
        org_id: orgId,
        bundle_id: bundleId,
        outcome_type: data.outcome_type,
        outcome_statement: data.outcome_statement ?? null,
        target_vertical: data.target_vertical ?? null,
        target_persona: data.target_persona ?? null,
        service_capabilities: data.service_capabilities ?? [],
        ai_drafted: data.ai_drafted ?? false,
      },
      { onConflict: "bundle_id" }
    )
    .select()
    .single();

  if (error) throw error;
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
