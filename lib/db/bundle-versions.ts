import { createClient } from "@/lib/supabase/server";
import { calculatePricing } from "@/lib/pricing/engine";
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

  // Batch-fetch full tool data for all version tools
  const toolIds = (versionTools ?? []).map((vt) => vt.tool_id);
  const toolMap = new Map<string, Tool>();
  if (toolIds.length > 0) {
    const { data: tools } = await supabase
      .from("tools")
      .select("*")
      .in("id", toolIds);
    for (const t of tools ?? []) {
      toolMap.set(t.id, t as Tool);
    }
  }

  const toolsWithDetails: BundleVersionTool[] = (versionTools ?? []).map((vt) => ({
    id: vt.id,
    bundle_version_id: vt.bundle_version_id,
    tool_id: vt.tool_id,
    quantity_multiplier: Number(vt.quantity_multiplier),
    tool: toolMap.get(vt.tool_id) ?? undefined,
  }));

  return {
    ...(version as BundleVersion),
    tools: toolsWithDetails,
  };
}

export async function getToolsByVersionIds(
  versionIds: string[]
): Promise<
  Map<string, Array<{ tool_id: string; tool_name: string; category: string }>>
> {
  const result = new Map<
    string,
    Array<{ tool_id: string; tool_name: string; category: string }>
  >();
  if (versionIds.length === 0) return result;

  const supabase = await createClient();

  // Fetch all version-tool links for the given version IDs
  const { data: versionTools, error: vtError } = await supabase
    .from("bundle_version_tools")
    .select("*")
    .in("bundle_version_id", versionIds);

  if (vtError) throw vtError;
  if (!versionTools || versionTools.length === 0) return result;

  // Batch-fetch tool details
  const toolIds = [...new Set(versionTools.map((vt) => vt.tool_id))];
  const { data: tools, error: toolsError } = await supabase
    .from("tools")
    .select("id, name, category")
    .in("id", toolIds);

  if (toolsError) throw toolsError;

  const toolMap = new Map(
    (tools ?? []).map((t) => [t.id, { name: t.name, category: t.category }])
  );

  // Group by version_id
  for (const vt of versionTools) {
    const tool = toolMap.get(vt.tool_id);
    if (!tool) continue;
    const list = result.get(vt.bundle_version_id) ?? [];
    list.push({
      tool_id: vt.tool_id,
      tool_name: tool.name,
      category: tool.category,
    });
    result.set(vt.bundle_version_id, list);
  }

  return result;
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
  tool_cost_overrides?: Record<string, number>;
}

export async function createVersion(
  input: CreateVersionInput
): Promise<{ version: BundleVersionWithTools; pricing: PricingOutput }> {
  const supabase = await createClient();

  // 1. Resolve next version number
  const latestNum = await getLatestVersionNumber(input.bundle_id);
  const versionNumber = latestNum + 1;

  // 2. Batch-fetch full tool data for all selected tools
  const toolDataMap = new Map<string, Tool>();
  const inputToolIds = input.tools.map((t) => t.tool_id);
  if (inputToolIds.length > 0) {
    const { data: fetchedTools } = await supabase
      .from("tools")
      .select("*")
      .in("id", inputToolIds);
    for (const t of fetchedTools ?? []) {
      toolDataMap.set(t.id, t as Tool);
    }
  }

  // 3. Build PricingInput (includes all v2 fields for canonical engine)
  const overrides = input.tool_cost_overrides ?? {};
  const pricingTools: PricingToolInput[] = input.tools
    .filter((t) => toolDataMap.has(t.tool_id))
    .map((t) => {
      const tool = toolDataMap.get(t.tool_id)!;
      const costOverride = overrides[t.tool_id];
      return {
        id: tool.id,
        name: tool.name,
        pricing_model: costOverride != null ? ("per_seat" as const) : tool.pricing_model,
        per_seat_cost: costOverride != null ? costOverride : Number(tool.per_seat_cost),
        flat_monthly_cost: costOverride != null ? 0 : Number(tool.flat_monthly_cost),
        tier_rules: costOverride != null ? [] : (tool.tier_rules ?? []),
        vendor_minimum_monthly: costOverride != null ? null : (tool.vendor_minimum_monthly
          ? Number(tool.vendor_minimum_monthly)
          : null),
        labor_cost_per_seat: tool.labor_cost_per_seat
          ? Number(tool.labor_cost_per_seat)
          : null,
        quantity_multiplier: t.quantity_multiplier,
        // v2 fields — now used by the canonical engine
        annual_flat_cost: costOverride != null ? 0 : Number(tool.annual_flat_cost ?? 0),
        per_user_cost: costOverride != null ? 0 : Number(tool.per_user_cost ?? 0),
        per_org_cost: costOverride != null ? 0 : Number(tool.per_org_cost ?? 0),
        percent_discount: costOverride != null ? 0 : Number(tool.percent_discount ?? 0),
        flat_discount: costOverride != null ? 0 : Number(tool.flat_discount ?? 0),
        min_monthly_commit: costOverride != null ? null : (tool.min_monthly_commit
          ? Number(tool.min_monthly_commit)
          : null),
        tier_metric: costOverride != null ? undefined : tool.tier_metric,
      };
    });

  // Resolve assumptions: use explicit input or default to seat_count
  const defaultAssumptions = {
    endpoints: input.seat_count,
    users: input.seat_count,
    org_count: 1,
  };
  const assumptions = input.assumptions
    ? (input.assumptions as unknown as PricingInput["assumptions"])
    : defaultAssumptions;

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
    assumptions,
    sell_config: input.sell_config as PricingInput["sell_config"],
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
      // Renewal pricing (FIX 7)
      computed_renewal_price_per_seat: pricing.renewal_suggested_price_per_seat,
      computed_renewal_margin: pricing.renewal_margin_post_discount,
      // Staleness tracking (FIX 6)
      pricing_last_computed_at: new Date().toISOString(),
      is_pricing_stale: false,
      stale_reason: null,
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

/**
 * Returns all bundle versions marked as pricing-stale for a given org.
 * Used by the UI to surface warnings when tool costs have changed
 * since a version's pricing was computed.
 */
export async function getStaleVersionsByOrgId(
  orgId: string
): Promise<BundleVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bundle_versions")
    .select("*, bundles!inner(org_id)")
    .eq("bundles.org_id", orgId)
    .eq("is_pricing_stale", true);

  if (error) throw error;
  return (data as unknown as BundleVersion[]) ?? [];
}

export async function getPreviousVersion(
  bundleId: string,
  versionNumber: number,
): Promise<BundleVersion | null> {
  if (versionNumber <= 1) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bundle_versions")
    .select("*")
    .eq("bundle_id", bundleId)
    .eq("version_number", versionNumber - 1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as BundleVersion;
}
