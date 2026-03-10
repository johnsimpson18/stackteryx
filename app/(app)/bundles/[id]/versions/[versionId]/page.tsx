import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getBundleById } from "@/lib/db/bundles";
import { getVersionById } from "@/lib/db/bundle-versions";
import { getEnablementByVersionId } from "@/lib/db/enablement";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGate } from "@/components/shared/role-gate";
import { VersionTabs } from "@/components/bundles/version-tabs";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";

interface VersionDetailPageProps {
  params: Promise<{ id: string; versionId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function VersionDetailPage({
  params,
  searchParams,
}: VersionDetailPageProps) {
  const { id, versionId } = await params;
  const { tab } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/login");

  const bundle = await getBundleById(id);
  if (!bundle) notFound();

  const version = await getVersionById(versionId);
  if (!version) notFound();

  const enablement = await getEnablementByVersionId(orgId, versionId);

  const enablementContent = enablement
    ? {
        service_overview: enablement.service_overview,
        whats_included: enablement.whats_included,
        talking_points: enablement.talking_points,
        pricing_narrative: enablement.pricing_narrative,
        why_us: enablement.why_us,
      }
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${bundle.name} — Version ${version.version_number}`}
        description={`Created on ${new Date(version.created_at).toLocaleDateString()}`}
      >
        <div className="flex items-center gap-2">
          {!enablementContent && tab !== "enablement" && (
            <Button asChild>
              <Link href={`/services/${id}/versions/${versionId}?tab=enablement`}>
                Generate Sales Package
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
          <RoleGate role={profile.role} permission="create_versions">
            <Button variant={!enablementContent && tab !== "enablement" ? "outline" : "default"} asChild>
              <Link href={`/services/${id}/versions/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Configuration
              </Link>
            </Button>
          </RoleGate>
        </div>
      </PageHeader>

      {!enablementContent && tab !== "enablement" && (
        <p className="text-sm text-muted-foreground -mt-4">
          Your service is priced. Generate sales content your team can use.
        </p>
      )}

      <VersionTabs
        version={version}
        bundleName={bundle.name}
        bundleVersionId={versionId}
        enablementContent={enablementContent}
        enablementGeneratedAt={enablement?.generated_at ?? null}
        defaultTab={tab === "enablement" || tab === "pricing" ? tab : "overview"}
      />
    </div>
  );
}
