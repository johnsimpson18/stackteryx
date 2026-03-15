import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { getAdditionalServicesByOrgId, getAdditionalServiceUsages } from "@/lib/db/additional-services";
import { AdditionalServicesClient } from "@/components/additional-services/additional-services-client";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Additional Services" };

export default async function AdditionalServicesPage() {
  const [profile, orgId] = await Promise.all([
    getCurrentProfile(),
    getActiveOrgId(),
  ]);
  if (!profile) redirect("/login");
  if (!orgId) redirect("/dashboard");

  const [services, usages] = await Promise.all([
    getAdditionalServicesByOrgId(orgId),
    getAdditionalServiceUsages(orgId),
  ]);

  // Group usages by additional_service_id
  const usageMap: Record<string, { bundle_id: string; bundle_name: string }[]> = {};
  for (const u of usages) {
    if (!usageMap[u.additional_service_id]) usageMap[u.additional_service_id] = [];
    usageMap[u.additional_service_id].push({ bundle_id: u.bundle_id, bundle_name: u.bundle_name });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Additional Services"
        description="Consulting, retainers, and advisory services that compose into your packages"
      />
      <AdditionalServicesClient services={services} usageMap={usageMap} />
    </div>
  );
}
