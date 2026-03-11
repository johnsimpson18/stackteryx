import { createClient } from "@/lib/supabase/server";
import type {
  GlobalVendor,
  OrgVendor,
  OrgVendorWithMeta,
  OrgVendorDetail,
  CostModel,
  CostModelWithTiers,
  CostModelTier,
  OrgVendorDiscount,
  VendorImport,
  BillingBasis,
  BillingCadence,
  DiscountType,
} from "@/lib/types";

// ── Global vendors (read-only catalog) ───────────────────────────────────────

export async function getGlobalVendors(): Promise<GlobalVendor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .order("name");

  if (error) throw error;
  return (data as GlobalVendor[]) ?? [];
}

// ── Org vendors ──────────────────────────────────────────────────────────────

export async function getOrgVendors(
  orgId: string
): Promise<OrgVendorWithMeta[]> {
  const supabase = await createClient();

  // TODO: implement cursor pagination when org data exceeds these limits
  const { data, error } = await supabase
    .from("org_vendors")
    .select(`
      *,
      vendors ( name, logo_url ),
      cost_models ( id )
    `)
    .eq("org_id", orgId)
    .order("display_name")
    .limit(500);

  if (error) throw error;

  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    return {
      id: r.id,
      org_id: r.org_id,
      vendor_id: r.vendor_id,
      display_name: r.display_name,
      category: r.category,
      notes: r.notes,
      is_active: r.is_active,
      created_by: r.created_by,
      updated_by: r.updated_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
      global_vendor_name: r.vendors?.name ?? null,
      global_vendor_logo: r.vendors?.logo_url ?? null,
      cost_model_count: Array.isArray(r.cost_models)
        ? r.cost_models.length
        : 0,
    };
  });
}

