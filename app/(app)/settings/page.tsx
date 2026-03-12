import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Settings" };
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getActiveOrgId } from "@/lib/org-context";
import { getOrgVendorDiscounts } from "@/lib/db/vendors";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "./settings-form";
import { VendorDiscountsSection } from "@/components/settings/vendor-discounts-section";

export default async function SettingsPage() {
  const [profile, orgId] = await Promise.all([
    getCurrentProfile(),
    getActiveOrgId(),
  ]);
  if (!profile) redirect("/login");
  if (!orgId) redirect("/login");

  const [settings, vendorDiscountData] = await Promise.all([
    getOrgSettings(orgId),
    getOrgVendorDiscounts(orgId),
  ]);

  if (!settings) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <p className="text-muted-foreground">
          No workspace settings found. Please contact support.
        </p>
      </div>
    );
  }

  const canEdit = ["owner", "finance"].includes(profile.role);

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Workspace Settings"
        description="Configure default pricing parameters for your MSP"
      />
      <SettingsForm settings={settings} userRole={profile.role} />
      <VendorDiscountsSection
        vendors={vendorDiscountData.map((v) => ({
          id: v.org_vendor_id,
          displayName: v.org_vendor_display_name,
          discount: v.discount,
        }))}
        canEdit={canEdit}
      />
    </div>
  );
}
