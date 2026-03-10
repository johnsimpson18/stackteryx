import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getTools } from "@/lib/db/tools";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getActiveOrgId } from "@/lib/org-context";
import { hasPermission } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { VendorUploadForm } from "@/components/tools/vendor-upload-form";

export default async function VendorUploadPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "create_tools")) redirect("/stack-catalog");

  const orgId = await getActiveOrgId();
  const [tools, settings] = await Promise.all([
    getTools(orgId ?? undefined, { is_active: true }),
    orgId ? getOrgSettings(orgId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Vendor Pricing"
        description="Drop a vendor quote, rate card, or price sheet — Claude will extract the pricing and show you exactly how it fits your stack and what margin you'd make."
      />
      <VendorUploadForm existingTools={tools} settings={settings} />
    </div>
  );
}
