import type { Metadata } from "next";
import { getBundles } from "@/lib/db/bundles";

export const metadata: Metadata = { title: "Services" };
import { getEnablementStatusByOrgId } from "@/lib/db/enablement";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { BundleList } from "@/components/bundles/bundle-list";
import { RoleGate } from "@/components/shared/role-gate";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function BundlesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  const bundles = await getBundles(orgId ?? undefined);

  // Build a map: bundleId → { latestVersionId, needsEnablement }
  const enablementStatuses = orgId
    ? await getEnablementStatusByOrgId(orgId)
    : [];
  const enablementByBundle = new Map<
    string,
    { latestVersionId: string; needsEnablement: boolean }
  >();
  for (const s of enablementStatuses) {
    const existing = enablementByBundle.get(s.bundleId);
    if (!existing) {
      // First entry is the latest version (ordered desc by version_number)
      enablementByBundle.set(s.bundleId, {
        latestVersionId: s.versionId,
        needsEnablement: !s.hasEnablement,
      });
    }
  }
  const enablementMap = Object.fromEntries(enablementByBundle);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Build and price security service packages for your clients"
      >
        <RoleGate role={profile.role} permission="create_bundles">
          <Button asChild>
            <Link href="/services/new">
              <Plus className="h-4 w-4 mr-2" />
              New Service
            </Link>
          </Button>
        </RoleGate>
      </PageHeader>

      <BundleList bundles={bundles} userRole={profile.role} enablementMap={enablementMap} />
    </div>
  );
}
