import { createClient } from "@/lib/supabase/server";
import type { OnboardingToolSelection, OnboardingToolPricing } from "@/lib/types";
import type { Database } from "@/types/supabase";

type InsertRow = Database["public"]["Tables"]["onboarding_tool_selections"]["Insert"];

/**
 * Fetch all onboarding tool selections for the given org.
 */
export async function getOnboardingTools(
  orgId: string
): Promise<OnboardingToolSelection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("onboarding_tool_selections")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OnboardingToolSelection[];
}

/**
 * Upsert all tool selections for the given org.
 * Deletes tools that are no longer in the provided list.
 */
export async function saveOnboardingTools(
  orgId: string,
  tools: Array<{
    tool_name: string;
    vendor_name?: string | null;
    category: string;
    is_custom?: boolean;
  }>
): Promise<void> {
  const supabase = await createClient();

  // Get current tool names so we can delete removed ones
  const { data: existing } = await supabase
    .from("onboarding_tool_selections")
    .select("tool_name")
    .eq("org_id", orgId);

  const incomingNames = new Set(tools.map((t) => t.tool_name));
  const toDelete = (existing ?? [])
    .map((r) => r.tool_name)
    .filter((name) => !incomingNames.has(name));

  // Delete removed tools
  if (toDelete.length > 0) {
    const { error: delError } = await supabase
      .from("onboarding_tool_selections")
      .delete()
      .eq("org_id", orgId)
      .in("tool_name", toDelete);

    if (delError) throw delError;
  }

  // Upsert current selections
  if (tools.length > 0) {
    const rows: InsertRow[] = tools.map((t) => ({
      org_id: orgId,
      tool_name: t.tool_name,
      vendor_name: t.vendor_name ?? null,
      category: t.category,
      is_custom: t.is_custom ?? false,
    }));

    const { error: upsertError } = await supabase
      .from("onboarding_tool_selections")
      .upsert(rows, { onConflict: "org_id,tool_name" });

    if (upsertError) throw upsertError;
  }
}

/**
 * Update pricing fields for a single tool selection.
 * Sets pricing_entered = true.
 */
export async function updateToolPricing(
  orgId: string,
  toolName: string,
  pricing: OnboardingToolPricing
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("onboarding_tool_selections")
    .update({
      billing_basis: pricing.billing_basis ?? null,
      cost_amount: pricing.cost_amount ?? null,
      sell_amount: pricing.sell_amount ?? null,
      min_commitment: pricing.min_commitment ?? null,
      min_units: pricing.min_units ?? null,
      pricing_entered: true,
    })
    .eq("org_id", orgId)
    .eq("tool_name", toolName);

  if (error) throw error;
}
