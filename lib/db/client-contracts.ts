import { createClient } from "@/lib/supabase/server";
import type { ClientContract, ClientContractWithMeta } from "@/lib/types";
import { calculatePricing } from "@/lib/pricing/engine";
import type { PricingInput, PricingToolInput, BundleType } from "@/lib/types";
import { getVersionById } from "@/lib/db/bundle-versions";

export async function getContractsByClientId(
  clientId: string
): Promise<ClientContractWithMeta[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_contracts")
    .select(`
      *,
      bundles!inner(name, bundle_type),
      bundle_versions!inner(version_number)
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    client_id: row.client_id,
    bundle_id: row.bundle_id,
    bundle_version_id: row.bundle_version_id,
    seat_count: row.seat_count,
    start_date: row.start_date,
    end_date: row.end_date,
    monthly_revenue: Number(row.monthly_revenue),
    monthly_cost: Number(row.monthly_cost),
    margin_pct: Number(row.margin_pct),
    status: row.status as "active" | "expired" | "cancelled",
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bundle_name: (row as any).bundles?.name ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bundle_type: ((row as any).bundles?.bundle_type ?? "custom") as BundleType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    version_number: (row as any).bundle_versions?.version_number ?? 1,
  }));
}

export interface CreateContractInput {
  client_id: string;
  bundle_id: string;
  bundle_version_id: string;
  seat_count: number;
  start_date: string;
  end_date: string;
  notes: string;
  created_by: string;
  workspace_settings: {
    default_overhead_pct: number;
    default_labor_pct: number;
    default_target_margin_pct: number;
    red_zone_margin_pct: number;
    max_discount_no_approval_pct: number;
  };
}

export async function createContract(
  input: CreateContractInput
): Promise<ClientContract> {
  const supabase = await createClient();

  // Fetch version to compute actual pricing at this seat count
  const version = await getVersionById(input.bundle_version_id);
  if (!version) throw new Error("Bundle version not found");

  // Build pricing tools from the version (includes all v2 fields)
  const pricingTools: PricingToolInput[] = version.tools
    .filter((vt) => vt.tool)
    .map((vt) => ({
      id: vt.tool_id,
      name: vt.tool!.name,
      pricing_model: vt.tool!.pricing_model,
      per_seat_cost: Number(vt.tool!.per_seat_cost),
      flat_monthly_cost: Number(vt.tool!.flat_monthly_cost),
      tier_rules: vt.tool!.tier_rules ?? [],
      vendor_minimum_monthly: vt.tool!.vendor_minimum_monthly
        ? Number(vt.tool!.vendor_minimum_monthly)
        : null,
      labor_cost_per_seat: vt.tool!.labor_cost_per_seat
        ? Number(vt.tool!.labor_cost_per_seat)
        : null,
      quantity_multiplier: Number(vt.quantity_multiplier),
      // v2 fields — now used by the canonical engine
      annual_flat_cost: Number(vt.tool!.annual_flat_cost ?? 0),
      per_user_cost: Number(vt.tool!.per_user_cost ?? 0),
      per_org_cost: Number(vt.tool!.per_org_cost ?? 0),
      percent_discount: Number(vt.tool!.percent_discount ?? 0),
      flat_discount: Number(vt.tool!.flat_discount ?? 0),
      min_monthly_commit: vt.tool!.min_monthly_commit
        ? Number(vt.tool!.min_monthly_commit)
        : null,
      tier_metric: vt.tool!.tier_metric,
    }));

  // Use version's stored assumptions or default to seat_count
  const assumptions = (version.assumptions ?? {
    endpoints: input.seat_count,
    users: input.seat_count,
    org_count: 1,
  }) as PricingInput["assumptions"];

  const pricingInput: PricingInput = {
    tools: pricingTools,
    seat_count: input.seat_count,
    target_margin_pct: Number(version.target_margin_pct),
    overhead_pct: Number(version.overhead_pct),
    labor_pct: Number(version.labor_pct),
    discount_pct: Number(version.discount_pct),
    red_zone_margin_pct: input.workspace_settings.red_zone_margin_pct,
    max_discount_no_approval_pct:
      input.workspace_settings.max_discount_no_approval_pct,
    contract_term_months: Number(version.contract_term_months),
    assumptions,
    sell_config: version.sell_config as PricingInput["sell_config"],
  };

  const pricing = calculatePricing(pricingInput);

  const { data: contract, error } = await supabase
    .from("client_contracts")
    .insert({
      client_id: input.client_id,
      bundle_id: input.bundle_id,
      bundle_version_id: input.bundle_version_id,
      seat_count: input.seat_count,
      start_date: input.start_date,
      end_date: input.end_date,
      monthly_revenue: pricing.total_mrr,
      monthly_cost: pricing.total_cost_mrr,
      margin_pct: pricing.margin_pct_post_discount,
      status: "active",
      notes: input.notes,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return contract as ClientContract;
}

export async function cancelContract(id: string): Promise<ClientContract> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_contracts")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ClientContract;
}
