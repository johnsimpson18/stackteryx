import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { getBundles } from "@/lib/db/bundles";
import { getAllServiceCompleteness } from "@/lib/db/service-completeness";
import { getServiceOutcomesByOrgId } from "@/lib/db/service-outcomes";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGate } from "@/components/shared/role-gate";
import { ServicesList } from "@/components/services/services-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();

  const [bundles, completeness, outcomes] = await Promise.all([
    getBundles(orgId ?? undefined),
    orgId ? getAllServiceCompleteness(orgId) : [],
    orgId ? getServiceOutcomesByOrgId(orgId) : [],
  ]);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Build and manage your security service portfolio"
      >
        <RoleGate role={profile.role} permission="create_bundles">
          <Button asChild>
            <Link href="/services/new">
              <Plus className="h-4 w-4 mr-2" />
              Build a Service
            </Link>
          </Button>
        </RoleGate>
      </PageHeader>

      <ServicesList
        bundles={sorted}
        completenessMap={completenessMap}
        outcomeTypeMap={outcomeTypeMap}
      />
    </div>
  );
}
