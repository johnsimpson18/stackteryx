import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard" };
import { getActiveOrgId } from "@/lib/org-context";
import { getOnboardingProfile, getOrgSettings } from "@/lib/db/org-settings";
import { getBundles, getInProgressBundle } from "@/lib/db/bundles";
import { getClients } from "@/lib/db/clients";
import { getTools } from "@/lib/db/tools";
import { getOrgVendors } from "@/lib/db/vendors";
import { getOrgActionCards } from "@/lib/db/action-cards";
import { getAllServiceCompleteness } from "@/lib/db/service-completeness";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type { ToolCategory } from "@/lib/types";

export default async function DashboardPage() {
  const orgId = await getActiveOrgId();

  if (orgId) {
    try {
      const onbProfile = await getOnboardingProfile(orgId);
      if (onbProfile && !onbProfile.onboarding_complete) {
        redirect("/onboarding");
      }
    } catch {
      // No settings row — let the user through
    }
  }

  // ── Parallel data fetches ─────────────────────────────────────────────────

  const [
    bundlesResult,
    clientsResult,
    toolsResult,
    vendorsResult,
    actionCardsResult,
    completenessResult,
    inProgressResult,
    settingsResult,
    proposalCountResult,
  ] = await Promise.allSettled([
    getBundles(orgId ?? undefined),
    getClients(orgId ?? undefined),
    getTools(orgId ?? undefined, { is_active: true }),
    orgId ? getOrgVendors(orgId) : Promise.resolve([]),
    orgId ? getOrgActionCards(orgId) : Promise.resolve([]),
    orgId ? getAllServiceCompleteness(orgId) : Promise.resolve([]),
    orgId ? getInProgressBundle(orgId) : Promise.resolve(null),
    orgId ? getOrgSettings(orgId) : Promise.resolve(null),
    getProposalCount(orgId),
  ]);

  const bundles = bundlesResult.status === "fulfilled" ? bundlesResult.value : [];
  const clients = clientsResult.status === "fulfilled" ? clientsResult.value : [];
  const tools = toolsResult.status === "fulfilled" ? toolsResult.value : [];
  const vendors = vendorsResult.status === "fulfilled" ? vendorsResult.value : [];
  const actionCards = actionCardsResult.status === "fulfilled" ? actionCardsResult.value : [];
  const completeness = completenessResult.status === "fulfilled" ? completenessResult.value : [];
  const inProgressBundle = inProgressResult.status === "fulfilled" ? inProgressResult.value : null;
  const settings = settingsResult.status === "fulfilled" ? settingsResult.value : null;
  const proposalCount = proposalCountResult.status === "fulfilled" ? proposalCountResult.value : 0;

  // ── Compute stat card values ──────────────────────────────────────────────

  const activeServices = bundles.filter((b) => b.status === "active").length;

  // Portfolio MRR: sum of latest computed_mrr for all active bundles
  const portfolioMrr = bundles
    .filter((b) => b.status === "active" && b.latest_mrr !== null)
    .reduce((sum, b) => sum + (b.latest_mrr ?? 0), 0);

  // Avg margin across active pricing configs
  const activeMargins = bundles
    .filter((b) => b.status === "active" && b.latest_margin !== null)
    .map((b) => b.latest_margin as number);
  const avgMargin =
    activeMargins.length > 0
      ? activeMargins.reduce((sum, m) => sum + m, 0) / activeMargins.length
      : null;

  // Active clients: those with at least one active contract
  const activeClients = clients.filter((c) => c.active_contract !== null).length;

  // Portfolio coverage: distinct outcome_types across active services
  let outcomeTypeCoverage = 0;
  if (orgId) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("service_outcomes")
        .select("outcome_type")
        .eq("org_id", orgId);
      if (data) {
        const types = new Set(
          data
            .map((d) => d.outcome_type as string)
            .filter((t) => ["compliance", "efficiency", "security", "growth"].includes(t))
        );
        outcomeTypeCoverage = types.size;
      }
    } catch {
      // Degrade gracefully
    }
  }

  // Services needing attention: layers_complete < 3
  const servicesNeedingAttention = completeness.filter(
    (c) => c.layers_complete < 3
  ).length;

  // Tool category coverage for Portfolio Coverage section
  const toolsByCategory: Record<string, number> = {};
  for (const tool of tools) {
    const cat = tool.category as ToolCategory;
    toolsByCategory[cat] = (toolsByCategory[cat] ?? 0) + 1;
  }

  // ── Onboarding checklist ──────────────────────────────────────────────────

  const checklistSteps = {
    hasVendors: vendors.length > 0,
    hasServices: bundles.length > 0,
    hasProposals: proposalCount > 0,
    hasClients: clients.length > 0,
  };
  const allChecklistComplete =
    checklistSteps.hasVendors &&
    checklistSteps.hasServices &&
    checklistSteps.hasProposals &&
    checklistSteps.hasClients;

  const defaultTargetMargin = settings ? Number(settings.default_target_margin_pct) : 0.35;

  return (
    <DashboardClient
      checklist={allChecklistComplete ? null : checklistSteps}
      actionCards={actionCards}
      stats={{
        activeServices,
        portfolioMrr,
        avgMargin,
        activeClients,
        outcomeTypeCoverage,
        servicesNeedingAttention,
      }}
      bundles={bundles}
      completeness={completeness}
      toolsByCategory={toolsByCategory}
      inProgressBundle={
        inProgressBundle
          ? { id: inProgressBundle.id, name: inProgressBundle.name, updatedAt: inProgressBundle.updated_at }
          : null
      }
      defaultTargetMargin={defaultTargetMargin}
    />
  );
}

// ── Helper: proposal count ──────────────────────────────────────────────────

async function getProposalCount(orgId: string | null): Promise<number> {
  if (!orgId) return 0;
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
