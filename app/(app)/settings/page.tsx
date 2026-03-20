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
import { Suspense } from "react";
import { UpgradeSuccessHandler } from "@/components/billing/upgrade-success-handler";
import { BillingSection } from "@/components/settings/billing-section";
import { MFASection } from "@/components/settings/mfa-section";
import { TourSection } from "@/components/settings/tour-section";

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
      <Suspense>
        <UpgradeSuccessHandler />
      </Suspense>
      <PageHeader
        title="Workspace Settings"
        description="Configure default pricing parameters for your MSP"
      />
      <BillingSection />
      <MFASection />
      <SettingsForm settings={settings} userRole={profile.role} />
      <TourSection />
      <VendorDiscountsSection
        vendors={vendorDiscountData.map((v) => ({
          id: v.org_vendor_id,
          displayName: v.org_vendor_display_name,
          discount: v.discount,
        }))}
        canEdit={canEdit}
      />

      {/* Legal */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: 24,
          marginTop: 24,
        }}
      >
        <h3
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ marginBottom: 12 }}
        >
          Legal
        </h3>
        <div className="flex flex-col gap-2">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms of Service &rarr;
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy &rarr;
          </a>
          <a
            href="mailto:legal@stackteryx.com"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Legal Inquiries &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
