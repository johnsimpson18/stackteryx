import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Tools & Costs" };
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import {
  getToolsWithServiceAssignments,
  calculateCoverage,
  calculateCoverageScore,
  detectRedundancies,
  getGapDetails,
} from "@/lib/db/stack-catalog";
import { getBundles } from "@/lib/db/bundles";
import { getAllServiceCompleteness } from "@/lib/db/service-completeness";
import { getStaleVersionsByOrgId } from "@/lib/db/bundle-versions";
import { getOrgSettings } from "@/lib/db/org-settings";
import { computePricingStatus } from "@/lib/pricing/status";
import { getOrgVendors } from "@/lib/db/vendors";
import { getGlobalToolLibrary } from "@/actions/global-tool-library";
import { StackCatalogTabs } from "@/components/stack-catalog/stack-catalog-tabs";
import type { PricingStatus } from "@/lib/pricing/status";

export default async function StackCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/dashboard");

  const params = await searchParams;

  // Fetch all data in parallel
  const [tools, bundles, completeness, staleVersions, settings, vendors, globalTools] =
    await Promise.all([
      getToolsWithServiceAssignments(orgId),
      getBundles(orgId),
      getAllServiceCompleteness(orgId),
      getStaleVersionsByOrgId(orgId),
      getOrgSettings(orgId),
      getOrgVendors(orgId),
      getGlobalToolLibrary(),
    ]);

  // Stack catalog derivations
  const coverage = calculateCoverage(tools);
  const coverageScore = calculateCoverageScore(coverage);
  const redundancies = detectRedundancies(tools);
  const gaps = getGapDetails(coverage);

  // Pricing health derivations
  const completenessMap = Object.fromEntries(
    completeness.map((c) => [c.bundle_id, c])
  );
  const staleMap: Record<string, boolean> = {};
  for (const sv of staleVersions) {
    staleMap[sv.bundle_id] = true;
  }
  const pricingStatusMap: Record<string, PricingStatus> = {};
  for (const bundle of bundles) {
    const isStale = staleMap[bundle.id] ?? false;
    const latestVersion =
      bundle.latest_mrr != null
        ? { computed_suggested_price: bundle.latest_mrr, is_pricing_stale: isStale }
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
    <StackCatalogTabs
      tools={tools}
      coverage={coverage}
      coverageScore={coverageScore}
      redundancies={redundancies}
      gaps={gaps}
      userRole={profile.role}
      bundles={bundles}
      completenessMap={completenessMap}
      staleMap={staleMap}
      pricingStatusMap={pricingStatusMap}
      defaultTargetMargin={defaultTargetMargin}
      staleCount={staleVersions.length}
      vendors={vendors}
      globalTools={globalTools}
      initialTab={params.tab ?? "catalog"}
    />
  );
}
