import { createClient } from "@/lib/supabase/server";
import type { ToolCategory, Tool } from "@/lib/types";
import {
  getFrameworkById,
  getAllControls,
  type ComplianceControl,
  type ComplianceFramework,
  type ToolDomain,
} from "@/lib/data/compliance-frameworks";

// ── Result types ─────────────────────────────────────────────────────────────

export interface ComplianceScore {
  frameworkId: string;
  frameworkName: string;
  controlsTotal: number;
  controlsSatisfied: number;
  controlsPartial: number;
  controlsGap: number;
  controlsManual: number;
  scorePct: number;
  scoreUnweightedPct: number;
  domainScores: DomainScore[];
  gaps: ComplianceGap[];
  suggestedServices: SuggestedService[];
}

export interface DomainScore {
  domain: string;
  domainCode: string;
  controlsTotal: number;
  controlsSatisfied: number;
  controlsPartial: number;
  controlsGap: number;
  controlsManual: number;
  scorePct: number;
}

export interface ComplianceGap {
  control: ComplianceControl;
  status: "satisfied" | "partial" | "gap" | "manual";
  requiredDomains: ToolDomain[];
  matchedDomains: ToolDomain[];
  missingDomains: ToolDomain[];
  matchedToolNames: string[];
}

export interface SuggestedService {
  bundleId: string;
  bundleName: string;
  outcomeStatement: string;
  status: string;
  hasPricingConfig: boolean;
  closesGaps: string[];
  gapCount: number;
  missingDomainsCovered: ToolDomain[];
}

// ── ToolCategory → ToolDomain mapping ────────────────────────────────────────
// Maps the DB enum values to the compliance framework domain labels.

const CATEGORY_TO_DOMAINS: Record<ToolCategory, ToolDomain[]> = {
  edr: ["EDR"],
  siem: ["SIEM"],
  email_security: ["Email Security"],
  identity: ["Identity"],
  backup: ["Backup"],
  vulnerability_management: ["Vulnerability Management"],
  dns_filtering: ["DNS", "Network"],
  mfa: ["Identity"],
  security_awareness_training: ["Training"],
  documentation: [],
  rmm: ["MDM", "EDR"],
  psa: [],
  network_monitoring: ["Network"],
  dark_web: [],
  mdr: ["MDR"],
  other: [],
};

function toolCategoryToDomains(category: ToolCategory): ToolDomain[] {
  return CATEGORY_TO_DOMAINS[category] ?? [];
}

// ── Control scoring ──────────────────────────────────────────────────────────

function scoreControl(
  control: ComplianceControl,
  clientDomains: Set<ToolDomain>,
  domainToTools: Record<string, string[]>
): ComplianceGap {
  if (control.requirementType === "manual") {
    return {
      control,
      status: "manual",
      requiredDomains: [],
      matchedDomains: [],
      missingDomains: [],
      matchedToolNames: [],
    };
  }

  const matchedDomains = control.toolDomains.filter((d) =>
    clientDomains.has(d)
  ) as ToolDomain[];
  const missingDomains = control.toolDomains.filter(
    (d) => !clientDomains.has(d)
  ) as ToolDomain[];
  const matchedToolNames = matchedDomains.flatMap(
    (d) => domainToTools[d] ?? []
  );

  let status: "satisfied" | "partial" | "gap";

  if (control.requirementType === "any") {
    status = matchedDomains.length > 0 ? "satisfied" : "gap";
  } else {
    // 'all'
    if (missingDomains.length === 0) {
      status = "satisfied";
    } else if (matchedDomains.length > 0) {
      status = "partial";
    } else {
      status = "gap";
    }
  }

  return {
    control,
    status,
    requiredDomains: control.toolDomains,
    matchedDomains,
    missingDomains,
    matchedToolNames,
  };
}

// ── Main scoring function ────────────────────────────────────────────────────

