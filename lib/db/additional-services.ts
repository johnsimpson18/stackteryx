import { createClient } from "@/lib/supabase/server";
import type {
  AdditionalService,
  AdditionalServiceCategory,
  AdditionalServiceBillingType,
  AdditionalServiceCostType,
  AdditionalServiceStatus,
  BundleVersionAdditionalService,
  BundleVersionAdditionalServiceWithDetails,
} from "@/lib/types";

// ── Catalog CRUD ──────────────────────────────────────────────────────────────

export async function getAdditionalServicesByOrgId(
  orgId: string,
  status?: AdditionalServiceStatus
): Promise<AdditionalService[]> {
  const supabase = await createClient();
  let query = supabase
    .from("additional_services")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AdditionalService[];
}

export async function getAdditionalServiceById(
  id: string
): Promise<AdditionalService | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("additional_services")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as AdditionalService;
}

export interface CreateAdditionalServiceInput {
  org_id: string;
  name: string;
  description?: string | null;
  category: AdditionalServiceCategory;
  billing_type: AdditionalServiceBillingType;
  cost_type: AdditionalServiceCostType;
  cost: number;
  cost_unit?: string | null;
  sell_price: number;
  sell_unit?: string | null;
  status?: AdditionalServiceStatus;
  notes?: string | null;
}

export async function createAdditionalService(
  data: CreateAdditionalServiceInput
): Promise<AdditionalService> {
  const supabase = await createClient();
  const { data: svc, error } = await supabase
    .from("additional_services")
    .insert({
      org_id: data.org_id,
      name: data.name,
      description: data.description ?? null,
      category: data.category,
      billing_type: data.billing_type,
      cost_type: data.cost_type,
      cost: data.cost,
      cost_unit: data.cost_unit ?? null,
      sell_price: data.sell_price,
      sell_unit: data.sell_unit ?? null,
      status: data.status ?? "active",
      notes: data.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return svc as AdditionalService;
}

export async function updateAdditionalService(
  id: string,
  data: Partial<
    Omit<AdditionalService, "id" | "org_id" | "created_at" | "updated_at" | "margin_pct">
  >
): Promise<AdditionalService> {
  const supabase = await createClient();
  const { data: svc, error } = await supabase
    .from("additional_services")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return svc as AdditionalService;
}

export async function archiveAdditionalService(
  id: string
): Promise<AdditionalService> {
  return updateAdditionalService(id, { status: "archived" });
}

// ── Usage counts per additional service ───────────────────────────────────────

export interface AdditionalServiceUsage {
  additional_service_id: string;
  bundle_id: string;
  bundle_name: string;
}

export async function getAdditionalServiceUsages(
  orgId: string
): Promise<AdditionalServiceUsage[]> {
  const supabase = await createClient();

  // Get all junction rows for this org, then join with bundle_versions to get bundle info
  const { data: bvasRows, error: bvasError } = await supabase
    .from("bundle_version_additional_services")
    .select("additional_service_id, bundle_version_id")
    .eq("org_id", orgId);

  if (bvasError) throw bvasError;
  if (!bvasRows || bvasRows.length === 0) return [];

  // Get unique version IDs
  const versionIds = [...new Set(bvasRows.map((r) => r.bundle_version_id))];
  const { data: versions, error: vError } = await supabase
    .from("bundle_versions")
    .select("id, bundle_id")
    .in("id", versionIds);

  if (vError) throw vError;

  const versionMap = new Map(
    (versions ?? []).map((v: { id: string; bundle_id: string }) => [v.id, v.bundle_id])
  );

  // Get bundle names
  const bundleIds = [...new Set([...versionMap.values()])];
  const { data: bundles, error: bError } = await supabase
    .from("bundles")
    .select("id, name")
    .in("id", bundleIds);

  if (bError) throw bError;

  const bundleNameMap = new Map(
    (bundles ?? []).map((b: { id: string; name: string }) => [b.id, b.name])
  );

  // Deduplicate by (additional_service_id, bundle_id)
  const seen = new Set<string>();
  const results: AdditionalServiceUsage[] = [];

  for (const row of bvasRows) {
    const bundleId = versionMap.get(row.bundle_version_id);
    if (!bundleId) continue;
    const key = `${row.additional_service_id}:${bundleId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      additional_service_id: row.additional_service_id,
      bundle_id: bundleId,
      bundle_name: bundleNameMap.get(bundleId) ?? "Unknown",
    });
  }

  return results;
}

// ── Bundle Version Additional Services ────────────────────────────────────────

export async function getAdditionalServicesByVersionId(
  versionId: string
): Promise<BundleVersionAdditionalServiceWithDetails[]> {
  const supabase = await createClient();

  // Fetch junction rows
  const { data: bvasRows, error: bvasError } = await supabase
    .from("bundle_version_additional_services")
    .select("*")
    .eq("bundle_version_id", versionId)
    .order("sort_order");

  if (bvasError) throw bvasError;
  if (!bvasRows || bvasRows.length === 0) return [];

  // Batch-fetch the catalog services
  const serviceIds = bvasRows.map((r) => r.additional_service_id);
  const { data: services, error: svcError } = await supabase
    .from("additional_services")
    .select("*")
    .in("id", serviceIds);

  if (svcError) throw svcError;

  const serviceMap = new Map(
    ((services ?? []) as AdditionalService[]).map((s) => [s.id, s])
  );

  return (bvasRows as BundleVersionAdditionalService[]).map((bvas) => {
    const svc = serviceMap.get(bvas.additional_service_id)!;
    const effectiveCost = bvas.cost_override ?? Number(svc.cost);
    const effectiveSell = bvas.sell_price_override ?? Number(svc.sell_price);
    const effectiveMargin =
      effectiveSell === 0
        ? 0
        : effectiveCost === 0
          ? 100
          : Math.round(((effectiveSell - effectiveCost) / effectiveSell) * 10000) / 100;

    return {
      ...bvas,
      additional_service: svc,
      effective_cost: effectiveCost,
      effective_sell_price: effectiveSell,
      effective_margin_pct: effectiveMargin,
    };
  });
}

export async function addAdditionalServiceToVersion(
  versionId: string,
  serviceId: string,
  orgId: string,
  overrides?: {
    cost_override?: number | null;
    sell_price_override?: number | null;
    quantity?: number;
  }
): Promise<BundleVersionAdditionalService> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bundle_version_additional_services")
    .insert({
      bundle_version_id: versionId,
      additional_service_id: serviceId,
      org_id: orgId,
      cost_override: overrides?.cost_override ?? null,
      sell_price_override: overrides?.sell_price_override ?? null,
      quantity: overrides?.quantity ?? 1,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BundleVersionAdditionalService;
}

export async function updateAdditionalServiceOnVersion(
  bvasId: string,
  updates: {
    cost_override?: number | null;
    sell_price_override?: number | null;
    quantity?: number;
  }
): Promise<BundleVersionAdditionalService> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bundle_version_additional_services")
    .update(updates)
    .eq("id", bvasId)
    .select()
    .single();

  if (error) throw error;
  return data as BundleVersionAdditionalService;
}

export async function removeAdditionalServiceFromVersion(
  bvasId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bundle_version_additional_services")
    .delete()
    .eq("id", bvasId);

  if (error) throw error;
}
