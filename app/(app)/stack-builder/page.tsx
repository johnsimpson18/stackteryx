import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { getTools } from "@/lib/db/tools";
import { getBundles } from "@/lib/db/bundles";
import { PageHeader } from "@/components/shared/page-header";
import { StackBuilderClient } from "@/components/stack-builder/stack-builder-client";

export const metadata: Metadata = { title: "Stack Builder" };

export default async function StackBuilderPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/dashboard");

  const [tools, bundles] = await Promise.all([
    getTools(orgId, { is_active: true }),
    getBundles(orgId),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stack Builder"
        description="Drag tools to build a service stack with live intelligence"
      />
      <StackBuilderClient
        tools={tools}
        defaultSeatCount={50}
        existingServicesCount={bundles.filter((b) => b.status === "active").length}
      />
    </div>
  );
}
