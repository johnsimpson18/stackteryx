import type { Metadata } from "next";

export const metadata: Metadata = { title: "Portfolio Intelligence" };

import { getActiveOrgId } from "@/lib/org-context";
import { getBundles } from "@/lib/db/bundles";
import { getClients } from "@/lib/db/clients";
import { getTools } from "@/lib/db/tools";
import { getAllServiceCompleteness } from "@/lib/db/service-completeness";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getStaleVersionsByOrgId } from "@/lib/db/bundle-versions";
import { getProposals } from "@/lib/db/proposals";
import { getToolsByVersionIds } from "@/lib/db/bundle-versions";
import { getPricingHealthSummary } from "@/lib/db/dashboard";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ToolCategory } from "@/lib/types";
import { getAllHealthScores } from "@/actions/client-health";
import { PortfolioIntelligenceClient } from "@/components/portfolio-intelligence/portfolio-intelligence-client";

export default async function PortfolioIntelligencePage() {
  const orgId = await getActiveOrgId();

  // ── Phase 1: Parallel data fetches ──────────────────────────────────────

  const [
    bundlesResult,
    clientsResult,
    toolsResult,
    completenessResult,
    settingsResult,
    staleVersionsResult,
    proposalsResult,
    ctoBriefsByClientResult,
  ] = await Promise.allSettled([
    getBundles(orgId ?? undefined),
    getClients(orgId ?? undefined),
    getTools(orgId ?? undefined),
    orgId ? getAllServiceCompleteness(orgId) : Promise.resolve([]),
    orgId ? getOrgSettings(orgId) : Promise.resolve(null),
    orgId ? getStaleVersionsByOrgId(orgId) : Promise.resolve([]),
    orgId ? getProposals(orgId) : Promise.resolve([]),
    getCTOBriefsByClient(orgId),
  ]);

  const bundles =
    bundlesResult.status === "fulfilled" ? bundlesResult.value : [];
  const clients =
    clientsResult.status === "fulfilled" ? clientsResult.value : [];
  const tools =
    toolsResult.status === "fulfilled" ? toolsResult.value : [];
  const completeness =
    completenessResult.status === "fulfilled"
      ? completenessResult.value
      : [];
  const settings =
    settingsResult.status === "fulfilled" ? settingsResult.value : null;
  const staleVersions =
    staleVersionsResult.status === "fulfilled"
      ? staleVersionsResult.value
      : [];
  const proposals =
    proposalsResult.status === "fulfilled" ? proposalsResult.value : [];
  const ctoBriefsByClient =
    ctoBriefsByClientResult.status === "fulfilled"
      ? ctoBriefsByClientResult.value
      : new Map<string, number>();

  // ── Phase 2: Pricing health (depends on bundles) ────────────────────────

  let pricingHealth = null;
  if (orgId && bundles.length > 0) {
    try {
      pricingHealth = await getPricingHealthSummary(
        bundles,
        staleVersions.length,
      );
    } catch {
      // degrade gracefully
    }
  }

  // ── Phase 3: Tool categories per client via their contracts ─────────────

  const versionIds = clients
    .filter((c) => c.active_contract)
    .map((c) => c.active_contract!.bundle_version_id);

  let versionToolsMap = new Map<
    string,
    Array<{ tool_id: string; tool_name: string; category: string }>
  >();
  if (versionIds.length > 0) {
    try {
      versionToolsMap = await getToolsByVersionIds(versionIds);
    } catch {
      // degrade gracefully
    }
  }

  // ── Compute derived values ──────────────────────────────────────────────

  const defaultTargetMargin = settings
    ? Number(settings.default_target_margin_pct)
    : 0.35;

  const portfolioMrr = bundles
    .filter((b) => b.status === "active" && b.latest_mrr !== null)
    .reduce((sum, b) => sum + (b.latest_mrr ?? 0), 0);

  // ── Build client health data ──────────────────────────────────────────

  const now = new Date();

  // All tool categories offered by this org
  const orgCategories = new Set(tools.map((t) => t.category));

  const clientHealthRows = clients.map((c) => {
    const contract = c.active_contract;
    const hasCTOBrief = (ctoBriefsByClient.get(c.id) ?? 0) > 0;

    let daysUntilRenewal: number | null = null;
    if (contract?.end_date) {
      daysUntilRenewal = Math.ceil(
        (new Date(contract.end_date).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }

    const margin = contract ? Number(contract.margin_pct) : null;

    // Categories covered by the client's contract tools
    const coveredCategories = new Set<string>();
    if (contract) {
      const versionTools = versionToolsMap.get(contract.bundle_version_id);
      if (versionTools) {
        for (const t of versionTools) {
          coveredCategories.add(t.category);
        }
      }
    }

    // Missing categories (ones the org offers but the client doesn't have)
    const missingCategories = [...orgCategories].filter(
      (cat) => cat !== "other" && !coveredCategories.has(cat),
    );

    // Overall health: red, amber, green
    let health: "green" | "amber" | "red" = "green";
    if (!contract) {
      health = "red";
    } else if (
      (margin !== null && margin < defaultTargetMargin) ||
      (daysUntilRenewal !== null && daysUntilRenewal <= 30) ||
      !hasCTOBrief
    ) {
      health = "amber";
    }
    if (
      (margin !== null && margin < 0.1) ||
      (daysUntilRenewal !== null && daysUntilRenewal <= 14)
    ) {
      health = "red";
    }

    return {
      clientId: c.id,
      clientName: c.name,
      hasContract: !!contract,
      hasCTOBrief,
      margin,
      daysUntilRenewal,
      health,
      missingCategories: missingCategories as ToolCategory[],
      monthlyRevenue: contract ? Number(contract.monthly_revenue) : 0,
    };
  });

  // ── Build signal feed ──────────────────────────────────────────────────

  type Signal = {
    id: string;
    type: "revenue" | "risk" | "action";
    title: string;
    description: string;
    clientName: string | null;
    cta: { label: string; href: string };
  };

  const signals: Signal[] = [];

  // Revenue signals: upsell opportunities
  for (const row of clientHealthRows) {
    if (row.missingCategories.length > 0 && row.hasContract) {
      const topGaps = row.missingCategories.slice(0, 3);
      const gapLabels = topGaps
        .map((cat) => CATEGORY_LABELS[cat] ?? cat)
        .join(", ");
      signals.push({
        id: `upsell-${row.clientId}`,
        type: "revenue",
        title: `Upsell opportunity: ${gapLabels}`,
        description: `${row.clientName} doesn't have ${topGaps.length} service categor${topGaps.length === 1 ? "y" : "ies"} you offer.`,
        clientName: row.clientName,
        cta: { label: "View client", href: `/clients/${row.clientId}` },
      });
    }
  }

  // Revenue signals: clients with no CTO brief
  for (const row of clientHealthRows) {
    if (!row.hasCTOBrief && row.hasContract) {
      signals.push({
        id: `no-brief-${row.clientId}`,
        type: "revenue",
        title: "New advisory opportunity",
        description: `${row.clientName} has no CTO brief — an advisory engagement could add value.`,
        clientName: row.clientName,
        cta: {
          label: "Generate brief",
          href: `/cto-briefs`,
        },
      });
    }
  }

  // Risk signals: renewals
  for (const row of clientHealthRows) {
    if (row.daysUntilRenewal !== null && row.daysUntilRenewal <= 90) {
      signals.push({
        id: `renewal-${row.clientId}`,
        type: "risk",
        title: `Renewal in ${row.daysUntilRenewal} days`,
        description: row.monthlyRevenue
          ? `$${row.monthlyRevenue.toLocaleString()} MRR at risk`
          : "Contract expiring soon",
        clientName: row.clientName,
        cta: { label: "View client", href: `/clients/${row.clientId}` },
      });
    }
  }

  // Risk signals: stale pricing
  if (staleVersions.length > 0) {
    signals.push({
      id: "stale-pricing",
      type: "risk",
      title: `${staleVersions.length} service${staleVersions.length !== 1 ? "s have" : " has"} stale pricing`,
      description:
        "Tool costs have changed since prices were last calculated.",
      clientName: null,
      cta: { label: "Review pricing", href: "/services?filter=stale" },
    });
  }

  // Risk signals: margin below target
  if (pricingHealth?.topRisks) {
    for (const risk of pricingHealth.topRisks) {
      if (risk.currentMargin < defaultTargetMargin) {
        signals.push({
          id: `margin-${risk.bundleId}`,
          type: "risk",
          title: `${risk.bundleName} margin is ${(risk.currentMargin * 100).toFixed(0)}%`,
          description: `Below target of ${(defaultTargetMargin * 100).toFixed(0)}%.`,
          clientName: null,
          cta: {
            label: "Review pricing",
            href: `/services/${risk.bundleId}`,
          },
        });
      }
    }
  }

  // Action required: clients with no active contract
  for (const row of clientHealthRows) {
    if (!row.hasContract) {
      signals.push({
        id: `no-contract-${row.clientId}`,
        type: "action",
        title: "No active contract",
        description: `${row.clientName} has no active service contract.`,
        clientName: row.clientName,
        cta: { label: "View client", href: `/clients/${row.clientId}` },
      });
    }
  }

  // Action required: services with incomplete config
  for (const comp of completeness) {
    if (comp.layers_complete < 3) {
      signals.push({
        id: `incomplete-${comp.bundle_id}`,
        type: "action",
        title: `${comp.service_name} needs attention`,
        description: `Only ${comp.layers_complete} of 5 layers complete.`,
        clientName: null,
        cta: {
          label: "Complete setup",
          href: `/services/${comp.bundle_id}`,
        },
      });
    }
  }

  // Action required: cold proposals (draft > 14 days old)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  for (const proposal of proposals) {
    if (
      proposal.status === "draft" &&
      new Date(proposal.created_at) < fourteenDaysAgo
    ) {
      const name = proposal.prospect_name ?? "Client";
      signals.push({
        id: `cold-proposal-${proposal.id}`,
        type: "action",
        title: `Proposal for ${name} has gone cold`,
        description: "Draft created over 14 days ago and not yet sent.",
        clientName: name,
        cta: {
          label: "Review proposal",
          href: `/sales-studio?tab=history`,
        },
      });
    }
  }

  // ── Revenue opportunity map ───────────────────────────────────────────

  // Estimate upsell potential: for each client missing categories, estimate
  // average MRR for services using those categories as a rough indicator
  const bundleMrr = new Map(
    bundles
      .filter((b) => b.latest_mrr !== null && b.latest_mrr > 0)
      .map((b) => [b.id, b.latest_mrr ?? 0]),
  );
  const avgServiceMrr =
    bundleMrr.size > 0
      ? [...bundleMrr.values()].reduce((a, b) => a + b, 0) / bundleMrr.size
      : 0;

  const opportunities = clientHealthRows
    .filter((r) => r.hasContract && r.missingCategories.length > 0)
    .map((r) => {
      // Rough estimate: proportion of missing vs total categories * avg service MRR
      const gapRatio = r.missingCategories.length / orgCategories.size;
      const estimatedValue = Math.round(avgServiceMrr * gapRatio);
      return {
        clientId: r.clientId,
        clientName: r.clientName,
        gapCount: r.missingCategories.length,
        gapLabels: r.missingCategories
          .slice(0, 3)
          .map((cat) => CATEGORY_LABELS[cat] ?? cat),
        estimatedMonthlyValue: estimatedValue,
      };
    })
    .filter((o) => o.estimatedMonthlyValue > 0)
    .sort((a, b) => b.estimatedMonthlyValue - a.estimatedMonthlyValue);

  const totalOpportunityValue = opportunities.reduce(
    (sum, o) => sum + o.estimatedMonthlyValue,
    0,
  );

  // ── Coverage analysis ─────────────────────────────────────────────────

  // For each security-relevant category, count how many clients with contracts cover it
  const clientsWithContracts = clientHealthRows.filter((r) => r.hasContract);
  const totalClientsWithContracts = clientsWithContracts.length;

  const securityCategories: ToolCategory[] = [
    "edr",
    "siem",
    "email_security",
    "identity",
    "backup",
    "vulnerability_management",
    "dns_filtering",
    "mfa",
    "dark_web",
    "mdr",
  ];

  const coverageAnalysis = securityCategories
    .filter((cat) => orgCategories.has(cat))
    .map((cat) => {
      const clientsMissing = clientsWithContracts.filter((r) =>
        r.missingCategories.includes(cat),
      ).length;
      return {
        category: cat,
        label: CATEGORY_LABELS[cat] ?? cat,
        clientsCovered: totalClientsWithContracts - clientsMissing,
        clientsMissing,
        totalClients: totalClientsWithContracts,
      };
    })
    .filter((c) => c.clientsMissing > 0)
    .sort((a, b) => b.clientsMissing - a.clientsMissing);

  // ── Health scores ──────────────────────────────────────────────────────

  let healthScoreMap: Record<string, { overallScore: number; grade: string; color: string; scoreDelta: number | null }> = {};
  try {
    healthScoreMap = await getAllHealthScores();
  } catch {
    // degrade gracefully
  }

  // ── Scout nudges ──────────────────────────────────────────────────────

  let scoutNudges: { id: string; nudgeType: string; priority: number; title: string; body: string; entityType: string | null; entityId: string | null; entityName: string | null; ctaLabel: string | null; ctaHref: string | null; status: string; createdAt: string; orgId: string }[] = [];
  try {
    const { getActiveNudges } = await import("@/actions/scout-nudges");
    scoutNudges = await getActiveNudges();
  } catch {
    // degrade gracefully
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <PortfolioIntelligenceClient
      signals={signals}
      clientHealthRows={clientHealthRows}
      portfolioMrr={portfolioMrr}
      totalOpportunityValue={totalOpportunityValue}
      opportunities={opportunities}
      coverageAnalysis={coverageAnalysis}
      totalClientsWithContracts={totalClientsWithContracts}
      healthScores={healthScoreMap}
      scoutNudges={scoutNudges}
    />
  );
}

// ── Helper: CTO brief count by client ─────────────────────────────────────

async function getCTOBriefsByClient(
  orgId: string | null,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!orgId) return result;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("fractional_cto_briefs")
      .select("client_id")
      .eq("org_id", orgId)
      .not("client_id", "is", null);
    if (data) {
      for (const row of data) {
        result.set(
          row.client_id,
          (result.get(row.client_id) ?? 0) + 1,
        );
      }
    }
  } catch {
    // degrade gracefully
  }
  return result;
}
