import { createClient } from "@/lib/supabase/server";
import type {
  TierPackage,
  TierPackageItem,
  TierPackageItemWithBundle,
  TierPackageWithItems,
  TierPackageWithMeta,
  TierPackageStatus,
} from "@/lib/types";

// ── List all packages for an org ─────────────────────────────────────────────

export async function getTierPackages(
  orgId: string
): Promise<TierPackageWithMeta[]> {
  const supabase = await createClient();
  // TODO: implement cursor pagination when org data exceeds these limits
  const { data, error } = await supabase
    .from("tier_packages")
    .select(`
      *,
      tier_package_items ( id )
    `)
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    return {
      id: r.id,
      org_id: r.org_id,
      name: r.name,
      description: r.description,
      status: r.status,
      created_by: r.created_by,
      updated_by: r.updated_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
      item_count: Array.isArray(r.tier_package_items)
        ? r.tier_package_items.length
        : 0,
    };
  });
}

// ── Get a single package by ID ───────────────────────────────────────────────

export async function getTierPackageById(
  orgId: string,
  packageId: string
): Promise<TierPackage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tier_packages")
    .select("*")
    .eq("id", packageId)
    .eq("org_id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as TierPackage;
}

// ── Get package with items + bundle details ──────────────────────────────────

export async function getTierPackageWithItems(
  orgId: string,
  packageId: string
): Promise<TierPackageWithItems | null> {
  const supabase = await createClient();

  // Fetch the package
  const { data: pkg, error: pkgError } = await supabase
    .from("tier_packages")
    .select("*")
    .eq("id", packageId)
    .eq("org_id", orgId)
    .single();

  if (pkgError) {
    if (pkgError.code === "PGRST116") return null;
    throw pkgError;
  }

  // Fetch items with bundle info
  const { data: items, error: itemsError } = await supabase
    .from("tier_package_items")
    .select(`
      *,
      bundles ( name, bundle_type, status )
    `)
    .eq("package_id", packageId)
    .order("sort_order");

  if (itemsError) throw itemsError;

  const itemsWithBundles: TierPackageItemWithBundle[] = (items ?? []).map(
    (item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = item as any;
      return {
        id: r.id,
        package_id: r.package_id,
        bundle_id: r.bundle_id,
        tier_label: r.tier_label,
        sort_order: r.sort_order,
        highlight: r.highlight,
        created_at: r.created_at,
        updated_at: r.updated_at,
        bundle_name: r.bundles?.name ?? "Unknown",
        bundle_type: r.bundles?.bundle_type ?? "custom",
        bundle_status: r.bundles?.status ?? "draft",
      };
    }
  );

  return {
    ...(pkg as TierPackage),
    items: itemsWithBundles,
  };
}

// ── Create a new package ─────────────────────────────────────────────────────

export async function createTierPackage(
  orgId: string,
  userId: string,
  data: { name: string; description?: string }
): Promise<TierPackage> {
  const supabase = await createClient();
  const { data: pkg, error } = await supabase
    .from("tier_packages")
    .insert({
      org_id: orgId,
      name: data.name,
      description: data.description ?? "",
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return pkg as TierPackage;
}

// ── Update a package ─────────────────────────────────────────────────────────

export async function updateTierPackage(
  orgId: string,
  userId: string,
  packageId: string,
  data: Partial<{ name: string; description: string; status: TierPackageStatus }>
): Promise<TierPackage> {
  const supabase = await createClient();
  const { data: pkg, error } = await supabase
    .from("tier_packages")
    .update({ ...data, updated_by: userId })
    .eq("id", packageId)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) throw error;
  return pkg as TierPackage;
}

// ── Delete a package ─────────────────────────────────────────────────────────

export async function deleteTierPackage(
  orgId: string,
  packageId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tier_packages")
    .delete()
    .eq("id", packageId)
    .eq("org_id", orgId);

  if (error) throw error;
}

// ── Upsert items (replace all items for a package) ───────────────────────────

export interface TierPackageItemInput {
  bundle_id: string;
  tier_label: string;
  sort_order: number;
  highlight?: boolean;
}

export async function upsertTierPackageItems(
  packageId: string,
  items: TierPackageItemInput[]
): Promise<TierPackageItem[]> {
  const supabase = await createClient();

  // Delete existing items
  const { error: deleteError } = await supabase
    .from("tier_package_items")
    .delete()
    .eq("package_id", packageId);

  if (deleteError) throw deleteError;

  if (items.length === 0) return [];

  // Insert new items
  const { data, error } = await supabase
    .from("tier_package_items")
    .insert(
      items.map((item) => ({
        package_id: packageId,
        bundle_id: item.bundle_id,
        tier_label: item.tier_label,
        sort_order: item.sort_order,
        highlight: item.highlight ?? false,
      }))
    )
    .select();

  if (error) throw error;
  return (data ?? []) as TierPackageItem[];
}

// ── Get packages that include a specific bundle ──────────────────────────────

export async function getPackagesForBundle(
  orgId: string,
  bundleId: string
): Promise<TierPackageWithMeta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tier_package_items")
    .select(`
      tier_packages (
        *,
        tier_package_items ( id )
      )
    `)
    .eq("bundle_id", bundleId);

  if (error) throw error;

  // Flatten and dedupe packages
  const seen = new Set<string>();
  const result: TierPackageWithMeta[] = [];

  for (const row of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pkg = (row as any).tier_packages;
    if (!pkg || seen.has(pkg.id) || pkg.org_id !== orgId) continue;
    seen.add(pkg.id);
    result.push({
      id: pkg.id,
      org_id: pkg.org_id,
      name: pkg.name,
      description: pkg.description,
      status: pkg.status,
      created_by: pkg.created_by,
      updated_by: pkg.updated_by,
      created_at: pkg.created_at,
      updated_at: pkg.updated_at,
      item_count: Array.isArray(pkg.tier_package_items)
        ? pkg.tier_package_items.length
        : 0,
    });
  }

  return result;
}
