import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sales Studio" };
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { getClients } from "@/lib/db/clients";
import { getBundles } from "@/lib/db/bundles";
import { getProposals } from "@/lib/db/proposals";
import { getContractsByClientId } from "@/lib/db/client-contracts";
import { getVersionsByBundleId } from "@/lib/db/bundle-versions";
import { getOrgById } from "@/lib/db/orgs";
import { getOnboardingProfile } from "@/lib/db/org-settings";
import { getPlaybookStatusByBundleIds } from "@/lib/db/enablement";
import { getServiceOutcomesByOrgId } from "@/lib/db/service-outcomes";
import { getTierPackages } from "@/lib/db/tier-packages";
import { SalesStudioClient } from "@/components/sales-studio/sales-studio-client";

interface SalesStudioPageProps {
  searchParams: Promise<{ mode?: string; client?: string }>;
}

export default async function SalesStudioPage({
  searchParams,
}: SalesStudioPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/dashboard");

  const params = await searchParams;

  const [clients, bundles, proposals, org, onboarding, tierPackages] = await Promise.all([
    getClients(orgId),
    getBundles(orgId),
    getProposals(orgId),
    getOrgById(orgId),
    getOnboardingProfile(orgId),
    getTierPackages(orgId),
  ]);

  // For each active bundle, get the latest version for pricing info
  const activeBundles = bundles.filter((b) => b.status === "active");
  const bundleVersions: Record<
    string,
    { id: string; suggested_price: number | null; seat_count: number }
  > = {};

  if (activeBundles.length > 0) {
    const versionResults = await Promise.allSettled(
      activeBundles.map((b) => getVersionsByBundleId(b.id))
    );
    for (let i = 0; i < activeBundles.length; i++) {
      const result = versionResults[i];
      if (result.status === "fulfilled" && result.value.length > 0) {
        const latest = result.value[0];
        bundleVersions[activeBundles[i].id] = {
          id: latest.id,
          suggested_price: latest.computed_suggested_price
            ? Number(latest.computed_suggested_price)
            : null,
          seat_count: latest.seat_count,
        };
      }
    }
  }

  // Fetch playbook status for all active bundles
  const playbookStatus: Record<string, boolean> =
    activeBundles.length > 0
      ? await getPlaybookStatusByBundleIds(
          orgId,
          activeBundles.map((b) => b.id)
        )
      : {};

  // Fetch outcome existence for each active bundle
  const bundleOutcomes: Record<string, boolean> = {};
  if (activeBundles.length > 0) {
    const outcomes = await getServiceOutcomesByOrgId(orgId);
    for (const o of outcomes) {
      bundleOutcomes[o.bundle_id] = true;
    }
  }

  // If client is pre-selected, fetch their contracts
  let preSelectedClientContracts: {
    bundle_id: string;
    bundle_version_id: string;
    bundle_name: string;
  }[] = [];

  if (params.client) {
    try {
      const contracts = await getContractsByClientId(params.client);
      preSelectedClientContracts = contracts
        .filter((c) => c.status === "active")
        .map((c) => ({
          bundle_id: c.bundle_id,
          bundle_version_id: c.bundle_version_id,
          bundle_name: c.bundle_name,
        }));
    } catch {
      // Client not found — ignore
    }
  }

  return (
    <SalesStudioClient
      clients={clients}
      activeBundles={activeBundles.map((b) => ({
        id: b.id,
        name: b.name,
        bundle_type: b.bundle_type,
      }))}
      bundleVersions={bundleVersions}
      proposals={proposals}
      initialMode={params.mode === "prospect" ? "prospect" : "client"}
      preSelectedClientId={params.client ?? null}
      preSelectedClientContracts={preSelectedClientContracts}
      orgName={org?.name ?? ""}
      orgTargetVerticals={onboarding?.target_verticals ?? []}
      playbookStatus={playbookStatus}
      bundleOutcomes={bundleOutcomes}
      publishedPackages={tierPackages
        .filter((p) => p.status === "published")
        .map((p) => ({ id: p.id, name: p.name, item_count: p.item_count }))}
    />
  );
}
