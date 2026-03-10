import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { getBundleById } from "@/lib/db/bundles";

export async function generateMetadata({ params }: ServiceProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getBundleById(id);
  return { title: bundle?.name ?? "Service Profile" };
}
import { getServiceOutcome } from "@/lib/db/service-outcomes";
import { getServiceCompleteness } from "@/lib/db/service-completeness";
import { getVersionsByBundleId } from "@/lib/db/bundle-versions";
import { getEnablementStatusByBundleId, getEnablementByVersionId } from "@/lib/db/enablement";
import { getActiveActionCards } from "@/lib/db/action-cards";
import { getClients } from "@/lib/db/clients";
import { getOrgSettings } from "@/lib/db/org-settings";
import { ServiceProfileClient } from "@/components/services/service-profile-client";
import type { BundleEnablement } from "@/lib/types";

interface ServiceProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceProfilePage({ params }: ServiceProfilePageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/dashboard");

  const bundle = await getBundleById(id);
  if (!bundle || bundle.org_id !== orgId) notFound();

  // Fetch all data in parallel
  const [outcome, completeness, versions, enablementStatuses, actionCards, clients, settings] =
    await Promise.all([
      getServiceOutcome(id),
      getServiceCompleteness(id),
      getVersionsByBundleId(id),
      getEnablementStatusByBundleId(orgId, id),
      getActiveActionCards(orgId, id),
      getClients(orgId),
      getOrgSettings(orgId),
    ]);

  // Get enablement content for the latest version
  const latestVersion = versions[0] ?? null;
  let enablement: BundleEnablement | null = null;
  if (latestVersion) {
    enablement = await getEnablementByVersionId(orgId, latestVersion.id);
  }

  const enablementMap = new Map(
    enablementStatuses.map((s) => [s.versionId, s.hasEnablement])
  );

  return (
    <ServiceProfileClient
      bundle={bundle}
      outcome={outcome}
      completeness={completeness}
      versions={versions}
      enablementMap={Object.fromEntries(enablementMap)}
      enablement={enablement}
      actionCards={actionCards}
      clients={clients}
      redZoneMarginPct={settings ? Number(settings.red_zone_margin_pct) : 0.15}
      latestVersionId={latestVersion?.id ?? null}
    />
  );
}
