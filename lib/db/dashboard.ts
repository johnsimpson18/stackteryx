import { createClient } from "@/lib/supabase/server";
import type { BundleWithMeta } from "@/lib/types";

export interface PricingHealthSummary {
  marginBuckets: {
    healthy: number;
    watch: number;
    atRisk: number;
    critical: number;
  };
  staleCount: number;
  topRisks: Array<{
    bundleId: string;
    bundleName: string;
    currentMargin: number;
    previousMargin: number | null;
  }>;
}

/**
 * Accepts pre-fetched bundles + stale count to avoid duplicate queries.
 * Fixes N+1 by batching the version lookups into one query.
 */
export async function getPricingHealthSummary(
  bundles: BundleWithMeta[],
  staleCount: number,
): Promise<PricingHealthSummary> {
  const buckets = { healthy: 0, watch: 0, atRisk: 0, critical: 0 };

  const activeBundles = bundles.filter(
    (b) => b.status === "active" && b.latest_margin != null,
  );

  for (const b of activeBundles) {
    const m = b.latest_margin!;
    if (m >= 0.4) buckets.healthy++;
    else if (m >= 0.25) buckets.watch++;
    else if (m >= 0.1) buckets.atRisk++;
    else buckets.critical++;
  }

  // Top risks: 3 lowest-margin active bundles
  const sorted = [...activeBundles].sort(
    (a, b) => (a.latest_margin ?? 0) - (b.latest_margin ?? 0),
  );
  const top3 = sorted.slice(0, 3);

  // Batch fetch: get top 2 versions per bundle in one query (fixes N+1)
  const topRisks: PricingHealthSummary["topRisks"] = [];

  if (top3.length > 0) {
    const supabase = await createClient();
    const bundleIds = top3.map((b) => b.id);

    const { data: allVersions } = await supabase
      .from("bundle_versions")
      .select("bundle_id, version_number, computed_margin_post_discount")
      .in("bundle_id", bundleIds)
      .order("version_number", { ascending: false });

    // Group by bundle_id, take first 2 per bundle
    const versionsByBundle = new Map<string, { margin: number | null }[]>();
    if (allVersions) {
      for (const v of allVersions) {
        const list = versionsByBundle.get(v.bundle_id) ?? [];
        if (list.length < 2) {
          list.push({
            margin: v.computed_margin_post_discount
              ? Number(v.computed_margin_post_discount)
              : null,
          });
          versionsByBundle.set(v.bundle_id, list);
        }
      }
    }

    for (const b of top3) {
      const versions = versionsByBundle.get(b.id) ?? [];
      topRisks.push({
        bundleId: b.id,
        bundleName: b.name,
        currentMargin: b.latest_margin!,
        previousMargin: versions.length >= 2 ? versions[1].margin : null,
      });
    }
  }

  return {
    marginBuckets: buckets,
    staleCount,
    topRisks,
  };
}
