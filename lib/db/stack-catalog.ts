import { createClient } from "@/lib/supabase/server";
import type { Tool, ToolCategory } from "@/lib/types";

// ── Security domain mapping ──────────────────────────────────────────────────

export interface SecurityDomain {
  key: string;
  label: string;
  categories: ToolCategory[];
}

export const SECURITY_DOMAINS: SecurityDomain[] = [
  { key: "identity", label: "Identity & Access", categories: ["identity", "mfa"] },
  { key: "endpoint", label: "Endpoint Protection", categories: ["edr"] },
  { key: "network", label: "Network Security", categories: ["dns_filtering", "network_monitoring"] },
  { key: "email", label: "Email Security", categories: ["email_security"] },
  { key: "data", label: "Data Protection", categories: ["backup"] },
  { key: "soc", label: "SOC / SIEM", categories: ["siem"] },
  { key: "vuln", label: "Vulnerability Mgmt", categories: ["vulnerability_management"] },
  { key: "compliance", label: "Compliance & Training", categories: ["security_awareness_training", "documentation"] },
  { key: "operations", label: "IT Operations", categories: ["rmm", "psa"] },
];

// ── Tool with service assignment info ────────────────────────────────────────

export interface ToolServiceAssignment {
  bundle_id: string;
  bundle_name: string;
  capability_name: string | null;
}

export interface ToolWithAssignments extends Tool {
  services: ToolServiceAssignment[];
}

// ── Coverage & redundancy types ──────────────────────────────────────────────

export interface DomainCoverage {
  domain: SecurityDomain;
  tools: ToolWithAssignments[];
  covered: boolean;
  toolCount: number;
}

export interface RedundancyFlag {
  tool_ids: string[];
  tool_names: string[];
  domain: string;
  message: string;
}

// ── Data fetching ────────────────────────────────────────────────────────────

export async function getToolsWithServiceAssignments(
  orgId: string
): Promise<ToolWithAssignments[]> {
  const supabase = await createClient();

  // 1. Get all tools for the org
  const { data: tools, error: toolsError } = await supabase
    .from("tools")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (toolsError) throw toolsError;
  if (!tools || tools.length === 0) return [];

  const toolIds = tools.map((t) => t.id);

  // 2. Get service assignments via bundle_version_tools → bundle_versions → bundles
  const { data: versionTools, error: vtError } = await supabase
    .from("bundle_version_tools")
    .select("tool_id, bundle_version_id")
    .in("tool_id", toolIds);

  if (vtError) throw vtError;

  // Get unique version IDs to resolve bundle names
  const versionIds = [
    ...new Set((versionTools ?? []).map((vt) => vt.bundle_version_id)),
  ];

  // Map version_id → bundle info
  const versionToBundleMap = new Map<
    string,
    { bundle_id: string; bundle_name: string }
  >();

  if (versionIds.length > 0) {
    const { data: versions, error: vError } = await supabase
      .from("bundle_versions")
      .select("id, bundle_id")
      .in("id", versionIds);

    if (vError) throw vError;

    const bundleIds = [
      ...new Set((versions ?? []).map((v) => v.bundle_id)),
    ];

    if (bundleIds.length > 0) {
      const { data: bundles, error: bError } = await supabase
        .from("bundles")
        .select("id, name")
        .in("id", bundleIds);

      if (bError) throw bError;

      const bundleNameMap = new Map(
        (bundles ?? []).map((b) => [b.id, b.name])
      );

      for (const v of versions ?? []) {
        versionToBundleMap.set(v.id, {
          bundle_id: v.bundle_id,
          bundle_name: bundleNameMap.get(v.bundle_id) ?? "Unknown",
        });
      }
    }
  }

  // 3. Get capability-level assignments from service_outcomes
  const { data: outcomes, error: oError } = await supabase
    .from("service_outcomes")
    .select("bundle_id, service_capabilities")
    .eq("org_id", orgId);

  if (oError) throw oError;

  // Build tool → capability assignment map
  const toolCapabilityMap = new Map<
    string,
    { bundle_id: string; capability_name: string }[]
  >();

  for (const outcome of outcomes ?? []) {
    const capabilities = outcome.service_capabilities as
      | { name: string; met_by_tools: string[] }[]
      | null;
    if (!capabilities) continue;
    for (const cap of capabilities) {
      for (const toolId of cap.met_by_tools ?? []) {
        const existing = toolCapabilityMap.get(toolId) ?? [];
        existing.push({
          bundle_id: outcome.bundle_id,
          capability_name: cap.name,
        });
        toolCapabilityMap.set(toolId, existing);
      }
    }
  }

  // 4. Build tool → service assignments (deduplicated by bundle_id)
  const toolServiceMap = new Map<string, Map<string, ToolServiceAssignment>>();

  for (const vt of versionTools ?? []) {
    const bundleInfo = versionToBundleMap.get(vt.bundle_version_id);
    if (!bundleInfo) continue;

    if (!toolServiceMap.has(vt.tool_id)) {
      toolServiceMap.set(vt.tool_id, new Map());
    }
    const map = toolServiceMap.get(vt.tool_id)!;
    if (!map.has(bundleInfo.bundle_id)) {
      map.set(bundleInfo.bundle_id, {
        bundle_id: bundleInfo.bundle_id,
        bundle_name: bundleInfo.bundle_name,
        capability_name: null,
      });
    }
  }

  // Merge capability-level assignments
  for (const [toolId, capAssignments] of toolCapabilityMap) {
    if (!toolServiceMap.has(toolId)) {
      toolServiceMap.set(toolId, new Map());
    }
    const map = toolServiceMap.get(toolId)!;
    for (const ca of capAssignments) {
      // Enrich existing assignment or add new
      const existing = map.get(ca.bundle_id);
      if (existing) {
        existing.capability_name = ca.capability_name;
      }
      // If we don't have a bundle_name for this, skip
    }
  }

  // 5. Combine into final array
  return (tools as Tool[]).map((tool) => ({
    ...tool,
    services: Array.from(toolServiceMap.get(tool.id)?.values() ?? []),
  }));
}

