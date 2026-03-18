// ── Intelligence Signal Engine ────────────────────────────────────────────────
//
// Computes org-level patterns from usage data. Fully deterministic — no AI.

import { createServiceClient } from "@/lib/supabase/service";

export interface OrgSignals {
  topToolCategories: { name: string; count: number }[];
  avgServiceMargin: { current: number; trend: "improving" | "declining" | "stable" };
  complianceDistribution: { topFramework: string; [key: string]: string | number };
  advisoryEngagementRate: { rate: number; clientsWithBrief: number; totalClients: number };
  topPerformingService: { serviceId: string; name: string; margin: number; mrr: number } | null;
  commonToolCombinations: [string, string][];
}

export async function computeOrgSignals(orgId: string): Promise<void> {
  const service = createServiceClient();

  // ── Top tool categories ─────────────────────────────────────────────────

  const { data: activeBundles } = await service
    .from("bundles")
    .select("id")
    .eq("org_id", orgId)
    .eq("status", "active");

  const bundleIds = (activeBundles ?? []).map((b) => b.id);

  const categoryCounts = new Map<string, number>();
  const serviceCategories = new Map<string, Set<string>>(); // bundleId → categories

  if (bundleIds.length > 0) {
    const { data: versions } = await service
      .from("bundle_versions")
      .select("id, bundle_id")
      .in("bundle_id", bundleIds)
      .order("created_at", { ascending: false });

    // Latest version per bundle
    const latestVersions = new Map<string, string>();
    for (const v of versions ?? []) {
      if (!latestVersions.has(v.bundle_id)) {
        latestVersions.set(v.bundle_id, v.id);
      }
    }

    const versionIds = [...latestVersions.values()];

    if (versionIds.length > 0) {
      const { data: bvTools } = await service
        .from("bundle_version_tools")
        .select("bundle_version_id, tools(category)")
        .in("bundle_version_id", versionIds);

      // Reverse map: versionId → bundleId
      const versionToBundleId = new Map<string, string>();
      for (const [bId, vId] of latestVersions) {
        versionToBundleId.set(vId, bId);
      }

      for (const bvt of bvTools ?? []) {
        const tool = bvt.tools as unknown as { category: string } | null;
        if (!tool) continue;
        const cat = tool.category;
        categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);

        const bundleId = versionToBundleId.get(bvt.bundle_version_id);
        if (bundleId) {
          const set = serviceCategories.get(bundleId) ?? new Set();
          set.add(cat);
          serviceCategories.set(bundleId, set);
        }
      }
    }
  }

  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  await upsertSignal(service, orgId, "usage_pattern", "top_tool_categories", "all_time", {
    categories: topCategories,
  });

  // ── Average service margin ──────────────────────────────────────────────

  const { data: bundleVersions } = await service
    .from("bundle_versions")
    .select("margin_pct, bundle_id")
    .in("bundle_id", bundleIds)
    .order("created_at", { ascending: false });

  // Latest version margin per bundle
  const seenBundles = new Set<string>();
  const margins: number[] = [];
  for (const v of bundleVersions ?? []) {
    if (!seenBundles.has(v.bundle_id)) {
      seenBundles.add(v.bundle_id);
      margins.push(Number(v.margin_pct));
    }
  }

  const avgMargin = margins.length > 0
    ? Math.round((margins.reduce((s, m) => s + m, 0) / margins.length) * 100)
    : 0;

  // Get previous margin signal for trend
  const { data: prevMargin } = await service
    .from("intelligence_signals")
    .select("signal_value")
    .eq("org_id", orgId)
    .eq("signal_key", "avg_service_margin")
    .eq("period", "all_time")
    .single();

  const prevValue = prevMargin?.signal_value
    ? (prevMargin.signal_value as { current?: number }).current ?? avgMargin
    : avgMargin;
  const trend = avgMargin > prevValue + 2 ? "improving" : avgMargin < prevValue - 2 ? "declining" : "stable";

  await upsertSignal(service, orgId, "margin_benchmark", "avg_service_margin", "all_time", {
    current: avgMargin,
    trend,
  });

  // ── Compliance framework distribution ───────────────────────────────────

  const { data: compScores } = await service
    .from("client_compliance_scores")
    .select("framework_id, client_id")
    .eq("org_id", orgId);

  const frameworkCounts: Record<string, number> = {};
  const clientSet = new Set<string>();
  for (const s of compScores ?? []) {
    frameworkCounts[s.framework_id] = (frameworkCounts[s.framework_id] ?? 0) + 1;
    clientSet.add(s.client_id);
  }

  const FRAMEWORK_LABELS: Record<string, string> = {
    hipaa: "HIPAA",
    "pci-dss": "PCI DSS",
    "cmmc-l2": "CMMC",
  };

  const topFramework = Object.entries(frameworkCounts).sort((a, b) => b[1] - a[1])[0];

  await upsertSignal(service, orgId, "compliance_focus", "compliance_distribution", "all_time", {
    ...Object.fromEntries(
      Object.entries(frameworkCounts).map(([k, v]) => [FRAMEWORK_LABELS[k] ?? k, v]),
    ),
    topFramework: topFramework ? (FRAMEWORK_LABELS[topFramework[0]] ?? topFramework[0]) : "None",
    total_clients: clientSet.size,
  });

  // ── Advisory engagement rate ────────────────────────────────────────────

  const { data: clients } = await service
    .from("clients")
    .select("id")
    .eq("org_id", orgId)
    .eq("status", "active");

  const totalClients = clients?.length ?? 0;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentBriefs } = await service
    .from("fractional_cto_briefs")
    .select("client_id")
    .eq("org_id", orgId)
    .not("client_id", "is", null)
    .gte("created_at", ninetyDaysAgo);

  const clientsWithBrief = new Set((recentBriefs ?? []).map((b) => b.client_id)).size;
  const rate = totalClients > 0 ? Math.round((clientsWithBrief / totalClients) * 100) / 100 : 0;

  await upsertSignal(service, orgId, "advisory_cadence", "advisory_engagement_rate", "all_time", {
    rate,
    clientsWithBrief,
    totalClients,
  });

  // ── Top performing service ──────────────────────────────────────────────

  const { data: allBundles } = await service
    .from("bundles")
    .select("id, name")
    .eq("org_id", orgId)
    .eq("status", "active");

  let topService: { serviceId: string; name: string; margin: number; mrr: number } | null = null;

  for (const bundle of allBundles ?? []) {
    const { data: contracts } = await service
      .from("client_contracts")
      .select("monthly_revenue, margin_pct")
      .eq("bundle_id", bundle.id)
      .eq("status", "active");

    const totalMrr = (contracts ?? []).reduce((s, c) => s + Number(c.monthly_revenue), 0);
    const avgM = contracts && contracts.length > 0
      ? (contracts.reduce((s, c) => s + Number(c.margin_pct), 0) / contracts.length) * 100
      : 0;
    const score = totalMrr * (avgM / 100);

    if (!topService || score > topService.mrr * (topService.margin / 100)) {
      topService = {
        serviceId: bundle.id,
        name: bundle.name,
        margin: Math.round(avgM),
        mrr: Math.round(totalMrr),
      };
    }
  }

  if (topService) {
    await upsertSignal(service, orgId, "portfolio_benchmark", "top_performing_service", "all_time", topService);
  }

  // ── Tool combination affinity ───────────────────────────────────────────

  const pairCounts = new Map<string, number>();
  for (const cats of serviceCategories.values()) {
    const catArray = [...cats].sort();
    for (let i = 0; i < catArray.length; i++) {
      for (let j = i + 1; j < catArray.length; j++) {
        const key = `${catArray[i]}:${catArray[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const topPairs = [...pairCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key]) => key.split(":") as [string, string]);

  await upsertSignal(service, orgId, "tool_affinity", "common_tool_combinations", "all_time", {
    pairs: topPairs,
  });
}

export async function getOrgSignals(orgId: string): Promise<OrgSignals | null> {
  const service = createServiceClient();

  const { data } = await service
    .from("intelligence_signals")
    .select("signal_key, signal_value")
    .eq("org_id", orgId)
    .eq("period", "all_time");

  if (!data || data.length === 0) return null;

  const signalMap = new Map(data.map((s) => [s.signal_key, s.signal_value as Record<string, unknown>]));

  const topCats = signalMap.get("top_tool_categories");
  const margin = signalMap.get("avg_service_margin");
  const compliance = signalMap.get("compliance_distribution");
  const advisory = signalMap.get("advisory_engagement_rate");
  const topSvc = signalMap.get("top_performing_service");
  const combos = signalMap.get("common_tool_combinations");

  return {
    topToolCategories: (topCats?.categories as { name: string; count: number }[]) ?? [],
    avgServiceMargin: {
      current: (margin?.current as number) ?? 0,
      trend: (margin?.trend as "improving" | "declining" | "stable") ?? "stable",
    },
    complianceDistribution: {
      topFramework: (compliance?.topFramework as string) ?? "None",
      ...(compliance as Record<string, number>),
    },
    advisoryEngagementRate: {
      rate: (advisory?.rate as number) ?? 0,
      clientsWithBrief: (advisory?.clientsWithBrief as number) ?? 0,
      totalClients: (advisory?.totalClients as number) ?? 0,
    },
    topPerformingService: topSvc
      ? {
          serviceId: topSvc.serviceId as string,
          name: topSvc.name as string,
          margin: topSvc.margin as number,
          mrr: topSvc.mrr as number,
        }
      : null,
    commonToolCombinations: (combos?.pairs as [string, string][]) ?? [],
  };
}

// ── Internal ─────────────────────────────────────────────────────────────────

async function upsertSignal(
  service: ReturnType<typeof createServiceClient>,
  orgId: string,
  signalType: string,
  signalKey: string,
  period: string,
  value: Record<string, unknown>,
) {
  await service.from("intelligence_signals").upsert(
    {
      org_id: orgId,
      signal_type: signalType,
      signal_key: signalKey,
      period,
      signal_value: value,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,signal_type,signal_key,period" },
  );
}
