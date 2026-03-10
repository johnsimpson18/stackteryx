import { notFound, redirect } from "next/navigation";
import { getBundleById } from "@/lib/db/bundles";
import { getTools } from "@/lib/db/tools";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getScenariosByBundleId } from "@/lib/db/scenarios";
import { getActiveOrgId } from "@/lib/org-context";
import { hasPermission } from "@/lib/constants";
import { VersionBuilder } from "@/components/bundles/version-builder";

interface NewVersionPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewVersionPage({
  params,
}: NewVersionPageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "create_versions")) redirect(`/services/${id}`);

  const bundle = await getBundleById(id);
  if (!bundle) notFound();

  const orgId = await getActiveOrgId();
  const settings = orgId ? await getOrgSettings(orgId) : null;
  if (!settings) redirect("/settings");

  const [tools, scenarios] = await Promise.all([
    getTools(orgId ?? undefined, { is_active: true }),
    getScenariosByBundleId(id),
  ]);

  return (
    <VersionBuilder
      bundleId={id}
      bundleName={bundle.name}
      tools={tools}
      settings={settings}
      savedScenarios={scenarios}
    />
  );
}
