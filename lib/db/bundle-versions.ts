import { createClient } from "@/lib/supabase/server";
import { calculatePricing } from "@/lib/pricing/engine";
import { getToolById } from "@/lib/db/tools";
import type {
  BundleVersion,
  BundleVersionWithTools,
  BundleVersionTool,
  PricingInput,
  PricingOutput,
  PricingToolInput,
  RiskTier,
  Tool,
} from "@/lib/types";

export async function getVersionsByBundleId(
  bundleId: string
): Promise<BundleVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bundle_versions")
    .select("*")
    .eq("bundle_id", bundleId)
    .order("version_number", { ascending: false });

  if (error) throw error;
  return (data as BundleVersion[]) ?? [];
}

export async function getVersionById(
  id: string
): Promise<BundleVersionWithTools | null> {
  const supabase = await createClient();

  const { data: version, error } = await supabase
    .from("bundle_versions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const { data: versionTools, error: toolsError } = await supabase
    .from("bundle_version_tools")
    .select("*")
    .eq("bundle_version_id", id);

  if (toolsError) throw toolsError;

  // Fetch full tool data for each version tool
  const toolsWithDetails: BundleVersionTool[] = [];
  for (const vt of versionTools ?? []) {
    const tool = await getToolById(vt.tool_id);
    toolsWithDetails.push({
      id: vt.id,
      bundle_version_id: vt.bundle_version_id,
      tool_id: vt.tool_id,
      quantity_multiplier: Number(vt.quantity_multiplier),
      tool: tool ?? undefined,
    });
  }

  return {
    ...(version as BundleVersion),
    tools: toolsWithDetails,
  };
}

export async function getLatestVersionNumber(
  bundleId: string
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bundle_versions")
    .select("version_number")
    .eq("bundle_id", bundleId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  return data?.version_number ?? 0;
}

export interface CreateVersionInput {
  bundle_id: string;
  seat_count: number;
  risk_tier: RiskTier;
  contract_term_months: number;
  target_margin_pct: number;
  overhead_pct: number;
  labor_pct: number;
  discount_pct: number;
  notes: string;
  tools: { tool_id: string; quantity_multiplier: number }[];
  created_by: string;
  red_zone_margin_pct: number;
  max_discount_no_approval_pct: number;
  // v2 sell-strategy fields
  sell_strategy?: string;
  sell_config?: Record<string, unknown>;
  assumptions?: Record<string, unknown>;
}

export async function createVersion(
  input: CreateVersionInput
): Promise<{ version: BundleVersionWithTools; pricing: PricingOutput }> {
  const supabase = await createClient();

  // 1. Resolve next version number
  const latestNum = await getLatestVersionNumber(input.bundle_id);
  const versionNumber = latestNum + 1;

  // 2. Fetch full tool data for each selected tool
  const toolDataMap = new Map<string, Tool>();
  for (const t of input.tools) {
    const tool = await getToolById(t.tool_id);
    if (tool) toolDataMap.set(t.tool_id, tool);
  }

  // 3. Build PricingInput
  const pricingTools: PricingToolInput[] = input.tools
    .filter((t) => toolDataMap.has(t.tool_id))
    .map((t) => {
      const tool = toolDataMap.get(t.tool_id)!;
      return {
        id: tool.id,
        name: tool.name,
        pricing_model: tool.pricing_model,
        per_seat_cost: Number(tool.per_seat_cost),
        flat_monthly_cost: Number(tool.flat_monthly_cost),
        tier_rules: tool.tier_rules ?? [],
        vendor_minimum_monthly: tool.vendor_minimum_monthly
          ? Number(tool.vendor_minimum_monthly)
          : null,
        labor_cost_per_seat: tool.labor_cost_per_seat
          ? Number(tool.labor_cost_per_seat)
          : null,
        quantity_multiplier: t.quantity_multiplier,
      };
    });

  const pricingInput: PricingInput = {
    tools: pricingTools,
    seat_count: input.seat_count,
    target_margin_pct: input.target_margin_pct,
    overhead_pct: input.overhead_pct,
    labor_pct: input.labor_pct,
    discount_pct: input.discount_pct,
    red_zone_margin_pct: input.red_zone_margin_pct,
    max_discount_no_approval_pct: input.max_discount_no_approval_pct,
    contract_term_months: input.contract_term_months,
  };

  // 4. Run pricing engine server-side
  const pricing = calculatePricing(pricingInput);

  // 5. Insert bundle_version
  const { data: version, error: versionError } = await supabase
    .from("bundle_versions")
    .insert({
      bundle_id: input.bundle_id,
      version_number: versionNumber,
      seat_count: input.seat_count,
      risk_tier: input.risk_tier,
      contract_term_months: input.contract_term_months,
      target_margin_pct: input.target_margin_pct,
      overhead_pct: input.overhead_pct,
      labor_pct: input.labor_pct,
      discount_pct: input.discount_pct,
      notes: input.notes,
      computed_true_cost_per_seat: pricing.true_cost_per_seat,
      computed_suggested_price: pricing.suggested_price_per_seat,
      computed_discounted_price: pricing.discounted_price_per_seat,
      computed_margin_pre_discount: pricing.margin_pct_pre_discount,
      computed_margin_post_discount: pricing.margin_pct_post_discount,
      computed_mrr: pricing.total_mrr,
      computed_arr: pricing.total_arr,
      pricing_flags: pricing.flags,
      created_by: input.created_by,
      // v2 sell-strategy fields
      ...(input.sell_strategy && { sell_strategy: input.sell_strategy }),
      ...(input.sell_config && { sell_config: input.sell_config }),
      ...(input.assumptions && { assumptions: input.assumptions }),
    })
    .select()
    .single();

  if (versionError) throw versionError;

  // 6. Insert bundle_version_tools
  const versionToolsToInsert = input.tools
    .filter((t) => toolDataMap.has(t.tool_id))
    .map((t) => ({
      bundle_version_id: version.id,
      tool_id: t.tool_id,
      quantity_multiplier: t.quantity_multiplier,
    }));

  const { error: toolsError } = await supabase
    .from("bundle_version_tools")
    .insert(versionToolsToInsert);

  if (toolsError) throw toolsError;

  // 7. Build return value
  const versionTools: BundleVersionTool[] = input.tools
    .filter((t) => toolDataMap.has(t.tool_id))
    .map((t) => ({
      id: "",
      bundle_version_id: version.id,
      tool_id: t.tool_id,
      quantity_multiplier: t.quantity_multiplier,
      tool: toolDataMap.get(t.tool_id),
    }));

  return {
    version: {
      ...(version as BundleVersion),
      tools: versionTools,
    },
    pricing,
  };
}
