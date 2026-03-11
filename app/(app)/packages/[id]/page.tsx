import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { getTierPackageWithItems } from "@/lib/db/tier-packages";
import { getBundles } from "@/lib/db/bundles";
import { getVersionsByBundleId, getVersionById } from "@/lib/db/bundle-versions";
import { getServiceOutcome } from "@/lib/db/service-outcomes";
import { PackageDetail } from "@/components/packages/package-detail";
import type { BundleVersionWithTools, ServiceOutcome } from "@/lib/types";

export const metadata: Metadata = { title: "Package Detail" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PackageDetailPage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/dashboard");

  const pkg = await getTierPackageWithItems(orgId, id);
  if (!pkg) notFound();

  // Fetch all active bundles for the edit modal
  const allBundles = await getBundles(orgId);
  const activeBundles = allBundles
    .filter((b) => b.status === "active")
    .map((b) => ({
      id: b.id,
      name: b.name,
      bundle_type: b.bundle_type,
      latest_mrr: b.latest_mrr,
    }));

  // Fetch version data + outcomes for each bundle in the package for comparison
  const bundleDetails: Record<
    string,
    {
      version: BundleVersionWithTools | null;
      outcome: ServiceOutcome | null;
    }
  > = {};

  await Promise.all(
    pkg.items.map(async (item) => {
      const [versions, outcome] = await Promise.all([
        getVersionsByBundleId(item.bundle_id),
        getServiceOutcome(item.bundle_id),
      ]);
      const latestVersionId = versions[0]?.id;
      const version = latestVersionId
        ? await getVersionById(latestVersionId)
        : null;
      bundleDetails[item.bundle_id] = { version, outcome };
    })
  );

  return (
    <PackageDetail
      pkg={pkg}
      bundleDetails={bundleDetails}
      activeBundles={activeBundles}
      userRole={profile.role}
    />
  );
}
