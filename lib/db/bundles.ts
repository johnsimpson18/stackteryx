import { createClient } from "@/lib/supabase/server";
import type {
  Bundle,
  BundleWithMeta,
  BundleStatus,
  BundleType,
} from "@/lib/types";

export async function getBundles(orgId?: string): Promise<BundleWithMeta[]> {
  const supabase = await createClient();

  // TODO: implement cursor pagination when org data exceeds these limits
  let query = supabase
    .from("bundles")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  const { data: bundles, error } = await query;

  if (error) throw error;
  if (!bundles || bundles.length === 0) return [];

  // Fetch version summaries for each bundle
  const bundleIds = bundles.map((b) => b.id);
  const { data: versions } = await supabase
    .from("bundle_versions")
    .select("bundle_id, version_number, computed_mrr, computed_margin_post_discount")
    .in("bundle_id", bundleIds)
    .order("version_number", { ascending: false });

  const versionMap = new Map<
    string,
    { count: number; latest_mrr: number | null; latest_margin: number | null }
  >();

  if (versions) {
    for (const v of versions) {
      const existing = versionMap.get(v.bundle_id);
      if (!existing) {
        versionMap.set(v.bundle_id, {
          count: 1,
          latest_mrr: v.computed_mrr ? Number(v.computed_mrr) : null,
          latest_margin: v.computed_margin_post_discount
            ? Number(v.computed_margin_post_discount)
            : null,
        });
      } else {
        existing.count += 1;
      }
    }
  }

  return bundles.map((b) => {
    const meta = versionMap.get(b.id);
    return {
      ...(b as Bundle),
      version_count: meta?.count ?? 0,
      latest_mrr: meta?.latest_mrr ?? null,
      latest_margin: meta?.latest_margin ?? null,
    };
  });
}

export async function getBundleById(id: string): Promise<Bundle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Bundle;
}

export async function createBundle(data: {
  name: string;
  bundle_type: BundleType;
  description: string;
  created_by: string;
  org_id: string;
}): Promise<Bundle> {
  const supabase = await createClient();
  const { data: bundle, error } = await supabase
    .from("bundles")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return bundle as Bundle;
}

export async function updateBundle(
  id: string,
  data: Partial<{
    name: string;
    bundle_type: BundleType;
    description: string;
    status: BundleStatus;
    wizard_step_completed: number;
    wizard_in_progress: boolean;
    outcome_layer_complete: boolean;
    stack_layer_complete: boolean;
    economics_layer_complete: boolean;
    enablement_layer_complete: boolean;
    last_ai_analysis_at: string;
  }>
): Promise<Bundle> {
  const supabase = await createClient();
  const { data: bundle, error } = await supabase
    .from("bundles")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return bundle as Bundle;
}

export async function getInProgressBundle(
  orgId: string
): Promise<Bundle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("org_id", orgId)
    .eq("wizard_in_progress", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Bundle | null;
}

export async function archiveBundle(id: string): Promise<Bundle> {
  return updateBundle(id, { status: "archived" });
}
