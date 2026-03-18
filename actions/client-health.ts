"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getActiveOrgId } from "@/lib/org-context";
import {
  calculateHealthScore,
  type HealthScoreResult,
} from "@/lib/intelligence/health-score";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ClientHealthRecord {
  clientId: string;
  overallScore: number;
  stackScore: number;
  complianceScore: number;
  advisoryScore: number;
  commercialScore: number;
  stackGaps: string[];
  complianceGaps: string[];
  advisoryGaps: string[];
  commercialGaps: string[];
  previousScore: number | null;
  scoreDelta: number | null;
  grade: HealthScoreResult["grade"];
  color: HealthScoreResult["color"];
  calculatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireOrgId(): Promise<string> {
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No active org");
  return orgId;
}

function toRecord(
  row: Record<string, unknown>,
  clientId: string,
): ClientHealthRecord {
  const overall = (row.overall_score as number) ?? 0;
  return {
    clientId,
    overallScore: overall,
    stackScore: (row.stack_score as number) ?? 0,
    complianceScore: (row.compliance_score as number) ?? 0,
    advisoryScore: (row.advisory_score as number) ?? 0,
    commercialScore: (row.commercial_score as number) ?? 0,
    stackGaps: (row.stack_gaps as string[]) ?? [],
    complianceGaps: (row.compliance_gaps as string[]) ?? [],
    advisoryGaps: (row.advisory_gaps as string[]) ?? [],
    commercialGaps: (row.commercial_gaps as string[]) ?? [],
    previousScore: (row.previous_score as number) ?? null,
    scoreDelta: (row.score_delta as number) ?? null,
    grade:
      overall >= 80
        ? "A"
        : overall >= 65
          ? "B"
          : overall >= 50
            ? "C"
            : overall >= 35
              ? "D"
              : "F",
    color: overall >= 65 ? "green" : overall >= 40 ? "amber" : "red",
    calculatedAt: (row.calculated_at as string) ?? new Date().toISOString(),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function calculateAndSaveHealthScore(
  clientId: string,
): Promise<ClientHealthRecord> {
  const orgId = await requireOrgId();
  const service = createServiceClient();

  // 1. Get tool categories from active contracts → bundle_version_tools → tools
  const { data: contracts } = await service
    .from("client_contracts")
    .select("bundle_version_id, end_date, margin_pct, status")
    .eq("client_id", clientId)
    .eq("status", "active");

  const activeContracts = contracts ?? [];
  const versionIds = activeContracts.map((c) => c.bundle_version_id);

  let coveredCategories: string[] = [];
  let contractEndDate: Date | null = null;
  let marginPct: number | null = null;

  if (versionIds.length > 0) {
    const { data: bvTools } = await service
      .from("bundle_version_tools")
      .select("tools(category)")
      .in("bundle_version_id", versionIds);

    coveredCategories = [
      ...new Set(
        (bvTools ?? [])
          .map((t) => {
            const tool = t.tools as unknown as { category: string } | null;
            return tool?.category;
          })
          .filter(Boolean) as string[],
      ),
    ];

    // Soonest end date and worst margin
    for (const c of activeContracts) {
      const end = new Date(c.end_date);
      if (!contractEndDate || end < contractEndDate) contractEndDate = end;
      const m = Number(c.margin_pct);
      if (marginPct === null || m < marginPct) marginPct = m;
    }
  }

  // 2. Compliance scores
  const { data: compScores } = await service
    .from("client_compliance_scores")
    .select("score_pct")
    .eq("client_id", clientId)
    .eq("org_id", orgId);

  const complianceScorePcts = (compScores ?? []).map((s) =>
    Number(s.score_pct),
  );

  // 3. CTO briefs
  const { data: briefs } = await service
    .from("fractional_cto_briefs")
    .select("created_at")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastBriefDate =
    briefs && briefs.length > 0 ? new Date(briefs[0].created_at) : null;
  const { count: briefCount } = await service
    .from("fractional_cto_briefs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("client_id", clientId);

  // 4. Calculate score
  const result = calculateHealthScore({
    clientId,
    orgId,
    coveredCategories,
    complianceScorePcts,
    lastBriefDate,
    briefCount: briefCount ?? 0,
    hasActiveContract: activeContracts.length > 0,
    contractEndDate,
    marginPct,
  });

  // 5. Get previous score for delta
  const { data: existing } = await service
    .from("client_health_scores")
    .select("overall_score")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .single();

  const previousScore = existing?.overall_score ?? null;
  const scoreDelta =
    previousScore !== null ? result.overallScore - previousScore : null;

  // 6. Upsert
  const { data: saved } = await service
    .from("client_health_scores")
    .upsert(
      {
        org_id: orgId,
        client_id: clientId,
        stack_score: result.stackScore,
        compliance_score: result.complianceScore,
        advisory_score: result.advisoryScore,
        commercial_score: result.commercialScore,
        overall_score: result.overallScore,
        stack_gaps: result.stackGaps,
        compliance_gaps: result.complianceGaps,
        advisory_gaps: result.advisoryGaps,
        commercial_gaps: result.commercialGaps,
        previous_score: previousScore,
        score_delta: scoreDelta,
        calculated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,client_id" },
    )
    .select()
    .single();

  // 7. Log agent activity (fire-and-forget)
  import("@/lib/agents/log-activity").then(({ logAgentActivity }) => {
    logAgentActivity({
      orgId,
      agentId: "scout",
      activityType: "analysis",
      title: `Scout calculated health score: ${result.overallScore}/100 (${result.grade})`,
      entityType: "client",
      entityId: clientId,
    });
  });

  return toRecord(saved ?? {}, clientId);
}

export async function getClientHealthScore(
  clientId: string,
): Promise<ClientHealthRecord | null> {
  const orgId = await requireOrgId();
  const service = createServiceClient();

  const { data } = await service
    .from("client_health_scores")
    .select("*")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .single();

  if (!data) return null;
  return toRecord(data, clientId);
}

export async function getAllHealthScores(): Promise<
  Record<string, ClientHealthRecord>
> {
  const orgId = await requireOrgId();
  const service = createServiceClient();

  const { data } = await service
    .from("client_health_scores")
    .select("*")
    .eq("org_id", orgId);

  const map: Record<string, ClientHealthRecord> = {};
  for (const row of data ?? []) {
    map[row.client_id as string] = toRecord(row, row.client_id as string);
  }
  return map;
}

export async function recalculateAllHealthScores(): Promise<void> {
  const orgId = await requireOrgId();
  const service = createServiceClient();

  const { data: clients } = await service
    .from("clients")
    .select("id")
    .eq("org_id", orgId);

  if (!clients) return;

  // Calculate in parallel batches of 5
  const batch = 5;
  for (let i = 0; i < clients.length; i += batch) {
    await Promise.all(
      clients.slice(i, i + batch).map((c) =>
        calculateAndSaveHealthScore(c.id).catch(() => {
          // Individual failures shouldn't block the batch
        }),
      ),
    );
  }
}
