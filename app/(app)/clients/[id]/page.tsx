import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getClientById } from "@/lib/db/clients";
import { getContractsByClientId } from "@/lib/db/client-contracts";
import { getProposalsByClientId } from "@/lib/db/proposals";
import { getActiveOrgId } from "@/lib/org-context";
import {
  getClientComplianceScores,
  getOrgComplianceTargets,
} from "@/lib/db/compliance";
import { getFrameworkById } from "@/lib/data/compliance-frameworks";
import { hasPermission, CLIENT_STATUS_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGate } from "@/components/shared/role-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
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
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Mail, User, Building2, AlertTriangle, FileText } from "lucide-react";
import {
  RenewalBanner,
  ServiceFitBadge,
  ProposalHistory,
} from "@/components/clients/client-detail-sections";
import { findSoonestRenewal, calculateServiceFit } from "@/lib/client-utils";
import { ClientComplianceSection } from "@/components/compliance/client-compliance-section";
import { createClient } from "@/lib/supabase/server";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ClientDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const client = await getClientById(id);
  return { title: client?.name ?? "Client" };
}

function marginColor(margin: number): string {
  if (margin >= 0.25) return "text-emerald-600";
  if (margin >= 0.15) return "text-amber-600";
  return "text-red-600";
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil(
    (new Date(dateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id } = await params;
  const [profile, orgId] = await Promise.all([
    getCurrentProfile(),
    getActiveOrgId(),
  ]);
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "view_clients")) redirect("/dashboard");

  const [client, contracts, proposals, complianceTargets, complianceScores] =
    await Promise.all([
      getClientById(id),
      getContractsByClientId(id),
      getProposalsByClientId(id),
      orgId ? getOrgComplianceTargets(orgId) : Promise.resolve([]),
      orgId
        ? getClientComplianceScores(orgId, id)
        : Promise.resolve([]),
    ]);

  if (!client) notFound();

  const totalMrr = contracts
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + c.monthly_revenue, 0);

  // Find soonest renewal within 60 days
  const soonestRenewal = findSoonestRenewal(contracts);

  // Fetch outcome types for assigned services to compute service fit
  const activeBundleIds = [
    ...new Set(
      contracts.filter((c) => c.status === "active").map((c) => c.bundle_id)
    ),
  ];

  let serviceFitLevel: "Strong" | "Moderate" | "Weak" | null = null;
  if (activeBundleIds.length > 0 && client.industry && orgId) {
    try {
      const supabase = await createClient();
      const { data: outcomes } = await supabase
        .from("service_outcomes")
        .select("outcome_type")
        .eq("org_id", orgId)
        .in("bundle_id", activeBundleIds);

      const outcomeTypes = (outcomes ?? []).map((o) => o.outcome_type);
      if (outcomeTypes.length > 0) {
        serviceFitLevel = calculateServiceFit(client.industry, outcomeTypes);
      }
    } catch {
      // Non-critical — skip fit scoring
    }
  }

  return (
    <div className="space-y-6">
      {/* Renewal Intelligence Banner — conditional, top of page */}
      {soonestRenewal && (
        <RenewalBanner
          contractName={soonestRenewal.contract.bundle_name}
          endDate={soonestRenewal.contract.end_date}
          daysUntil={soonestRenewal.daysUntil}
          clientId={id}
        />
      )}

      <PageHeader title={client.name}>
        <div className="flex items-center gap-2">
          <StatusBadge status={client.status} label={CLIENT_STATUS_LABELS[client.status]} />
          <Button size="sm" asChild>
            <Link href={`/sales-studio?client=${id}`}>
              <FileText className="h-3 w-3 mr-1" />
              Generate Proposal
            </Link>
          </Button>
          <RoleGate role={profile.role} permission="edit_clients">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/clients/${id}/edit`}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Link>
            </Button>
          </RoleGate>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.industry && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{client.industry}</span>
              </div>
            )}
            {client.contact_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{client.contact_name}</span>
              </div>
            )}
            {client.contact_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={`mailto:${client.contact_email}`}
                  className="text-primary hover:underline"
                >
                  {client.contact_email}
                </a>
              </div>
            )}
            {!client.industry && !client.contact_name && !client.contact_email && (
              <p className="text-sm text-muted-foreground">No contact details added.</p>
            )}
            {client.notes && (
              <>
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Revenue summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Active MRR</p>
                <p className="text-xl font-bold font-mono mt-0.5">
                  {formatCurrency(totalMrr)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Active ARR</p>
                <p className="text-xl font-bold font-mono mt-0.5">
                  {formatCurrency(totalMrr * 12)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Contracts</p>
                <p className="text-xl font-bold font-mono mt-0.5">
                  {contracts.length}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contracts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Contracts</CardTitle>
            {serviceFitLevel && <ServiceFitBadge level={serviceFitLevel} />}
          </div>
          <RoleGate role={profile.role} permission="create_clients">
            <Button size="sm" asChild>
              <Link href={`/clients/${id}/contracts/new`}>
                <Plus className="h-3 w-3 mr-1" />
                Add Contract
              </Link>
            </Button>
          </RoleGate>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <EmptyState
              title="No contracts yet"
              description={`Ready to create a quote for ${client.name}? Assign a service to start tracking revenue.`}
              actionLabel="Create Quote"
              actionHref={`/clients/${id}/contracts/new`}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Seats</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => {
                  const days = daysUntil(contract.end_date);
                  const renewalSoon = days <= 60 && days >= 0;
                  const expired = days < 0;

                  return (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <Link
                          href={`/services/${contract.bundle_id}/versions/${contract.bundle_version_id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {contract.bundle_name}
                        </Link>
                        <span className="text-xs text-muted-foreground ml-1">
                          v{contract.version_number}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {contract.seat_count}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(contract.monthly_revenue)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono",
                          marginColor(contract.margin_pct)
                        )}
                      >
                        {formatPercent(contract.margin_pct)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(contract.start_date).toLocaleDateString()} –{" "}
                        {new Date(contract.end_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {contract.status === "active" &&
                            (renewalSoon || expired) && (
                              <AlertTriangle
                                className={cn(
                                  "h-3.5 w-3.5",
                                  expired ? "text-red-500" : "text-amber-500"
                                )}
                              />
                            )}
                          <span
                            className={cn(
                              "text-xs",
                              expired && contract.status === "active"
                                ? "text-red-600 font-medium"
                                : renewalSoon && contract.status === "active"
                                  ? "text-amber-600 font-medium"
                                  : "text-muted-foreground"
                            )}
                          >
                            {contract.status !== "active"
                              ? "—"
                              : expired
                                ? `Expired ${Math.abs(days)}d ago`
                                : `${days}d`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={contract.status as "active" | "expired" | "cancelled"} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Compliance */}
      <ClientComplianceSection
        clientId={id}
        scores={complianceScores.map((s) => ({
          framework_id: s.framework_id,
          framework_name: getFrameworkById(s.framework_id)?.shortName ?? s.framework_id,
          score_pct: Number(s.score_pct),
          controls_total: s.controls_total,
          controls_satisfied: s.controls_satisfied,
          controls_partial: s.controls_partial,
          controls_gap: s.controls_gap,
          controls_manual: s.controls_manual,
          domain_scores: s.domain_scores,
          gap_details: s.gap_details,
          suggested_services: s.suggested_services,
          computed_at: s.computed_at,
        }))}
        enabledFrameworkIds={complianceTargets
          .filter((t) => t.enabled)
          .map((t) => t.framework_id)}
      />

      {/* Proposal History */}
      <ProposalHistory proposals={proposals} clientId={id} />
    </div>
  );
}