// ── Coverage calculation ─────────────────────────────────────────────────────

export function calculateCoverage(
  tools: ToolWithAssignments[]
): DomainCoverage[] {
  const activeTools = tools.filter((t) => t.is_active);

  return SECURITY_DOMAINS.map((domain) => {
    const domainTools = activeTools.filter((t) =>
      domain.categories.includes(t.category)
    );
    return {
      domain,
      tools: domainTools,
      covered: domainTools.length > 0,
      toolCount: domainTools.length,
    };
  });
}

export function calculateCoverageScore(coverage: DomainCoverage[]): number {
  const covered = coverage.filter((c) => c.covered).length;
  return Math.round((covered / coverage.length) * 100);
}

// ── Redundancy detection ─────────────────────────────────────────────────────

export function detectRedundancies(
  tools: ToolWithAssignments[]
): RedundancyFlag[] {
  const flags: RedundancyFlag[] = [];
  const activeTools = tools.filter((t) => t.is_active);

  for (const domain of SECURITY_DOMAINS) {
    const domainTools = activeTools.filter((t) =>
      domain.categories.includes(t.category)
    );

    if (domainTools.length < 2) continue;

    // Check for multiple tools from same category within the domain
    const byCategory = new Map<ToolCategory, ToolWithAssignments[]>();
    for (const tool of domainTools) {
      const list = byCategory.get(tool.category) ?? [];
      list.push(tool);
      byCategory.set(tool.category, list);
    }

    for (const [, catTools] of byCategory) {
      if (catTools.length < 2) continue;

      // Check if they serve the same service
      const sharedServices = new Set<string>();
      for (const tool of catTools) {
        for (const svc of tool.services) {
          if (
            catTools.some(
              (other) =>
                other.id !== tool.id &&
                other.services.some((s) => s.bundle_id === svc.bundle_id)
            )
          ) {
            sharedServices.add(svc.bundle_name);
          }
        }
      }

      if (sharedServices.size > 0) {
        flags.push({
          tool_ids: catTools.map((t) => t.id),
          tool_names: catTools.map((t) => t.name),
          domain: domain.label,
          message: `${catTools.map((t) => t.name).join(" & ")} both serve ${[...sharedServices].join(", ")} in ${domain.label}`,
        });
      } else if (catTools.length >= 2) {
        flags.push({
          tool_ids: catTools.map((t) => t.id),
          tool_names: catTools.map((t) => t.name),
          domain: domain.label,
          message: `${catTools.map((t) => t.name).join(" & ")} overlap in ${domain.label} — consider consolidating`,
        });
      }
    }
  }

  return flags;
}

// ── Gap details ──────────────────────────────────────────────────────────────

export interface CoverageGap {
  domain: string;
  categories: ToolCategory[];
  recommendation: string;
}

const GAP_RECOMMENDATIONS: Record<string, string> = {
  identity: "Add an identity provider (IdP) or MFA solution to secure user access",
  endpoint: "Deploy EDR to monitor and protect endpoints from threats",
  network: "Add DNS filtering or network monitoring for visibility into traffic",
  email: "Implement email security to protect against phishing and spam",
  data: "Set up backup and recovery to protect against data loss",
  soc: "Deploy a SIEM for centralized log management and threat detection",
  vuln: "Add vulnerability scanning to identify and remediate security gaps",
  compliance: "Implement security awareness training and documentation tools",
  operations: "Add RMM/PSA tools for IT service management and monitoring",
};

export function getGapDetails(coverage: DomainCoverage[]): CoverageGap[] {
  return coverage
    .filter((c) => !c.covered)
    .map((c) => ({
      domain: c.domain.label,
      categories: c.domain.categories,
      recommendation: GAP_RECOMMENDATIONS[c.domain.key] ?? "Add tools to cover this domain",
    }));
}
