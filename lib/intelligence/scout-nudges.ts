// ── Scout Nudge Generation Engine ─────────────────────────────────────────────
//
// Deterministic nudge generation from portfolio data. No AI calls.

import { createServiceClient } from "@/lib/supabase/service";

export interface ScoutNudge {
  nudgeType: string;
  priority: number;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  expiresAt: string | null;
}

export async function generateScoutNudges(orgId: string): Promise<ScoutNudge[]> {
  const service = createServiceClient();
  const nudges: ScoutNudge[] = [];
  const now = new Date();

  // ── Renewal risk nudges (priority 1-2) ──────────────────────────────────

  const { data: contracts } = await service
    .from("client_contracts")
    .select("id, client_id, end_date, monthly_revenue, status, bundle_version_id, bundles!inner(org_id)")
    .eq("status", "active")
    .eq("bundles.org_id", orgId);

  const { data: clientRows } = await service
    .from("clients")
    .select("id, name")
    .eq("org_id", orgId);

  const clientNameMap = new Map(
    (clientRows ?? []).map((c) => [c.id, c.name]),
  );

  for (const contract of contracts ?? []) {
    const endDate = new Date(contract.end_date);
    const daysUntil = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntil <= 30 && daysUntil >= -7) {
      const clientName = clientNameMap.get(contract.client_id) ?? "Client";
      const priority = daysUntil <= 14 ? 1 : 2;
      const expiresAt = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      nudges.push({
        nudgeType: "renewal_risk",
        priority,
        title: `${clientName} contract renews in ${Math.max(0, daysUntil)} days`,
        body: contract.monthly_revenue
          ? `$${Number(contract.monthly_revenue).toLocaleString("en-US")} MRR at risk. Generate a renewal proposal before the window closes.`
          : "Generate a renewal proposal before the window closes.",
        entityType: "client",
        entityId: contract.client_id,
        entityName: clientName,
        ctaLabel: "Generate Renewal Proposal",
        ctaHref: `/sales-studio?client=${contract.client_id}`,
        expiresAt,
      });
    }
  }

  // ── Health decline nudges (priority 2) ──────────────────────────────────

  const { data: healthScores } = await service
    .from("client_health_scores")
    .select("client_id, overall_score, score_delta")
    .eq("org_id", orgId);

  for (const hs of healthScores ?? []) {
    if (hs.score_delta !== null && hs.score_delta < -10) {
      const clientName = clientNameMap.get(hs.client_id) ?? "Client";
      nudges.push({
        nudgeType: "health_decline",
        priority: 2,
        title: `${clientName}'s health score dropped ${Math.abs(hs.score_delta)} points`,
        body: `Now at ${hs.overall_score}/100. Review their coverage and address any gaps.`,
        entityType: "client",
        entityId: hs.client_id,
        entityName: clientName,
        ctaLabel: "Review Client",
        ctaHref: `/clients/${hs.client_id}`,
        expiresAt: null,
      });
    }
  }

  // ── Advisory gap nudges (priority 3) ─────────────────────────────────────

  const { data: briefs } = await service
    .from("fractional_cto_briefs")
    .select("client_id, created_at")
    .eq("org_id", orgId)
    .not("client_id", "is", null)
    .order("created_at", { ascending: false });

  const latestBriefByClient = new Map<string, Date>();
  for (const b of briefs ?? []) {
    if (!latestBriefByClient.has(b.client_id)) {
      latestBriefByClient.set(b.client_id, new Date(b.created_at));
    }
  }

  // Clients with active contracts who have stale or no briefs
  const clientsWithContracts = new Set(
    (contracts ?? []).map((c) => c.client_id),
  );

  for (const clientId of clientsWithContracts) {
    const clientName = clientNameMap.get(clientId) ?? "Client";
    const lastBrief = latestBriefByClient.get(clientId);

    if (!lastBrief) {
      nudges.push({
        nudgeType: "advisory_gap",
        priority: 3,
        title: `${clientName} has no Technology Strategy Brief`,
        body: "Generate a brief to strengthen your advisory relationship and improve their health score.",
        entityType: "client",
        entityId: clientId,
        entityName: clientName,
        ctaLabel: "Generate Brief",
        ctaHref: `/cto-briefs`,
        expiresAt: null,
      });
    } else {
      const daysSince = Math.floor(
        (now.getTime() - lastBrief.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSince > 75) {
        nudges.push({
          nudgeType: "advisory_gap",
          priority: 3,
          title: `${clientName}'s Technology Strategy Brief is ${daysSince} days old`,
          body: "Refresh the brief to maintain your advisory engagement.",
          entityType: "client",
          entityId: clientId,
          entityName: clientName,
          ctaLabel: "Refresh Brief",
          ctaHref: `/cto-briefs`,
          expiresAt: null,
        });
      }
    }
  }

  // ── Compliance gap nudges (priority 3) ────────────────────────────────────

  const { data: coverage } = await service
    .from("org_compliance_coverage")
    .select("hipaa_score, pci_score, cmmc_score")
    .eq("org_id", orgId)
    .single();

  if (coverage) {
    const frameworks = [
      { name: "HIPAA", score: coverage.hipaa_score },
      { name: "PCI DSS", score: coverage.pci_score },
      { name: "CMMC", score: coverage.cmmc_score },
    ];

    for (const fw of frameworks) {
      if (fw.score < 60) {
        nudges.push({
          nudgeType: "compliance_gap",
          priority: 3,
          title: `${fw.name} coverage at ${fw.score}% — below threshold`,
          body: `Your service stack provides limited ${fw.name} coverage. Add tools to improve your compliance posture.`,
          entityType: "portfolio",
          entityId: null,
          entityName: null,
          ctaLabel: "View Compliance",
          ctaHref: "/compliance",
          expiresAt: null,
        });
      }
    }
  }

  // ── Upsell opportunity nudges (priority 4) ────────────────────────────────

  // Get tool categories from each client's active contract
  const { data: allBVTools } = await service
    .from("bundle_version_tools")
    .select("bundle_version_id, tools(category)")
    .limit(500);

  const versionCategories = new Map<string, Set<string>>();
  for (const bvt of allBVTools ?? []) {
    const tool = bvt.tools as unknown as { category: string } | null;
    if (!tool) continue;
    const set = versionCategories.get(bvt.bundle_version_id) ?? new Set();
    set.add(tool.category);
    versionCategories.set(bvt.bundle_version_id, set);
  }

  // Get all org tools to know what the MSP offers
  const { data: orgTools } = await service
    .from("tools")
    .select("category")
    .eq("org_id", orgId);

  const orgCategories = new Set((orgTools ?? []).map((t) => t.category));
  const BASELINE = ["edr", "backup", "identity", "email_security"];

  let upsellCount = 0;
  for (const contract of contracts ?? []) {
    if (upsellCount >= 3) break;
    const cats = versionCategories.get(contract.bundle_version_id ?? "") ?? new Set();
    const missing = BASELINE.filter((b) => orgCategories.has(b) && !cats.has(b));
    if (missing.length > 0) {
      const clientName = clientNameMap.get(contract.client_id) ?? "Client";
      const LABELS: Record<string, string> = {
        edr: "endpoint protection",
        backup: "backup & recovery",
        identity: "identity protection",
        email_security: "email security",
      };
      nudges.push({
        nudgeType: "upsell_opportunity",
        priority: 4,
        title: `${clientName} is missing ${LABELS[missing[0]] ?? missing[0]}`,
        body: `${missing.length} security gap${missing.length > 1 ? "s" : ""} in their current package. This is an upsell opportunity.`,
        entityType: "client",
        entityId: contract.client_id,
        entityName: clientName,
        ctaLabel: "View Client",
        ctaHref: `/clients/${contract.client_id}`,
        expiresAt: null,
      });
      upsellCount++;
    }
  }

  // ── Portfolio pattern nudges (priority 5) ──────────────────────────────────

  // Check if 3+ clients share the same gap
  const gapCounts = new Map<string, string[]>(); // category → client names
  for (const contract of contracts ?? []) {
    const cats = versionCategories.get(contract.bundle_version_id ?? "") ?? new Set();
    for (const base of BASELINE) {
      if (orgCategories.has(base) && !cats.has(base)) {
        const clientName = clientNameMap.get(contract.client_id) ?? "Client";
        const list = gapCounts.get(base) ?? [];
        list.push(clientName);
        gapCounts.set(base, list);
      }
    }
  }

  const PATTERN_LABELS: Record<string, string> = {
    edr: "endpoint protection",
    backup: "backup & recovery",
    identity: "identity protection",
    email_security: "email security",
  };

  for (const [category, clients] of gapCounts) {
    if (clients.length >= 3) {
      nudges.push({
        nudgeType: "portfolio_pattern",
        priority: 5,
        title: `${clients.length} clients have no ${PATTERN_LABELS[category] ?? category}`,
        body: `Cross-portfolio pattern detected. ${clients.slice(0, 3).join(", ")}${clients.length > 3 ? ` +${clients.length - 3} more` : ""} — potential bundled upsell opportunity.`,
        entityType: "portfolio",
        entityId: null,
        entityName: null,
        ctaLabel: "View Portfolio",
        ctaHref: "/portfolio-intelligence",
        expiresAt: null,
      });
    }
  }

  return nudges.sort((a, b) => a.priority - b.priority);
}
