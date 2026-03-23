import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard" };

import { getActiveOrgId } from "@/lib/org-context";
import { getOnboardingProfile, getOrgSettings } from "@/lib/db/org-settings";
import { getBundles } from "@/lib/db/bundles";
import { getClients } from "@/lib/db/clients";
import { getOrgVendors } from "@/lib/db/vendors";
import { getAllServiceCompleteness } from "@/lib/db/service-completeness";
import { getStaleVersionsByOrgId } from "@/lib/db/bundle-versions";
import { getPricingHealthSummary } from "@/lib/db/dashboard";
import { getProposals } from "@/lib/db/proposals";
import { getOrgById } from "@/lib/db/orgs";
import { getCurrentProfile } from "@/lib/db/profiles";
import { createClient } from "@/lib/supabase/server";
import { getAgentActivities } from "@/lib/agents/log-activity";
import { getActiveNudges, type ScoutNudgeRecord } from "@/actions/scout-nudges";
import { getOrgSignals, type OrgSignals } from "@/lib/intelligence/signal-engine";
import { getLatestHorizonDigest } from "@/actions/horizon";
import { assembleChatContext, type ChatContext } from "@/lib/intelligence/chat-context";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getCurrentAssessment, checkPracticeChanged } from "@/actions/practice-assessment";
import type { AttentionItem } from "@/components/dashboard/attention-feed";

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

  // ── Phase 1: Parallel data fetches ──────────────────────────────────────

  const [
    bundlesResult,
    clientsResult,
    vendorsResult,
    completenessResult,
    settingsResult,
    staleVersionsResult,
    proposalsResult,
    ctoBriefCountResult,
    orgResult,
    profileResult,
    activitiesResult,
  ] = await Promise.allSettled([
    getBundles(orgId ?? undefined),
    getClients(orgId ?? undefined),
    orgId ? getOrgVendors(orgId) : Promise.resolve([]),
    orgId ? getAllServiceCompleteness(orgId) : Promise.resolve([]),
    orgId ? getOrgSettings(orgId) : Promise.resolve(null),
    orgId ? getStaleVersionsByOrgId(orgId) : Promise.resolve([]),
    orgId ? getProposals(orgId) : Promise.resolve([]),
    getCTOBriefCount(orgId),
    orgId ? getOrgById(orgId) : Promise.resolve(null),
    getCurrentProfile(),
    orgId ? getAgentActivities(orgId, 5) : Promise.resolve([]),
  ]);

  const bundles =
    bundlesResult.status === "fulfilled" ? bundlesResult.value : [];
  const clients =
    clientsResult.status === "fulfilled" ? clientsResult.value : [];
  const vendors =
    vendorsResult.status === "fulfilled" ? vendorsResult.value : [];
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
  const ctoBriefCount =
    ctoBriefCountResult.status === "fulfilled"
      ? ctoBriefCountResult.value
      : 0;
  const org =
    orgResult.status === "fulfilled" ? orgResult.value : null;
  const profile =
    profileResult.status === "fulfilled" ? profileResult.value : null;
  const recentActivities =
    activitiesResult.status === "fulfilled" ? activitiesResult.value : [];

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

  // ── Compute derived values ──────────────────────────────────────────────

  const activeServices = bundles.filter((b) => b.status === "active").length;

  const portfolioMrr = bundles
    .filter((b) => b.status === "active" && b.latest_mrr !== null)
    .reduce((sum, b) => sum + (b.latest_mrr ?? 0), 0);

  const activeMargins = bundles
    .filter((b) => b.status === "active" && b.latest_margin !== null)
    .map((b) => b.latest_margin as number);
  const avgMargin =
    activeMargins.length > 0
      ? activeMargins.reduce((sum, m) => sum + m, 0) / activeMargins.length
      : null;

  const activeClients = clients.filter(
    (c) => c.active_contract !== null,
  ).length;

  const defaultTargetMargin = settings
    ? Number(settings.default_target_margin_pct)
    : 0.35;

  // ── MRR by service ─────────────────────────────────────────────────────

  const mrrByService = bundles
    .filter(
      (b) => b.status === "active" && b.latest_mrr != null && b.latest_mrr > 0,
    )
    .sort((a, b) => (b.latest_mrr ?? 0) - (a.latest_mrr ?? 0))
    .map((b) => ({
      serviceId: b.id,
      serviceName: b.name,
      mrr: b.latest_mrr ?? 0,
      margin: b.latest_margin ?? 0,
    }));

  // ── Renewals (contracts ending within 90 days) ──────────────────────────

  const now = new Date();
  const in90Days = new Date();
  in90Days.setDate(now.getDate() + 90);

  const renewals = clients
    .filter((c) => c.active_contract?.end_date)
    .filter((c) => {
      const end = new Date(c.active_contract!.end_date);
      return end >= now && end <= in90Days;
    })
    .map((c) => ({
      clientId: c.id,
      clientName: c.name,
      endDate: c.active_contract!.end_date,
      contractValue: c.active_contract!.monthly_revenue
        ? Number(c.active_contract!.monthly_revenue)
        : undefined,
    }))
    .sort(
      (a, b) =>
        new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
    );

  // ── Proposal stats ─────────────────────────────────────────────────────

  const proposalStats = {
    total: proposals.length,
    drafts: proposals.filter((p) => p.status === "draft").length,
    sent: proposals.filter((p) => p.status === "sent").length,
  };

  // ── Attention items (assembled server-side) ─────────────────────────────

  const attentionItems: AttentionItem[] = [];
  const stalePricingCount = staleVersions.length;

  if (stalePricingCount > 0) {
    attentionItems.push({
      id: "stale-pricing",
      severity: "warning",
      title: `${stalePricingCount} service${stalePricingCount !== 1 ? "s have" : " has"} stale pricing`,
      description:
        "Tool costs have changed since prices were last calculated.",
      cta: { label: "Review", href: "/services?filter=stale" },
      category: "pricing",
    });
  }

  if (pricingHealth?.topRisks) {
    for (const risk of pricingHealth.topRisks) {
      if (risk.currentMargin < 0.1) {
        attentionItems.push({
          id: `margin-critical-${risk.bundleId}`,
          severity: "critical",
          title: `${risk.bundleName} has critically low margin`,
          description: `Current margin: ${(risk.currentMargin * 100).toFixed(0)}%`,
          cta: { label: "Fix pricing", href: `/services/${risk.bundleId}` },
          category: "pricing",
        });
      } else if (risk.currentMargin < 0.25) {
        attentionItems.push({
          id: `margin-watch-${risk.bundleId}`,
          severity: "warning",
          title: `${risk.bundleName} margin is below target`,
          description: `Current margin: ${(risk.currentMargin * 100).toFixed(0)}%`,
          cta: { label: "Review", href: `/services/${risk.bundleId}` },
          category: "pricing",
        });
      }
    }
  }

  for (const r of renewals) {
    const days = Math.ceil(
      (new Date(r.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days <= 30) {
      attentionItems.push({
        id: `renewal-${r.clientId}`,
        severity: days <= 14 ? "critical" : "warning",
        title: `${r.clientName} renewal in ${days} days`,
        description: r.contractValue
          ? `$${r.contractValue.toLocaleString()} MRR at risk`
          : "Contract expiring soon",
        cta: { label: "View", href: `/clients/${r.clientId}` },
        category: "client",
      });
    }
  }

  // ── Onboarding checklist ────────────────────────────────────────────────

  const checklistSteps = {
    hasVendors: vendors.length > 0,
    hasServices: bundles.length > 0,
    hasProposals: proposals.length > 0,
    hasClients: clients.length > 0,
  };
  const allChecklistComplete =
    checklistSteps.hasVendors &&
    checklistSteps.hasServices &&
    checklistSteps.hasProposals &&
    checklistSteps.hasClients;

  // Fetch Scout nudges (non-blocking — refresh in background)
  let scoutNudges: ScoutNudgeRecord[] = [];
  try {
    scoutNudges = await getActiveNudges();
  } catch {
    // Nudges unavailable — degrade gracefully
  }

  // Fetch intelligence signals
  let orgSignals: OrgSignals | null = null;
  if (orgId) {
    try {
      orgSignals = await getOrgSignals(orgId);
    } catch {
      // Signals unavailable — degrade gracefully
    }
  }

  // Fetch chat context
  let chatContext: ChatContext | null = null;
  if (orgId) {
    try {
      chatContext = await assembleChatContext(orgId);
    } catch {
      // Chat context unavailable — degrade gracefully
    }
  }

  // Fetch practice assessment
  let currentAssessment: Awaited<ReturnType<typeof getCurrentAssessment>> = null;
  let practiceChanged = false;
  try {
    [currentAssessment, practiceChanged] = await Promise.all([
      getCurrentAssessment(),
      checkPracticeChanged(),
    ]);
  } catch {
    // Assessment unavailable — degrade gracefully
  }

  // Fetch latest Horizon digest
  let horizonDigest: { id: string; digest: import("@/types/horizon").HorizonDigest } | null = null;
  try {
    horizonDigest = await getLatestHorizonDigest();
  } catch {
    // Digest unavailable — degrade gracefully
  }

  // Refresh nudges in background for next load (fire-and-forget)
  if (orgId) {
    import("@/actions/scout-nudges").then(({ syncNudgesToDb }) => {
      syncNudgesToDb(orgId).catch(() => {});
    });
  }

  return (
    <DashboardClient
      checklist={allChecklistComplete ? null : checklistSteps}
      bundles={bundles}
      completeness={completeness}
      defaultTargetMargin={defaultTargetMargin}
      portfolioMrr={portfolioMrr}
      avgMargin={avgMargin}
      activeClients={activeClients}
      pricingHealth={pricingHealth}
      mrrByService={mrrByService}
      renewals={renewals}
      proposalStats={proposalStats}
      ctoBriefCount={ctoBriefCount}
      attentionItems={attentionItems}
      orgCreatedAt={org?.created_at ?? null}
      firstName={profile?.display_name?.split(" ")[0] ?? null}
      recentActivities={recentActivities}
      scoutNudges={scoutNudges}
      orgSignals={orgSignals}
      serviceCount={bundles.filter((b) => b.status === "active").length}
      horizonDigest={horizonDigest?.digest ?? null}
      horizonDigestId={horizonDigest?.id ?? null}
      chatContext={chatContext}
      currentAssessment={currentAssessment}
      practiceChanged={practiceChanged}
    />
  );
}

// ── Helper: CTO brief count ──────────────────────────────────────────────────

async function getCTOBriefCount(orgId: string | null): Promise<number> {
  if (!orgId) return 0;
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("fractional_cto_briefs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);
    return count ?? 0;
  } catch {
    return 0;
  }
}
