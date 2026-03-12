import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { getBundles } from "@/lib/db/bundles";
import { getAllServiceCompleteness } from "@/lib/db/service-completeness";
import { getStaleVersionsByOrgId } from "@/lib/db/bundle-versions";
import { getOrgSettings } from "@/lib/db/org-settings";
import { computePricingStatus } from "@/lib/pricing/status";
import { PageHeader } from "@/components/shared/page-header";
import { PricingHealthClient } from "@/components/pricing/pricing-health-client";
import type { PricingStatus } from "@/lib/pricing/status";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();

  const [bundles, completeness, staleVersions, settings] = await Promise.all([
    getBundles(orgId ?? undefined),
    orgId ? getAllServiceCompleteness(orgId) : [],
    orgId ? getStaleVersionsByOrgId(orgId) : [],
    orgId ? getOrgSettings(orgId) : null,
  ]);

  // Build lookup maps
  const completenessMap = Object.fromEntries(
    completeness.map((c) => [c.bundle_id, c])
  );

  const staleMap: Record<string, boolean> = {};
  for (const sv of staleVersions) {
    staleMap[sv.bundle_id] = true;
  }

  // Build pricing status map
  const pricingStatusMap: Record<string, PricingStatus> = {};
  for (const bundle of bundles) {
    const isStale = staleMap[bundle.id] ?? false;
    const latestVersion =
      bundle.latest_mrr != null
        ? {
            computed_suggested_price: bundle.latest_mrr,
            is_pricing_stale: isStale,
          }
        : null;
    pricingStatusMap[bundle.id] = computePricingStatus(
      latestVersion as Parameters<typeof computePricingStatus>[0],
      false
    );
  }

  const defaultTargetMargin = settings
    ? Number(settings.default_target_margin_pct)
    : 0.35;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing"
        description="Monitor pricing health across your service portfolio"
      />

      <PricingHealthClient
        bundles={bundles}
        completenessMap={completenessMap}
        staleMap={staleMap}
        pricingStatusMap={pricingStatusMap}
        defaultTargetMargin={defaultTargetMargin}
        staleCount={staleVersions.length}
      />
    </div>
  );
}
