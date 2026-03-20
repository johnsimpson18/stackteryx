import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgSettings, getOnboardingProfile } from "@/lib/db/org-settings";
import { getUserOrgMemberships, getOrgMemberCount } from "@/lib/db/org-members";
import { getActiveOrgId } from "@/lib/org-context";
import { getOrgById } from "@/lib/db/orgs";
import { getOnboardingTools } from "@/lib/db/onboarding-tools";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getAgentActivities } from "@/lib/agents/log-activity";
import { getActiveNudges } from "@/actions/scout-nudges";
import { TourProvider } from "@/components/onboarding/tour-provider";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { PlanProvider } from "@/components/providers/plan-provider";
import { UpgradeModalProvider } from "@/components/billing/upgrade-modal";
import { LimitProvider } from "@/components/billing/limit-context";
import { TrialBannerWrapper } from "@/components/trial/trial-banner-wrapper";
import { IntelligencePanelProvider } from "@/components/providers/intelligence-panel-provider";
import { IntelligencePanelGlobal } from "@/components/intelligence-chat/intelligence-panel-global";
import { assembleChatContext, type ChatContext as ChatCtx } from "@/lib/intelligence/chat-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const orgId = await getActiveOrgId();
  const settings = orgId ? await getOrgSettings(orgId) : null;
  const workspaceName = settings?.workspace_name ?? "Stackteryx";

  let userOrgs: { org_id: string; org_name: string }[] = [];
  let memberCount = 1;
  try {
    const [orgsResult, countResult] = await Promise.allSettled([
      getUserOrgMemberships(profile.id),
      orgId ? getOrgMemberCount(orgId) : Promise.resolve(1),
    ]);
    userOrgs = orgsResult.status === "fulfilled" ? orgsResult.value : [];
    memberCount = countResult.status === "fulfilled" ? countResult.value : 1;
  } catch {
    // Degrade gracefully — show single org mode
  }

  // ── Onboarding gate check ──────────────────────────────────────────────
  // Fetch from org_settings table (not workspace_settings) where the
  // onboarding_complete flag and wizard progress live.

  let onboardingComplete = false; // Default: gate unless explicitly complete
  let onboardingProfile = null as Awaited<ReturnType<typeof getOnboardingProfile>>;
  let savedStep = 1;
  let savedTools: Awaited<ReturnType<typeof getOnboardingTools>> = [];
  let orgName = "";

  if (orgId) {
    try {
      onboardingProfile = await getOnboardingProfile(orgId);
      if (onboardingProfile) {
        onboardingComplete = onboardingProfile.onboarding_complete;
        savedStep = onboardingProfile.onboarding_step ?? 1;
      }
      // No row = new org, onboarding not complete → gate will show
    } catch {
      // Query failed — allow through to avoid blocking users
      onboardingComplete = true;
    }

    if (!onboardingComplete) {
      // Only fetch these when we need the gate
      const [org, tools] = await Promise.all([
        getOrgById(orgId).catch(() => null),
        getOnboardingTools(orgId).catch(() => []),
      ]);
      orgName = org?.name ?? "";
      savedTools = tools;
    }
  }

  // ── Agent activity for topbar pulse ───────────────────────────────────
  let topbarActivities: Awaited<ReturnType<typeof getAgentActivities>> = [];
  if (orgId) {
    try {
      topbarActivities = await getAgentActivities(orgId, 3);
    } catch {
      // degrade gracefully
    }
  }

  const appContent = (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={profile} memberCount={memberCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          workspaceName={workspaceName}
          activeOrgId={orgId ?? undefined}
          userOrgs={userOrgs}
          recentActivities={topbarActivities}
          highPriorityNudgeCount={await getActiveNudges().then(
            (n) => n.filter((x) => x.priority <= 3).length,
          ).catch(() => 0)}
        />
        <main className="flex-1 overflow-y-auto app-grid-bg p-6 pb-20 md:pb-6">
          <TrialBannerWrapper />
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );

  // Fetch chat context for global intelligence panel
  let globalChatContext: ChatCtx | null = null;
  if (orgId) {
    try {
      globalChatContext = await assembleChatContext(orgId);
    } catch {
      // Non-critical
    }
  }

  // Check tour completion from DB
  let tourCompletedInDb = false;
  try {
    const supabase = await createClient();
    const { data: tourData } = await supabase
      .from("profiles")
      .select("tour_completed")
      .eq("id", profile.id)
      .single();
    tourCompletedInDb = tourData?.tour_completed ?? false;
  } catch {
    // Assume not completed
  }

  return (
    <PlanProvider>
      <UpgradeModalProvider>
        <LimitProvider>
          <IntelligencePanelProvider>
            <TourProvider tourCompletedInDb={tourCompletedInDb}>
              <OnboardingGate
                onboardingComplete={onboardingComplete}
                orgId={orgId ?? ""}
                defaultOrgName={orgName}
                defaultDisplayName={profile.display_name ?? ""}
                savedProfile={onboardingProfile}
                savedStep={savedStep}
                savedTools={savedTools}
              >
                {appContent}
                <IntelligencePanelGlobal context={globalChatContext} />
              </OnboardingGate>
            </TourProvider>
          </IntelligencePanelProvider>
        </LimitProvider>
      </UpgradeModalProvider>
    </PlanProvider>
  );
}
