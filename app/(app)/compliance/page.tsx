import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Compliance Intelligence" };

import { getCurrentProfile } from "@/lib/db/profiles";
import { getClients } from "@/lib/db/clients";
import { hasPermission } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/org-context";
import { getAllComplianceScores } from "@/lib/db/compliance";
import { getOrgComplianceCoverage } from "@/actions/compliance-coverage";
import { ComplianceIntelligenceClient } from "@/components/compliance/compliance-intelligence-client";

export default async function CompliancePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "view_clients")) redirect("/dashboard");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/dashboard");

  const [clients, coverage] = await Promise.all([
    getClients(orgId),
    getOrgComplianceCoverage().catch(() => null),
  ]);

  // Build client compliance rows
  // For each client with an active contract, show their per-framework scores
  const activeClients = clients.filter((c) => c.status === "active");

  // Fetch per-client compliance scores for each framework
  const frameworks = ["hipaa", "pci-dss", "cmmc-l2"] as const;
  const clientScoreMap = new Map<
    string,
    { hipaa: number | null; pci: number | null; cmmc: number | null; frameworks: string[] }
  >();

  for (const client of activeClients) {
    clientScoreMap.set(client.id, { hipaa: null, pci: null, cmmc: null, frameworks: [] });
  }

  for (const fwId of frameworks) {
    try {
      const scores = await getAllComplianceScores(orgId, fwId);
      for (const s of scores) {
        const entry = clientScoreMap.get(s.client_id);
        if (!entry) continue;
        const pct = Number(s.score_pct);
        const label = fwId === "hipaa" ? "HIPAA" : fwId === "pci-dss" ? "PCI DSS" : "CMMC";
        if (!entry.frameworks.includes(label)) entry.frameworks.push(label);
        if (fwId === "hipaa") entry.hipaa = pct;
        else if (fwId === "pci-dss") entry.pci = pct;
        else entry.cmmc = pct;
      }
    } catch {
      // Framework data unavailable
    }
  }

  const clientRows = activeClients.map((c) => {
    const scores = clientScoreMap.get(c.id);
    return {
      clientId: c.id,
      clientName: c.name,
      frameworks: scores?.frameworks ?? [],
      hipaaScore: scores?.hipaa ?? null,
      pciScore: scores?.pci ?? null,
      cmmcScore: scores?.cmmc ?? null,
    };
  });

  return (
    <ComplianceIntelligenceClient
      coverage={coverage}
      clientRows={clientRows}
    />
  );
}
