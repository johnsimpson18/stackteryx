"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getActiveOrgId } from "@/lib/org-context";
import {
  calculateComplianceScores,
  COMPLIANCE_TOOL_MAPPING,
  normalizeToolCategory,
} from "@/lib/compliance-tool-mapping";
import { CATEGORY_LABELS } from "@/lib/constants";

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrgComplianceCoverage {
  orgId: string;
  hipaaScore: number;
  pciScore: number;
  cmmcScore: number;
  hipaaTools: string[];
  pciTools: string[];
  cmmcTools: string[];
  hipaaGaps: string[];
  pciGaps: string[];
  cmmcGaps: string[];
  previousHipaa: number | null;
  previousPci: number | null;
  previousCmmc: number | null;
  calculatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireOrgId(): Promise<string> {
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No active org");
  return orgId;
}

function categoryLabel(cat: string): string {
  return (CATEGORY_LABELS as Record<string, string>)[cat] ?? cat;
}

function toRecord(row: Record<string, unknown>, orgId: string): OrgComplianceCoverage {
  return {
    orgId,
    hipaaScore: (row.hipaa_score as number) ?? 0,
    pciScore: (row.pci_score as number) ?? 0,
    cmmcScore: (row.cmmc_score as number) ?? 0,
    hipaaTools: (row.hipaa_tools as string[]) ?? [],
    pciTools: (row.pci_tools as string[]) ?? [],
    cmmcTools: (row.cmmc_tools as string[]) ?? [],
    hipaaGaps: (row.hipaa_gaps as string[]) ?? [],
    pciGaps: (row.pci_gaps as string[]) ?? [],
    cmmcGaps: (row.cmmc_gaps as string[]) ?? [],
    previousHipaa: (row.previous_hipaa as number) ?? null,
    previousPci: (row.previous_pci as number) ?? null,
    previousCmmc: (row.previous_cmmc as number) ?? null,
    calculatedAt: (row.calculated_at as string) ?? new Date().toISOString(),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function recalculateOrgCompliance(): Promise<OrgComplianceCoverage> {
  const orgId = await requireOrgId();
  const service = createServiceClient();

  // 1. Get all active bundles for this org
  const { data: bundles } = await service
    .from("bundles")
    .select("id")
    .eq("org_id", orgId)
    .eq("status", "active");

  const bundleIds = (bundles ?? []).map((b) => b.id);

  // 2. Get latest version for each active bundle
  let allCategories: string[] = [];

  if (bundleIds.length > 0) {
    // Get the latest version ID for each bundle
    const { data: versions } = await service
      .from("bundle_versions")
      .select("id, bundle_id")
      .in("bundle_id", bundleIds)
      .order("created_at", { ascending: false });

    // Deduplicate to latest per bundle
    const latestVersionIds: string[] = [];
    const seen = new Set<string>();
    for (const v of versions ?? []) {
      if (!seen.has(v.bundle_id)) {
        seen.add(v.bundle_id);
        latestVersionIds.push(v.id);
      }
    }

    if (latestVersionIds.length > 0) {
      const { data: bvTools } = await service
        .from("bundle_version_tools")
        .select("tools(category, name)")
        .in("bundle_version_id", latestVersionIds);

      allCategories = (bvTools ?? [])
        .map((t) => {
          const tool = t.tools as unknown as { category: string; name: string } | null;
          return tool?.category;
        })
        .filter(Boolean) as string[];
    }
  }

  // 3. Calculate compliance scores
  const uniqueCategories = [...new Set(allCategories.map(normalizeToolCategory))];
  const scores = calculateComplianceScores(uniqueCategories);

  // 4. Identify contributing tools per framework
  const hipaaTools: string[] = [];
  const pciTools: string[] = [];
  const cmmcTools: string[] = [];

  for (const cat of uniqueCategories) {
    const mapping = COMPLIANCE_TOOL_MAPPING.find((m) => m.toolCategory === cat);
    if (!mapping) continue;
    const label = categoryLabel(cat);
    if (mapping.hipaaWeight > 0) hipaaTools.push(label);
    if (mapping.pciWeight > 0) pciTools.push(label);
    if (mapping.cmmcWeight > 0) cmmcTools.push(label);
  }

  // 5. Identify gaps — categories not present that would improve scores
  const hipaaGaps: string[] = [];
  const pciGaps: string[] = [];
  const cmmcGaps: string[] = [];

  for (const mapping of COMPLIANCE_TOOL_MAPPING) {
    if (uniqueCategories.includes(mapping.toolCategory)) continue;
    const label = categoryLabel(mapping.toolCategory);
    if (mapping.hipaaWeight >= 5 && scores.hipaa < 100) {
      hipaaGaps.push(`${label} (+${mapping.hipaaWeight} pts)`);
    }
    if (mapping.pciWeight >= 5 && scores.pci < 100) {
      pciGaps.push(`${label} (+${mapping.pciWeight} pts)`);
    }
    if (mapping.cmmcWeight >= 5 && scores.cmmc < 100) {
      cmmcGaps.push(`${label} (+${mapping.cmmcWeight} pts)`);
    }
  }

  // 6. Get previous scores
  const { data: existing } = await service
    .from("org_compliance_coverage")
    .select("hipaa_score, pci_score, cmmc_score")
    .eq("org_id", orgId)
    .single();

  // 7. Upsert
  const { data: saved } = await service
    .from("org_compliance_coverage")
    .upsert(
      {
        org_id: orgId,
        hipaa_score: scores.hipaa,
        pci_score: scores.pci,
        cmmc_score: scores.cmmc,
        hipaa_tools: hipaaTools,
        pci_tools: pciTools,
        cmmc_tools: cmmcTools,
        hipaa_gaps: hipaaGaps,
        pci_gaps: pciGaps,
        cmmc_gaps: cmmcGaps,
        previous_hipaa: existing?.hipaa_score ?? null,
        previous_pci: existing?.pci_score ?? null,
        previous_cmmc: existing?.cmmc_score ?? null,
        calculated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    )
    .select()
    .single();

  // 8. Log Aria activity (fire-and-forget)
  import("@/lib/agents/log-activity").then(({ logAgentActivity }) => {
    logAgentActivity({
      orgId,
      agentId: "aria",
      activityType: "analysis",
      title: `Aria updated compliance coverage: HIPAA ${scores.hipaa}%, PCI ${scores.pci}%, CMMC ${scores.cmmc}%`,
    });
  });

  // 9. Also recalculate health scores (compliance changes affect them)
  import("@/actions/client-health").then(({ recalculateAllHealthScores }) => {
    recalculateAllHealthScores().catch(() => {});
  });

  return toRecord(saved ?? {}, orgId);
}

export async function getOrgComplianceCoverage(): Promise<OrgComplianceCoverage | null> {
  const orgId = await requireOrgId();
  const service = createServiceClient();

  const { data } = await service
    .from("org_compliance_coverage")
    .select("*")
    .eq("org_id", orgId)
    .single();

  if (!data) return null;
  return toRecord(data, orgId);
}
