import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Vendors" };
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgVendors } from "@/lib/db/vendors";
import { getActiveOrgId } from "@/lib/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { VendorList } from "@/components/vendors/vendor-list";
import { VendorPageActions } from "@/components/vendors/vendor-page-actions";
import { RoleGate } from "@/components/shared/role-gate";

export default async function VendorsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/login");

  const vendors = await getOrgVendors(orgId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Costs"
        description="Manage your vendor relationships and cost models"
      >
        <RoleGate role={profile.role} permission="create_tools">
          <VendorPageActions vendors={vendors} />
        </RoleGate>
      </PageHeader>

      <VendorList vendors={vendors} />
    </div>
  );
}
