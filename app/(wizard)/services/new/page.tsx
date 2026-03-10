import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Build a Service" };
import { getCurrentProfile } from "@/lib/db/profiles";
import { getTools } from "@/lib/db/tools";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getActiveOrgId } from "@/lib/org-context";
import { getBundleById, getInProgressBundle } from "@/lib/db/bundles";
import { getServiceOutcome } from "@/lib/db/service-outcomes";
import { getVersionsByBundleId, getVersionById } from "@/lib/db/bundle-versions";
import { getEnablementByVersionId } from "@/lib/db/enablement";
import { ServiceWizardShell } from "@/components/service-wizard/wizard-shell";
import type { BundleType } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ resume?: string }>;
}

export default async function NewServiceWizardPage({ searchParams }: PageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/dashboard");

  const [tools, settings] = await Promise.all([
    getTools(orgId, { is_active: true }),
    getOrgSettings(orgId),
  ]);

  const params = await searchParams;

  // Resume support: load existing bundle data
  let initialData: React.ComponentProps<typeof ServiceWizardShell>["initialData"];

  const resumeId = params.resume;
  if (resumeId) {
    const bundle = await getBundleById(resumeId);
    if (bundle && bundle.org_id === orgId) {
      const [outcome, versions] = await Promise.all([
        getServiceOutcome(bundle.id),
        getVersionsByBundleId(bundle.id),
      ]);

      const latestVersion = versions[0] ?? null;
      let versionToolIds: string[] = [];
      let enablement = null;

      if (latestVersion) {
        const versionWithTools = await getVersionById(latestVersion.id);
        versionToolIds = versionWithTools?.tools.map((t) => t.tool_id) ?? [];
        enablement = await getEnablementByVersionId(orgId, latestVersion.id);
      }

      initialData = {
        bundleId: bundle.id,
        step: bundle.wizard_step_completed + 1,
        outcome,
        version: latestVersion,
        versionToolIds,
        enablement,
        bundleType: bundle.bundle_type as BundleType,
      };
    }
  } else {
    // Check for any in-progress bundle to auto-resume
    const inProgress = await getInProgressBundle(orgId);
    if (inProgress) {
      redirect(`/services/new?resume=${inProgress.id}`);
    }
  }

  return (
    <ServiceWizardShell
      tools={tools}
      defaults={{
        target_margin_pct: settings?.default_target_margin_pct ?? 0.35,
        overhead_pct: settings?.default_overhead_pct ?? 0.1,
        labor_pct: settings?.default_labor_pct ?? 0.15,
      }}
      initialData={initialData}
    />
  );
}
