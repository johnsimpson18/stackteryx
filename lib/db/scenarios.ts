import { createClient } from "@/lib/supabase/server";
import type { ScenarioInputs, SellConfig } from "@/lib/types";

export interface CreateScenarioInput {
  bundle_id: string;
  name: string;
  endpoints: number;
  users: number;
  headcount: number;
  org_count: number;
  contract_term_months: number;
  sites: number;
  sell_config: SellConfig;
  is_default?: boolean;
}

export async function getScenarioById(
  id: string
): Promise<ScenarioInputs | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as ScenarioInputs;
}

export async function getScenariosByBundleId(
  bundleId: string
): Promise<ScenarioInputs[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenarios")
    .select("*")
    .eq("bundle_id", bundleId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as ScenarioInputs[]) ?? [];
}

export async function createScenario(
  input: CreateScenarioInput
): Promise<ScenarioInputs> {
  const supabase = await createClient();

  // If this is the first scenario for the bundle, make it the default
  const existing = await getScenariosByBundleId(input.bundle_id);
  const shouldBeDefault = input.is_default ?? existing.length === 0;

  // If setting this as default, clear existing default first
  if (shouldBeDefault && existing.some((s) => s.is_default)) {
    await supabase
      .from("scenarios")
      .update({ is_default: false })
      .eq("bundle_id", input.bundle_id)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("scenarios")
    .insert({
      bundle_id: input.bundle_id,
      name: input.name,
      endpoints: input.endpoints,
      users: input.users,
      headcount: input.headcount,
      org_count: input.org_count,
      contract_term_months: input.contract_term_months,
      sites: input.sites,
      sell_config: input.sell_config,
      is_default: shouldBeDefault,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ScenarioInputs;
}

export async function updateScenario(
  id: string,
  updates: Partial<Omit<CreateScenarioInput, "bundle_id">>
): Promise<ScenarioInputs> {
  const supabase = await createClient();

  // If setting as default, clear other defaults in this bundle first
  if (updates.is_default) {
    const { data: existing } = await supabase
      .from("scenarios")
      .select("bundle_id")
      .eq("id", id)
      .single();
    if (existing) {
      await supabase
        .from("scenarios")
        .update({ is_default: false })
        .eq("bundle_id", existing.bundle_id)
        .neq("id", id);
    }
  }

  const { data, error } = await supabase
    .from("scenarios")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ScenarioInputs;
}

export async function deleteScenario(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("scenarios").delete().eq("id", id);
  if (error) throw error;
}
