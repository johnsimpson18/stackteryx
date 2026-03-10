import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getBundleById } from "@/lib/db/bundles";
import { getVersionsByBundleId } from "@/lib/db/bundle-versions";
import { getEnablementStatusByBundleId } from "@/lib/db/enablement";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGate } from "@/components/shared/role-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BUNDLE_TYPE_LABELS,
  BUNDLE_STATUS_LABELS,
} from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { Plus, Pencil, ChevronRight, Wrench } from "lucide-react";
import { ArchiveButton } from "./archive-button";
import { OnboardingBanner } from "@/components/bundles/onboarding-banner";
import { EmptyState } from "@/components/shared/empty-state";
import type { PricingFlag } from "@/lib/types";

interface BundleDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onboarding?: string }>;
}

function marginColor(margin: number): string {
  if (margin >= 0.25) return "text-emerald-600";
  if (margin >= 0.15) return "text-amber-600";
  return "text-red-600";
}

export default async function BundleDetailPage({
  params,
  searchParams,
}: BundleDetailPageProps) {
  const { id } = await params;
  const { onboarding } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();

  const bundle = await getBundleById(id);
  if (!bundle) notFound();

  const versions = await getVersionsByBundleId(id);

  const enablementStatuses = orgId
    ? await getEnablementStatusByBundleId(orgId, id)
    : [];
  const enablementMap = new Map(
    enablementStatuses.map((s) => [s.versionId, s.hasEnablement])
  );

  const showOnboarding = onboarding === "complete";

  // Determine "what's next" state for contextual CTAs
  const latestVersion = versions[0];
  const latestHasEnablement = latestVersion
    ? enablementMap.get(latestVersion.id) ?? false
    : false;

  return (
    <div className="space-y-6">
      {showOnboarding && (
        <OnboardingBanner
          bundleId={id}
          firstVersionId={versions[0]?.id}
        />
      )}

      <PageHeader title={bundle.name}>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {BUNDLE_TYPE_LABELS[bundle.bundle_type]}
          </Badge>
          <StatusBadge status={bundle.status} label={BUNDLE_STATUS_LABELS[bundle.status]} />
          <RoleGate role={profile.role} permission="edit_bundles">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/services/${id}/edit`}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Link>
            </Button>
          </RoleGate>
          <RoleGate role={profile.role} permission="archive_bundles">
            {bundle.status !== "archived" && (
              <ArchiveButton bundleId={id} bundleName={bundle.name} />
            )}
          </RoleGate>
        </div>
      </PageHeader>

      {bundle.description && (
        <p className="text-sm text-muted-foreground">{bundle.description}</p>
      )}

      {/* Versions */}
      {versions.length === 0 ? (
        <EmptyState
          title="No pricing yet"
          description="Add tools and model pricing to complete your service."
          actionLabel="Build this service"
          actionHref={`/services/${id}/versions/new`}
        />
      ) : versions.length === 1 ? (
        /* Single version — product-page card layout */
        (() => {
          const v = versions[0];
          const margin = Number(v.computed_margin_post_discount ?? 0);
          const flags = (v.pricing_flags ?? []) as PricingFlag[];
          const hasEnabl = enablementMap.get(v.id);

          return (
            <div className="space-y-3">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                        Current Version
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        v{v.version_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {v.risk_tier} risk
                      </Badge>
                      {hasEnabl && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        >
                          Enabled
                        </Badge>
                      )}
                      {flags.length > 0 && (
                        <Badge
                          variant="secondary"
                          className={
                            flags.some((f) => f.severity === "error")
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }
                        >
                          {flags.length} flag{flags.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Seats</p>
                      <p className="text-lg font-bold">{v.seat_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">MRR</p>
                      <p className="text-lg font-bold font-mono">
                        {formatCurrency(Number(v.computed_mrr ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Margin</p>
                      <p className={`text-lg font-bold font-mono ${marginColor(margin)}`}>
                        {formatPercent(margin)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        <Wrench className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                        Tools
                      </p>
                      <p className="text-lg font-bold">—</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasEnabl ? (
                      <Button asChild>
                        <Link href="/clients">
                          Create a Quote
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild>
                        <Link href={`/services/${id}/versions/${v.id}?tab=enablement`}>
                          Generate Sales Package
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" asChild>
                      <Link href={`/services/${id}/versions/${v.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                  {!hasEnabl && (
                    <p className="text-sm text-muted-foreground mt-3">
                      Your service is priced. Now create sales content your team can use.
                    </p>
                  )}
                  {hasEnabl && (
                    <p className="text-sm text-muted-foreground mt-3">
                      Ready to sell? Create a quote for a client.
                    </p>
                  )}
                </CardContent>
              </Card>

              <RoleGate role={profile.role} permission="create_versions">
                <Link
                  href={`/services/${id}/versions/new`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors pl-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create new configuration
                </Link>
              </RoleGate>
            </div>
          );
        })()
      ) : (
        /* Multiple versions — full table */
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pricing Configurations</CardTitle>
            <RoleGate role={profile.role} permission="create_versions">
              <Button size="sm" asChild>
                <Link href={`/services/${id}/versions/new`}>
                  <Plus className="h-3 w-3 mr-1" />
                  New Configuration
                </Link>
              </Button>
            </RoleGate>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Seats</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead>Risk Tier</TableHead>
                  <TableHead>Enablement</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => {
                  const margin = Number(v.computed_margin_post_discount ?? 0);
                  const flags = (v.pricing_flags ?? []) as PricingFlag[];

                  return (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Link
                          href={`/services/${id}/versions/${v.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          v{v.version_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        {v.seat_count}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${marginColor(margin)}`}
                      >
                        {formatPercent(margin)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(v.computed_mrr ?? 0))}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPercent(Number(v.discount_pct))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {v.risk_tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {enablementMap.get(v.id) ? (
                          <Link href={`/services/${id}/versions/${v.id}?tab=enablement`}>
                            <Badge
                              variant="secondary"
                              className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer"
                            >
                              Enabled
                            </Badge>
                          </Link>
                        ) : (
                          <Link
                            href={`/services/${id}/versions/${v.id}?tab=enablement`}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            Generate →
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {flags.length > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge
                                  variant="secondary"
                                  className={
                                    flags.some((f) => f.severity === "error")
                                      ? "bg-red-100 text-red-600"
                                      : "bg-amber-100 text-amber-600"
                                  }
                                >
                                  {flags.length}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                {flags.map((f, i) => (
                                  <p key={i} className="text-xs">
                                    {f.message}
                                  </p>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Contextual next-step prompt for multi-version */}
      {versions.length > 1 && !latestHasEnablement && latestVersion && (
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href={`/services/${id}/versions/${latestVersion.id}?tab=enablement`}>
              Generate Sales Package
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Your latest version is priced. Now create sales content your team can use.
          </p>
        </div>
      )}
      {versions.length > 1 && latestHasEnablement && (
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href="/clients">
              Create a Quote
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Ready to sell? Create a quote for a client.
          </p>
        </div>
      )}
    </div>
  );
}
