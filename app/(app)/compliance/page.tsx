import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Compliance" };
import { getCurrentProfile } from "@/lib/db/profiles";
import { getClients } from "@/lib/db/clients";
import { hasPermission } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/org-context";
import {
  getOrgComplianceTargets,
  getAllComplianceScores,
} from "@/lib/db/compliance";
import {
  getAllFrameworks,
  getControlCount,
} from "@/lib/data/compliance-frameworks";
import { PageHeader } from "@/components/shared/page-header";
import { CompliancePortfolio } from "@/components/compliance/compliance-portfolio";

export default async function CompliancePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "view_clients")) redirect("/dashboard");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/dashboard");

  const [clients, targets] = await Promise.all([
    getClients(orgId),
    getOrgComplianceTargets(orgId),
  ]);

  // Get all available frameworks with metadata
  const allFrameworks = getAllFrameworks().map((fw) => {
    const counts = getControlCount(fw);
    const enabled = targets.some((t) => t.framework_id === fw.id && t.enabled);
    return {
      id: fw.id,
      name: fw.name,
      shortName: fw.shortName,
      version: fw.version,
      description: fw.description,
      targetAudience: fw.targetAudience,
      controlsTotal: counts.total,
      controlsScorable: counts.scorable,
      controlsManual: counts.manual,
      enabled,
    };
  });

  // Fetch scores for each enabled framework
  const enabledIds = allFrameworks
    .filter((fw) => fw.enabled)
    .map((fw) => fw.id);

  const scoresByFramework: Record<
    string,
    { client_id: string; score_pct: number; computed_at: string }[]
  > = {};

  for (const fwId of enabledIds) {
    const scores = await getAllComplianceScores(orgId, fwId);
    scoresByFramework[fwId] = scores.map((s) => ({
      client_id: s.client_id,
      score_pct: Number(s.score_pct),
      computed_at: s.computed_at,
    }));
  }

  // Build client list for the grid
  const clientList = clients
    .filter((c) => c.status === "active")
    .map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Portfolio"
        description="Assess client security posture against industry frameworks"
      />

      <CompliancePortfolio
        frameworks={allFrameworks}
        clients={clientList}
        scoresByFramework={scoresByFramework}
        userRole={profile.role}
      />
    </div>
  );
}
