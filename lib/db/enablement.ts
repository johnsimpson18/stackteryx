import { createClient } from "@/lib/supabase/server";
import type { BundleEnablement, EnablementContent } from "@/lib/types";

export async function getEnablementByVersionId(
  orgId: string,
  versionId: string
): Promise<BundleEnablement | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bundle_enablement")
    .select("*")
    .eq("bundle_version_id", versionId)
    .eq("org_id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as BundleEnablement;
}

const ENABLEMENT_KEYS: (keyof EnablementContent)[] = [
  "service_overview",
  "whats_included",
  "talking_points",
  "pricing_narrative",
  "why_us",
];

export async function getEnablementStatusByBundleId(
  orgId: string,
  bundleId: string
): Promise<{ versionId: string; hasEnablement: boolean }[]> {
  const supabase = await createClient();

  const { data: versions } = await supabase
    .from("bundle_versions")
    .select("id")
    .eq("bundle_id", bundleId);

  if (!versions || versions.length === 0) return [];

  const versionIds = versions.map((v) => v.id);
  const { data: enablements } = await supabase
    .from("bundle_enablement")
    .select("bundle_version_id")
    .eq("org_id", orgId)
    .in("bundle_version_id", versionIds);

  const enabledSet = new Set((enablements ?? []).map((e) => e.bundle_version_id));

  return versions.map((v) => ({
    versionId: v.id,
    hasEnablement: enabledSet.has(v.id),
  }));
}

export async function getEnablementStatusByOrgId(
  orgId: string
): Promise<{ bundleId: string; versionId: string; hasEnablement: boolean }[]> {
  const supabase = await createClient();

  // Filter versions at DB level via inner join on bundles.org_id
  const { data: versions } = await supabase
    .from("bundle_versions")
    .select("id, bundle_id, version_number, bundles!inner(org_id)")
    .eq("bundles.org_id", orgId)
    .order("version_number", { ascending: false });

  if (!versions || versions.length === 0) return [];

  const versionIds = versions.map((v) => v.id);
  const { data: enablements } = await supabase
    .from("bundle_enablement")
    .select("bundle_version_id")
    .eq("org_id", orgId)
    .in("bundle_version_id", versionIds);

  const enabledSet = new Set((enablements ?? []).map((e) => e.bundle_version_id));

  return versions.map((v) => ({
    bundleId: v.bundle_id,
    versionId: v.id,
    hasEnablement: enabledSet.has(v.id),
  }));
}

export async function hasEnablement(orgId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bundle_enablement")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();

  return data !== null;
}

// ── Playbook helpers ─────────────────────────────────────────────────────────

/**
 * Upsert playbook JSON content for a bundle.
 * Uses the latest bundle_version_id for the given bundle.
 */
export async function upsertPlaybookContent(
  orgId: string,
  userId: string,
  bundleVersionId: string,
  playbookContent: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bundle_enablement")
    .upsert(
      {
        org_id: orgId,
        bundle_version_id: bundleVersionId,
        playbook_content: playbookContent,
        playbook_generated_at: new Date().toISOString(),
        created_by: userId,
      },
      { onConflict: "bundle_version_id" }
    )
    .select()
    .single();

  if (error) throw error;
}

/**
 * Get cached playbook content for a bundle by looking up the latest version.
 */
export async function getPlaybookByBundleId(
  orgId: string,
  bundleId: string
): Promise<{
  playbook_content: Record<string, unknown> | null;
  playbook_generated_at: string | null;
} | null> {
  const supabase = await createClient();

  // Get latest version for this bundle
  const { data: versions } = await supabase
    .from("bundle_versions")
    .select("id")
    .eq("bundle_id", bundleId)
    .order("version_number", { ascending: false })
    .limit(1);

  if (!versions || versions.length === 0) return null;

  const { data, error } = await supabase
    .from("bundle_enablement")
    .select("playbook_content, playbook_generated_at")
    .eq("org_id", orgId)
    .eq("bundle_version_id", versions[0].id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    playbook_content: data.playbook_content as Record<string, unknown> | null,
    playbook_generated_at: data.playbook_generated_at as string | null,
  };
}

/**
 * Get playbook status (has content or not) for multiple bundle IDs.
 */
export async function getPlaybookStatusByBundleIds(
  orgId: string,
  bundleIds: string[]
): Promise<Record<string, boolean>> {
  if (bundleIds.length === 0) return {};

  const supabase = await createClient();

  // Get latest version for each bundle
  const { data: versions } = await supabase
    .from("bundle_versions")
    .select("id, bundle_id")
    .in("bundle_id", bundleIds)
    .order("version_number", { ascending: false });

  if (!versions || versions.length === 0) {
    return Object.fromEntries(bundleIds.map((id) => [id, false]));
  }

  // Deduplicate — only keep latest version per bundle
  const latestByBundle = new Map<string, string>();
  for (const v of versions) {
    if (!latestByBundle.has(v.bundle_id)) {
      latestByBundle.set(v.bundle_id, v.id);
    }
  }

  const versionIds = [...latestByBundle.values()];

  const { data: enablements } = await supabase
    .from("bundle_enablement")
    .select("bundle_version_id, playbook_content")
    .eq("org_id", orgId)
    .in("bundle_version_id", versionIds);

  const hasPlaybook = new Set<string>();
  if (enablements) {
    for (const e of enablements) {
      if (e.playbook_content) {
        hasPlaybook.add(e.bundle_version_id);
      }
    }
  }

  const result: Record<string, boolean> = {};
  for (const bundleId of bundleIds) {
    const versionId = latestByBundle.get(bundleId);
    result[bundleId] = versionId ? hasPlaybook.has(versionId) : false;
  }

  return result;
}

export async function upsertEnablement(
  orgId: string,
  userId: string,
  versionId: string,
  data: Partial<EnablementContent>
): Promise<BundleEnablement> {
  const supabase = await createClient();

  // Determine if all five sections are provided
  const allPresent = ENABLEMENT_KEYS.every(
    (k) => typeof data[k] === "string" && data[k]!.length > 0
  );

  const { data: result, error } = await supabase
    .from("bundle_enablement")
    .upsert(
      {
        org_id: orgId,
        bundle_version_id: versionId,
        ...data,
        ...(allPresent ? { generated_at: new Date().toISOString() } : {}),
        created_by: userId,
      },
      { onConflict: "bundle_version_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return result as BundleEnablement;
}
