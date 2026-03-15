import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getBundleById } from "@/lib/db/bundles";
import { getVersionById, getPreviousVersion } from "@/lib/db/bundle-versions";
import { getEnablementByVersionId } from "@/lib/db/enablement";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { calculatePricing } from "@/lib/pricing/engine";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGate } from "@/components/shared/role-gate";
import { VersionTabs } from "@/components/bundles/version-tabs";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import type { PricingInput, PricingToolInput } from "@/lib/types";

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

  const [enablement, previousVersion] = await Promise.all([
    getEnablementByVersionId(orgId, versionId),
    getPreviousVersion(version.bundle_id, version.version_number),
  ]);

  // Compute full PricingOutput for tool-level breakdown
  const pricingTools: PricingToolInput[] = version.tools
    .filter((vt) => vt.tool != null)
    .map((vt) => {
      const tool = vt.tool!;
      return {
        id: tool.id,
        name: tool.name,
        pricing_model: tool.pricing_model,
        per_seat_cost: Number(tool.per_seat_cost),
        flat_monthly_cost: Number(tool.flat_monthly_cost),
        tier_rules: tool.tier_rules ?? [],
        vendor_minimum_monthly: tool.vendor_minimum_monthly
          ? Number(tool.vendor_minimum_monthly)
          : null,
        labor_cost_per_seat: tool.labor_cost_per_seat
          ? Number(tool.labor_cost_per_seat)
          : null,
        quantity_multiplier: vt.quantity_multiplier,
        annual_flat_cost: Number(tool.annual_flat_cost ?? 0),
        per_user_cost: Number(tool.per_user_cost ?? 0),
        per_org_cost: Number(tool.per_org_cost ?? 0),
        percent_discount: Number(tool.percent_discount ?? 0),
        flat_discount: Number(tool.flat_discount ?? 0),
        min_monthly_commit: tool.min_monthly_commit
          ? Number(tool.min_monthly_commit)
          : null,
        tier_metric: tool.tier_metric,
      };
    });

  const pricingInput: PricingInput = {
    tools: pricingTools,
    seat_count: version.seat_count,
    target_margin_pct: version.target_margin_pct,
    overhead_pct: version.overhead_pct,
    labor_pct: version.labor_pct,
    discount_pct: version.discount_pct,
    red_zone_margin_pct: 0.15,
    max_discount_no_approval_pct: 0.2,
    contract_term_months: version.contract_term_months,
    assumptions: (version.assumptions as PricingInput["assumptions"]) ?? {
      endpoints: version.seat_count,
      users: version.seat_count,
      org_count: 1,
    },
    sell_config: version.sell_config as PricingInput["sell_config"],
  };

  const pricingOutput = calculatePricing(pricingInput);

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
        pricingOutput={pricingOutput}
        previousVersion={previousVersion}
      />
    </div>
  );
}