export async function getOrgVendorById(
  orgId: string,
  vendorId: string
): Promise<OrgVendorDetail | null> {
  const supabase = await createClient();

  // Fetch the org_vendor
  const { data: vendor, error: vendorError } = await supabase
    .from("org_vendors")
    .select(`
      *,
      vendors ( name, logo_url )
    `)
    .eq("id", vendorId)
    .eq("org_id", orgId)
    .single();

  if (vendorError) {
    if (vendorError.code === "PGRST116") return null;
    throw vendorError;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = vendor as any;

  // Fetch cost models for this vendor
  const { data: costModels, error: cmError } = await supabase
    .from("cost_models")
    .select("*")
    .eq("org_vendor_id", vendorId)
    .order("name");

  if (cmError) throw cmError;

  // Fetch tiers for all cost models
  const costModelIds = (costModels ?? []).map((cm) => cm.id);
  let tiers: CostModelTier[] = [];
  if (costModelIds.length > 0) {
    const { data: tierData, error: tierError } = await supabase
      .from("cost_model_tiers")
      .select("*")
      .in("cost_model_id", costModelIds)
      .order("min_value");

    if (tierError) throw tierError;
    tiers = (tierData ?? []) as CostModelTier[];
  }

  // Fetch discounts
  const { data: discounts, error: discError } = await supabase
    .from("org_vendor_discounts")
    .select("*")
    .eq("org_vendor_id", vendorId);

  if (discError) throw discError;

  // Assemble cost models with tiers
  const modelsWithTiers: CostModelWithTiers[] = (costModels ?? []).map(
    (cm) => ({
      ...(cm as CostModel),
      tiers: tiers.filter((t) => t.cost_model_id === cm.id),
    })
  );

  return {
    id: v.id,
    org_id: v.org_id,
    vendor_id: v.vendor_id,
    display_name: v.display_name,
    category: v.category,
    notes: v.notes,
    is_active: v.is_active,
    created_by: v.created_by,
    updated_by: v.updated_by,
    created_at: v.created_at,
    updated_at: v.updated_at,
    global_vendor_name: v.vendors?.name ?? null,
    global_vendor_logo: v.vendors?.logo_url ?? null,
    cost_models: modelsWithTiers,
    discounts: (discounts ?? []) as OrgVendorDiscount[],
  };
}

// ── Create / Update org vendor ───────────────────────────────────────────────

export interface CreateOrgVendorInput {
  display_name: string;
  category?: string | null;
  notes?: string | null;
  vendor_id?: string | null;
}

export async function createOrgVendor(
  orgId: string,
  userId: string,
  data: CreateOrgVendorInput
): Promise<OrgVendor> {
  const supabase = await createClient();
  const { data: vendor, error } = await supabase
    .from("org_vendors")
    .insert({
      org_id: orgId,
      display_name: data.display_name,
      category: data.category ?? null,
      notes: data.notes ?? null,
      vendor_id: data.vendor_id ?? null,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return vendor as OrgVendor;
}

export interface UpdateOrgVendorInput {
  display_name?: string;
  category?: string | null;
  notes?: string | null;
  vendor_id?: string | null;
}

export async function updateOrgVendor(
  orgId: string,
  userId: string,
  vendorId: string,
  data: UpdateOrgVendorInput
): Promise<OrgVendor> {
  const supabase = await createClient();
  const { data: vendor, error } = await supabase
    .from("org_vendors")
    .update({
      ...data,
      updated_by: userId,
    })
    .eq("id", vendorId)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) throw error;
  return vendor as OrgVendor;
}

// ── Cost models ──────────────────────────────────────────────────────────────

export interface CreateCostModelInput {
  org_vendor_id: string;
  name: string;
  billing_basis: BillingBasis;
  cadence: BillingCadence;
}

export async function createCostModel(
  orgId: string,
  userId: string,
  data: CreateCostModelInput
): Promise<CostModel> {
  const supabase = await createClient();

  // Verify the parent org_vendor belongs to this org
  const { data: parent, error: parentError } = await supabase
    .from("org_vendors")
    .select("id")
    .eq("id", data.org_vendor_id)
    .eq("org_id", orgId)
    .single();

  if (parentError || !parent) {
    throw new Error("Vendor not found or does not belong to this org");
  }

  const { data: model, error } = await supabase
    .from("cost_models")
    .insert({
      org_vendor_id: data.org_vendor_id,
      org_id: orgId,
      name: data.name,
      billing_basis: data.billing_basis,
      cadence: data.cadence,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return model as CostModel;
}

export interface UpdateCostModelInput {
  name?: string;
  billing_basis?: BillingBasis;
  cadence?: BillingCadence;
}

export async function updateCostModel(
  orgId: string,
  userId: string,
  modelId: string,
  data: UpdateCostModelInput
): Promise<CostModel> {
  const supabase = await createClient();

  // Verify ownership chain: cost_model → org_vendor → org_id
  const { data: model, error: fetchError } = await supabase
    .from("cost_models")
    .select("org_vendor_id")
    .eq("id", modelId)
    .single();

  if (fetchError || !model) {
    throw new Error("Cost model not found");
  }

  const { data: parent, error: parentError } = await supabase
    .from("org_vendors")
    .select("id")
    .eq("id", model.org_vendor_id)
    .eq("org_id", orgId)
    .single();

  if (parentError || !parent) {
    throw new Error("Cost model does not belong to this org");
  }

  const { data: updated, error } = await supabase
    .from("cost_models")
    .update({
      ...data,
      updated_by: userId,
    })
    .eq("id", modelId)
    .select()
    .single();

  if (error) throw error;
  return updated as CostModel;
}

// ── Cost model tiers ─────────────────────────────────────────────────────────

export interface TierInput {
  min_value: number;
  max_value?: number | null;
  unit_price: number;
}

export async function upsertCostModelTiers(
  costModelId: string,
  tiers: TierInput[]
): Promise<CostModelTier[]> {
  const supabase = await createClient();

  // Delete existing tiers
  const { error: deleteError } = await supabase
    .from("cost_model_tiers")
    .delete()
    .eq("cost_model_id", costModelId);

  if (deleteError) throw deleteError;

  if (tiers.length === 0) return [];

  // Insert new tiers
  const { data, error } = await supabase
    .from("cost_model_tiers")
    .insert(
      tiers.map((t) => ({
        cost_model_id: costModelId,
        min_value: t.min_value,
        max_value: t.max_value ?? null,
        unit_price: t.unit_price,
      }))
    )
    .select();

  if (error) throw error;
  return (data ?? []) as CostModelTier[];
}

// ── Org vendor discounts ─────────────────────────────────────────────────────

export interface DiscountInput {
  discount_type: DiscountType;
  value: number;
}

export async function upsertOrgVendorDiscount(
  orgVendorId: string,
  data: DiscountInput
): Promise<OrgVendorDiscount> {
  const supabase = await createClient();

  // Check if a discount already exists for this vendor
  const { data: existing } = await supabase
    .from("org_vendor_discounts")
    .select("id")
    .eq("org_vendor_id", orgVendorId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update existing
    const { data: updated, error } = await supabase
      .from("org_vendor_discounts")
      .update({
        discount_type: data.discount_type,
        value: data.value,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return updated as OrgVendorDiscount;
  }

  // Insert new
  const { data: created, error } = await supabase
    .from("org_vendor_discounts")
    .insert({
      org_vendor_id: orgVendorId,
      discount_type: data.discount_type,
      value: data.value,
    })
    .select()
    .single();

  if (error) throw error;
  return created as OrgVendorDiscount;
}

// ── Vendor imports ──────────────────────────────────────────────────────────

export async function getVendorImports(orgId: string): Promise<VendorImport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_imports")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as VendorImport[];
}

export async function getVendorImportById(
  orgId: string,
  importId: string
): Promise<VendorImport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_imports")
    .select("*")
    .eq("id", importId)
    .eq("org_id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as VendorImport;
}
