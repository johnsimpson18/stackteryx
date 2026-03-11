import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { getTierPackages } from "@/lib/db/tier-packages";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGate } from "@/components/shared/role-gate";
import { PackagesList } from "@/components/packages/packages-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Packages" };

export default async function PackagesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  const packages = orgId ? await getTierPackages(orgId) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packages"
        description="Build tiered service packages for good-better-best pricing"
      >
        <RoleGate role={profile.role} permission="create_bundles">
          <Button asChild>
            <Link href="/packages/new">
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Link>
          </Button>
        </RoleGate>
      </PageHeader>

      <PackagesList packages={packages} />
    </div>
  );
}