export async function scoreClientCompliance(
  clientId: string,
  frameworkId: string,
  orgId: string
): Promise<ComplianceScore> {
  const framework = getFrameworkById(frameworkId);
  if (!framework) throw new Error(`Unknown framework: ${frameworkId}`);

  const supabase = await createClient();

  // ── Step 1: Gather client's current tool coverage ──────────────────────

  // Get active contracts
  const { data: contracts } = await supabase
    .from("client_contracts")
    .select("bundle_version_id")
    .eq("client_id", clientId)
    .eq("status", "active");

  const versionIds = (contracts ?? []).map((c) => c.bundle_version_id);

  // Get tools from all active bundle versions
  const clientDomains = new Set<ToolDomain>();
  const domainToTools: Record<string, string[]> = {};

  if (versionIds.length > 0) {
    const { data: versionTools } = await supabase
      .from("bundle_version_tools")
      .select("tool_id")
      .in("bundle_version_id", versionIds);

    const toolIds = [
      ...new Set((versionTools ?? []).map((vt) => vt.tool_id)),
    ];

    if (toolIds.length > 0) {
      const { data: tools } = await supabase
        .from("tools")
        .select("name, category")
        .in("id", toolIds);

      for (const tool of tools ?? []) {
        const domains = toolCategoryToDomains(
          tool.category as ToolCategory
        );
        for (const domain of domains) {
          clientDomains.add(domain);
          if (!domainToTools[domain]) domainToTools[domain] = [];
          if (!domainToTools[domain].includes(tool.name)) {
            domainToTools[domain].push(tool.name);
          }
        }
      }
    }
  }

  // ── Step 2: Score each control ─────────────────────────────────────────

  const allControls = getAllControls(framework);
  const gaps: ComplianceGap[] = allControls.map((control) =>
    scoreControl(control, clientDomains, domainToTools)
  );

  // ── Step 3: Compute scores ─────────────────────────────────────────────

  const scorableGaps = gaps.filter((g) => g.status !== "manual");
  const totalWeight = scorableGaps.reduce(
    (sum, g) => sum + g.control.weight,
    0
  );

  const earnedWeight = scorableGaps.reduce((sum, g) => {
    if (g.status === "satisfied") return sum + g.control.weight;
    if (g.status === "partial") {
      const coverage =
        g.matchedDomains.length / g.requiredDomains.length;
      return sum + g.control.weight * coverage;
    }
    return sum;
  }, 0);

  const scorePct =
    totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 10000) / 100 : 0;

  const satisfied = scorableGaps.filter(
    (g) => g.status === "satisfied"
  ).length;
  const partial = scorableGaps.filter(
    (g) => g.status === "partial"
  ).length;
  const gapCount = scorableGaps.filter((g) => g.status === "gap").length;
  const manualCount = gaps.filter((g) => g.status === "manual").length;

  const scoreUnweightedPct =
    scorableGaps.length > 0
      ? Math.round(
          ((satisfied + partial * 0.5) / scorableGaps.length) * 10000
        ) / 100
      : 0;

  // ── Domain scores ──────────────────────────────────────────────────────

  const domainScores: DomainScore[] = framework.domains.map((domain) => {
    const domainGaps = gaps.filter(
      (g) => g.control.domainCode === domain.code
    );
    const domainScorable = domainGaps.filter(
      (g) => g.status !== "manual"
    );
    const dTotalWeight = domainScorable.reduce(
      (s, g) => s + g.control.weight,
      0
    );
    const dEarned = domainScorable.reduce((s, g) => {
      if (g.status === "satisfied") return s + g.control.weight;
      if (g.status === "partial") {
        const cov =
          g.matchedDomains.length / g.requiredDomains.length;
        return s + g.control.weight * cov;
      }
      return s;
    }, 0);
    const dPct =
      dTotalWeight > 0
        ? Math.round((dEarned / dTotalWeight) * 10000) / 100
        : 0;

    return {
      domain: domain.name,
      domainCode: domain.code,
      controlsTotal: domainScorable.length,
      controlsSatisfied: domainGaps.filter(
        (g) => g.status === "satisfied"
      ).length,
      controlsPartial: domainGaps.filter(
        (g) => g.status === "partial"
      ).length,
      controlsGap: domainGaps.filter((g) => g.status === "gap").length,
      controlsManual: domainGaps.filter(
        (g) => g.status === "manual"
      ).length,
      scorePct: dPct,
    };
  });

  // ── Step 4: Generate remediation suggestions ───────────────────────────

  const missingDomainSet = new Set<ToolDomain>();
  const gapControlIds: string[] = [];
  for (const g of gaps) {
    if (g.status === "gap" || g.status === "partial") {
      gapControlIds.push(g.control.id);
      for (const d of g.missingDomains) missingDomainSet.add(d);
    }
  }

  let suggestedServices: SuggestedService[] = [];

  if (gapControlIds.length > 0) {
    // Fetch active bundles with versions and tools
    const { data: bundles } = await supabase
      .from("bundles")
      .select("id, name, status")
      .eq("org_id", orgId)
      .eq("status", "active");

    if (bundles && bundles.length > 0) {
      const bundleIds = bundles.map((b) => b.id);

      // Check which bundles have pricing versions
      const { data: versions } = await supabase
        .from("bundle_versions")
        .select("bundle_id, id")
        .in("bundle_id", bundleIds);

      const bundlesWithPricing = new Set(
        (versions ?? []).map((v) => v.bundle_id)
      );
      const versionIdsByBundle = new Map<string, string[]>();
      for (const v of versions ?? []) {
        const ids = versionIdsByBundle.get(v.bundle_id) ?? [];
        ids.push(v.id);
        versionIdsByBundle.set(v.bundle_id, ids);
      }

      // Fetch outcomes for each bundle
      const { data: outcomes } = await supabase
        .from("service_outcomes")
        .select("bundle_id, outcome_statement")
        .in("bundle_id", bundleIds);

      const outcomeMap = new Map<string, string>();
      for (const o of outcomes ?? []) {
        outcomeMap.set(o.bundle_id, o.outcome_statement ?? "");
      }

      // Get all version tools
      const allVersionIds = Array.from(versionIdsByBundle.values()).flat();
      let bundleToolDomains: Map<string, Set<ToolDomain>> = new Map();

      if (allVersionIds.length > 0) {
        const { data: bvTools } = await supabase
          .from("bundle_version_tools")
          .select("bundle_version_id, tool_id")
          .in("bundle_version_id", allVersionIds);

        const bvToolIds = [
          ...new Set((bvTools ?? []).map((t) => t.tool_id)),
        ];

        if (bvToolIds.length > 0) {
          const { data: bvToolData } = await supabase
            .from("tools")
            .select("id, category")
            .in("id", bvToolIds);

          const toolCatMap = new Map<string, ToolCategory>();
          for (const t of bvToolData ?? []) {
            toolCatMap.set(t.id, t.category as ToolCategory);
          }

          // Map version_id → bundle_id
          const versionToBundleId = new Map<string, string>();
          for (const [bundleId, vIds] of versionIdsByBundle) {
            for (const vId of vIds)
              versionToBundleId.set(vId, bundleId);
          }

          for (const bvt of bvTools ?? []) {
            const bundleId = versionToBundleId.get(
              bvt.bundle_version_id
            );
            if (!bundleId) continue;
            const cat = toolCatMap.get(bvt.tool_id);
            if (!cat) continue;
            const domains = toolCategoryToDomains(cat);
            if (!bundleToolDomains.has(bundleId)) {
              bundleToolDomains.set(bundleId, new Set());
            }
            for (const d of domains)
              bundleToolDomains.get(bundleId)!.add(d);
          }
        }
      }

      // Score each bundle's gap-closing potential
      const candidates: SuggestedService[] = [];

      for (const bundle of bundles) {
        const serviceDomains = bundleToolDomains.get(bundle.id);
        if (!serviceDomains || serviceDomains.size === 0) continue;

        // Which missing domains does this service cover?
        const covered: ToolDomain[] = [];
        for (const d of missingDomainSet) {
          if (serviceDomains.has(d)) covered.push(d);
        }
        if (covered.length === 0) continue;

        // Which gap controls would this close?
        const closesGaps: string[] = [];
        for (const g of gaps) {
          if (g.status !== "gap" && g.status !== "partial") continue;
          const wouldFix = g.missingDomains.some((d) =>
            serviceDomains.has(d)
          );
          if (wouldFix) closesGaps.push(g.control.id);
        }

        candidates.push({
          bundleId: bundle.id,
          bundleName: bundle.name,
          outcomeStatement: outcomeMap.get(bundle.id) ?? "",
          status: bundle.status,
          hasPricingConfig: bundlesWithPricing.has(bundle.id),
          closesGaps,
          gapCount: closesGaps.length,
          missingDomainsCovered: covered,
        });
      }

      // Sort: gapCount desc, then hasPricingConfig, then covered domains
      candidates.sort((a, b) => {
        if (b.gapCount !== a.gapCount) return b.gapCount - a.gapCount;
        if (a.hasPricingConfig !== b.hasPricingConfig)
          return a.hasPricingConfig ? -1 : 1;
        return (
          b.missingDomainsCovered.length - a.missingDomainsCovered.length
        );
      });

      suggestedServices = candidates.slice(0, 5);
    }
  }

  // ── Step 5: Persist results ────────────────────────────────────────────

  const score: ComplianceScore = {
    frameworkId,
    frameworkName: framework.name,
    controlsTotal: scorableGaps.length,
    controlsSatisfied: satisfied,
    controlsPartial: partial,
    controlsGap: gapCount,
    controlsManual: manualCount,
    scorePct,
    scoreUnweightedPct,
    domainScores,
    gaps,
    suggestedServices,
  };

  await supabase.from("client_compliance_scores").upsert(
    {
      client_id: clientId,
      org_id: orgId,
      framework_id: frameworkId,
      controls_total: score.controlsTotal,
      controls_satisfied: score.controlsSatisfied,
      controls_partial: score.controlsPartial,
      controls_gap: score.controlsGap,
      controls_manual: score.controlsManual,
      score_pct: score.scorePct,
      score_unweighted_pct: score.scoreUnweightedPct,
      domain_scores: score.domainScores,
      gap_details: score.gaps,
      suggested_services: score.suggestedServices,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "client_id,framework_id" }
  );

  return score;
}
