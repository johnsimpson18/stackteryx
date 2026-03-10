import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgVendorById, getGlobalVendors } from "@/lib/db/vendors";
import { getActiveOrgId } from "@/lib/org-context";
import { hasPermission } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { OrgVendorForm } from "@/components/vendors/org-vendor-form";

interface EditVendorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVendorPage({
  params,
}: EditVendorPageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "edit_tools")) redirect(`/vendors/${id}`);

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/login");

  const vendor = await getOrgVendorById(orgId, id);
  if (!vendor) notFound();

  const globalVendors = await getGlobalVendors();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={`Edit ${vendor.display_name}`}
        description="Update vendor details"
      />
      <OrgVendorForm vendor={vendor} globalVendors={globalVendors} />
    </div>
  );
}
