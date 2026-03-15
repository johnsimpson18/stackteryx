import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { getBundles } from "@/lib/db/bundles";
import { getAllServiceCompleteness } from "@/lib/db/service-completeness";
import { getServiceOutcomesByOrgId } from "@/lib/db/service-outcomes";
import { getStaleVersionsByOrgId } from "@/lib/db/bundle-versions";
import { computePricingStatus } from "@/lib/pricing/status";
import { getTierPackages } from "@/lib/db/tier-packages";
import { getAdditionalServicesByOrgId, getAdditionalServiceUsages } from "@/lib/db/additional-services";
import { ServicesTabs } from "@/components/services/services-tabs";
import type { PricingStatus } from "@/lib/pricing/status";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; tab?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  const params = await searchParams;

  const [bundles, completeness, outcomes, staleVersions, packages, additionalServices, addSvcUsages] =
    await Promise.all([
      getBundles(orgId ?? undefined),
      orgId ? getAllServiceCompleteness(orgId) : [],
      orgId ? getServiceOutcomesByOrgId(orgId) : [],
      orgId ? getStaleVersionsByOrgId(orgId) : [],
      orgId ? getTierPackages(orgId) : [],
      orgId ? getAdditionalServicesByOrgId(orgId) : [],
      orgId ? getAdditionalServiceUsages(orgId) : [],
    ]);

  // Build usage map for additional services
  const additionalServiceUsageMap: Record<string, { bundle_id: string; bundle_name: string }[]> = {};
  for (const u of addSvcUsages) {
    if (!additionalServiceUsageMap[u.additional_service_id]) additionalServiceUsageMap[u.additional_service_id] = [];
    additionalServiceUsageMap[u.additional_service_id].push({ bundle_id: u.bundle_id, bundle_name: u.bundle_name });
  }

  // Sort newest first
  const sorted = [...bundles].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Build lookup maps
  const completenessMap = Object.fromEntries(
    completeness.map((c) => [c.bundle_id, c])
  );
  const outcomeTypeMap = Object.fromEntries(
    outcomes.map((o) => [o.bundle_id, o.outcome_type])
  );

  // Build stale map: bundleId → true if any version is stale
  const staleMap: Record<string, boolean> = {};
  for (const sv of staleVersions) {
    staleMap[sv.bundle_id] = true;
  }

  // Build pricing status map from latest version data in BundleWithMeta
  const pricingStatusMap: Record<string, PricingStatus> = {};
  for (const bundle of sorted) {
    const isStale = staleMap[bundle.id] ?? false;
    const hasZeroCost = false;
    const latestVersion = bundle.latest_mrr != null ? {
      computed_suggested_price: bundle.latest_mrr,
      is_pricing_stale: isStale,
    } : null;
    pricingStatusMap[bundle.id] = computePricingStatus(
      latestVersion as Parameters<typeof computePricingStatus>[0],
      hasZeroCost
    );
  }

  return (
    <ServicesTabs
      bundles={sorted}
      completenessMap={completenessMap}
      outcomeTypeMap={outcomeTypeMap}
      staleMap={staleMap}
      pricingStatusMap={pricingStatusMap}
      initialFilter={params.filter as "all" | "active" | "draft" | "stale" | undefined}
      packages={packages}
      additionalServices={additionalServices}
      additionalServiceUsageMap={additionalServiceUsageMap}
      userRole={profile.role}
      initialTab={params.tab ?? "services"}
    />
  );
}
