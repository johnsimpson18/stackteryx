import { getBundles } from "@/lib/db/bundles";
import { getStaleVersionsByOrgId } from "@/lib/db/bundle-versions";
import { createClient } from "@/lib/supabase/server";

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

export async function getPricingHealthSummary(
  orgId: string,
): Promise<PricingHealthSummary> {
  const [bundles, staleVersions] = await Promise.all([
    getBundles(orgId),
    getStaleVersionsByOrgId(orgId),
  ]);

  // Bucket thresholds matching MarginHealthBadge
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

  // For each top risk, find margin delta from previous version
  const supabase = await createClient();
  const topRisks: PricingHealthSummary["topRisks"] = [];

  for (const b of top3) {
    let previousMargin: number | null = null;

    const { data: versions } = await supabase
      .from("bundle_versions")
      .select("computed_margin_post_discount")
      .eq("bundle_id", b.id)
      .order("version_number", { ascending: false })
      .limit(2);

    if (versions && versions.length >= 2) {
      previousMargin = versions[1].computed_margin_post_discount
        ? Number(versions[1].computed_margin_post_discount)
        : null;
    }

    topRisks.push({
      bundleId: b.id,
      bundleName: b.name,
      currentMargin: b.latest_margin!,
      previousMargin,
    });
  }

  return {
    marginBuckets: buckets,
    staleCount: staleVersions.length,
    topRisks,
  };
}
