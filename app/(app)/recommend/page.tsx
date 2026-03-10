import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sales Studio" };
import { getCurrentProfile } from "@/lib/db/profiles";
import { getTools } from "@/lib/db/tools";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getActiveOrgId } from "@/lib/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { RecommendClient } from "@/components/recommend/recommend-client";

export default async function RecommendPage() {
  const orgId = await getActiveOrgId();
  const [profile, tools, settings] = await Promise.all([
    getCurrentProfile(),
    getTools(orgId ?? undefined, { is_active: true }),
    orgId ? getOrgSettings(orgId) : Promise.resolve(null),
  ]);

  if (!profile) redirect("/login");
  if (!settings) redirect("/settings");

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Sales Studio"
        description="Describe a client and Claude will analyze your stack catalog to suggest 3 optimised security services with live pricing."
      />
      <RecommendClient
        tools={tools}
        settings={settings}
        userRole={profile.role}
        hasApiKey={hasApiKey}
      />
    </div>
  );
}
