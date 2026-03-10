import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Settings" };
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getActiveOrgId } from "@/lib/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/login");

  const settings = await getOrgSettings(orgId);
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

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Workspace Settings"
        description="Configure default pricing parameters for your MSP"
      />
      <SettingsForm settings={settings} userRole={profile.role} />
    </div>
  );
}
