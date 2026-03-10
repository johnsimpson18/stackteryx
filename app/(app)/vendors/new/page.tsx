import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getGlobalVendors } from "@/lib/db/vendors";
import { hasPermission } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { OrgVendorForm } from "@/components/vendors/org-vendor-form";

export default async function NewVendorPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "create_tools")) redirect("/vendors");

  const globalVendors = await getGlobalVendors();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Add Vendor"
        description="Add a vendor to track costs and pricing for your org"
      />
      <OrgVendorForm globalVendors={globalVendors} />
    </div>
  );
}
