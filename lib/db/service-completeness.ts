import { createClient } from "@/lib/supabase/server";
import type { ServiceCompleteness } from "@/lib/types";

export async function getServiceCompleteness(
  bundleId: string
): Promise<ServiceCompleteness | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_completeness")
    .select("*")
    .eq("bundle_id", bundleId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as ServiceCompleteness;
}

/**
 * Get completeness data for all services in an org.
 * Used by the dashboard Portfolio Health Grid.
 */
export async function getAllServiceCompleteness(
  orgId: string
): Promise<ServiceCompleteness[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_completeness")
    .select("*")
    .eq("org_id", orgId)
    .order("layers_complete", { ascending: true });

  if (error) throw error;
  return (data as ServiceCompleteness[]) ?? [];
}
