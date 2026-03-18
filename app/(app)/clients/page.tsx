import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Clients" };
import Link from "next/link";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getClients } from "@/lib/db/clients";
import { hasPermission } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/org-context";
import {
  getOrgComplianceTargets,
  getAllComplianceScores,
} from "@/lib/db/compliance";
import { getAllHealthScores } from "@/actions/client-health";
import { PageHeader } from "@/components/shared/page-header";
import { ClientList } from "@/components/clients/client-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { Plus, Users, TrendingUp, AlertTriangle } from "lucide-react";

export default async function ClientsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "view_clients")) redirect("/dashboard");

  const orgId = await getActiveOrgId();
  const clients = await getClients(orgId ?? undefined);

  // Fetch compliance scores — best score across all enabled frameworks per client
  const complianceScores: Record<string, number> = {};
  if (orgId) {
    try {
      const targets = await getOrgComplianceTargets(orgId);
      const enabledIds = targets.filter((t) => t.enabled).map((t) => t.framework_id);
      for (const fwId of enabledIds) {
        const scores = await getAllComplianceScores(orgId, fwId);
        for (const s of scores) {
          const pct = Number(s.score_pct);
          if (complianceScores[s.client_id] == null || pct > complianceScores[s.client_id]) {
            complianceScores[s.client_id] = pct;
          }
        }
      }
    } catch {
      // Compliance data unavailable — degrade gracefully
    }
  }

  // Fetch health scores
  let healthScores: Record<string, { overallScore: number; color: "green" | "amber" | "red"; scoreDelta: number | null }> = {};
  if (orgId) {
    try {
      healthScores = await getAllHealthScores();
    } catch {
      // Health scores unavailable — degrade gracefully
    }
  }

  const activeClients = clients.filter((c) => c.status === "active");
  const totalMrr = activeClients.reduce(
    (sum, c) => sum + (c.active_contract?.monthly_revenue ?? 0),
    0
  );
  const avgMargin =
    activeClients.filter((c) => c.active_contract).length > 0
      ? activeClients
          .filter((c) => c.active_contract)
          .reduce((sum, c) => sum + (c.active_contract?.margin_pct ?? 0), 0) /
        activeClients.filter((c) => c.active_contract).length
      : null;

  const renewingSoon = clients.filter((c) => {
    if (!c.active_contract) return false;
    const days = Math.ceil(
      (new Date(c.active_contract.end_date).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    );
    return days >= 0 && days <= 60;
  }).length;

  const canCreate = hasPermission(profile.role, "create_clients");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Portfolio"
        description="Track your clients, contracts, and recurring revenue"
      >
        {canCreate && (
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Link>
          </Button>
        )}
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeClients.length} active, {clients.filter((c) => c.status === "prospect").length} prospects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMrr)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalMrr * 12)} ARR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgMargin !== null ? formatPercent(avgMargin) : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Across active contracts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Renewals Due</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renewingSoon}</div>
            <p className="text-xs text-muted-foreground">Within 60 days</p>
          </CardContent>
        </Card>
      </div>

      <ClientList clients={clients} userRole={profile.role} complianceScores={complianceScores} healthScores={healthScores} />
    </div>
  );
}
