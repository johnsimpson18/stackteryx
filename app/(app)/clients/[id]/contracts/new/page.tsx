import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getClientById } from "@/lib/db/clients";
import { getBundles } from "@/lib/db/bundles";
import { getVersionsByBundleId } from "@/lib/db/bundle-versions";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getActiveOrgId } from "@/lib/org-context";
import { hasPermission } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { ContractForm } from "@/components/clients/contract-form";
import { createClient } from "@/lib/supabase/server";
import type { PricingToolInput, BundleVersion } from "@/lib/types";

interface NewContractPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewContractPage({ params }: NewContractPageProps) {
  const { id: clientId } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "create_clients")) redirect(`/clients/${clientId}`);

  const orgId = await getActiveOrgId();
  const [client, bundles, settings] = await Promise.all([
    getClientById(clientId),
    getBundles(orgId ?? undefined),
    orgId ? getOrgSettings(orgId) : Promise.resolve(null),
  ]);

  if (!client) notFound();

  // Build version options for active bundles (with tools for live pricing)
  const activeBundles = bundles.filter((b) => b.status === "active");

  const supabase = await createClient();
  const versionsByBundle: Record<
    string,
    { version: BundleVersion; tools: PricingToolInput[] }[]
  > = {};

  await Promise.all(
    activeBundles.map(async (bundle) => {
      const versions = await getVersionsByBundleId(bundle.id);
      if (versions.length === 0) return;

      // Fetch tools for each version
      const versionOptions = await Promise.all(
        versions.map(async (version) => {
          const { data: versionTools } = await supabase
            .from("bundle_version_tools")
            .select(`
              tool_id, quantity_multiplier,
              tools!inner(
                id, name, pricing_model, per_seat_cost, flat_monthly_cost,
                tier_rules, vendor_minimum_monthly, labor_cost_per_seat
              )
            `)
            .eq("bundle_version_id", version.id);

          const tools: PricingToolInput[] = (versionTools ?? []).map((vt) => ({
            // @ts-expect-error – joined relation
            id: vt.tools.id,
            // @ts-expect-error – joined relation
            name: vt.tools.name,
            // @ts-expect-error – joined relation
            pricing_model: vt.tools.pricing_model,
            // @ts-expect-error – joined relation
            per_seat_cost: Number(vt.tools.per_seat_cost),
            // @ts-expect-error – joined relation
            flat_monthly_cost: Number(vt.tools.flat_monthly_cost),
            // @ts-expect-error – joined relation
            tier_rules: vt.tools.tier_rules ?? [],
            // @ts-expect-error – joined relation
            vendor_minimum_monthly: vt.tools.vendor_minimum_monthly
              // @ts-expect-error – joined relation
              ? Number(vt.tools.vendor_minimum_monthly)
              : null,
            // @ts-expect-error – joined relation
            labor_cost_per_seat: vt.tools.labor_cost_per_seat
              // @ts-expect-error – joined relation
              ? Number(vt.tools.labor_cost_per_seat)
              : null,
            quantity_multiplier: Number(vt.quantity_multiplier),
          }));

          return { version, tools };
        })
      );

      versionsByBundle[bundle.id] = versionOptions;
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Contract"
        description={`Assign a bundle version to ${client.name}`}
      />
      <ContractForm
        clientId={clientId}
        clientName={client.name}
        bundles={activeBundles}
        versionsByBundle={versionsByBundle}
        settings={settings}
      />
    </div>
  );
}
