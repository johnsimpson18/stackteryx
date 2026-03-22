import { createServiceClient } from "@/lib/supabase/service";

export interface WizardProfile {
  serviceModel: string | null;
  deliveryModel: string | null;
  salesModel: string | null;
  targetVerticals: string[];
  teamSize: string | null;
  biggestChallenge: string | null;
  toolCount: number;
  blendedMargin: number | null;
  hasHighMarginTools: boolean;
  hasLowMarginTools: boolean;
  primaryGoal: string | null;
  isFirstDashboardLoad: boolean;
}

export interface ChatContext {
  profile: {
    serviceModel: string;
    targetVerticals: string[];
    teamSize: string;
    biggestChallenge: string;
  };
  wizardProfile: WizardProfile | null;
  practice: {
    avgMargin: number;
    targetMargin: number;
    portfolioMrr: number;
    serviceCount: number;
    clientCount: number;
    servicesBelowTargetMargin: { name: string; margin: number }[];
  };
  scoutSignals: {
    type: string;
    title: string;
    clientName?: string;
    priority: number;
  }[];
  horizonContext: string;
  clientHealth: {
    atRisk: { name: string; score: number; topGap: string }[];
    upsellOpportunities: { clientName: string; opportunity: string; value: number }[];
  };
  tools: {
    categories: string[];
    toolCount: number;
  };
  usage: {
    plan: string;
    trialDaysRemaining?: number;
    aiGenerationsUsed: number;
    aiGenerationsLimit: number;
  };
  journey: {
    hasServices: boolean;
    hasClients: boolean;
    hasProposals: boolean;
    hasCTOBriefs: boolean;
  };
  horizonByCategory: Record<string, { title: string; summary: string; impact: string }[]>;
  behavior: {
    hasActedOnRepricing: boolean;
    hasActedOnServiceBuild: boolean;
    lastTopics: string[];
  };
}

export async function assembleChatContext(orgId: string): Promise<ChatContext> {
  const service = createServiceClient();

  const [
    onboardingRes,
    bundlesRes,
    settingsRes,
    nudgesRes,
    healthRes,
    toolsRes,
    clientsRes,
    proposalsRes,
    briefsRes,
    horizonRes,
    usageRes,
    subRes,
  ] = await Promise.allSettled([
    service.from("org_onboarding_profiles").select("*").eq("org_id", orgId).single(),
    service.from("bundles").select("id, name, status, latest_mrr, latest_margin").eq("org_id", orgId).eq("status", "active"),
    service.from("org_settings").select("default_target_margin_pct").eq("org_id", orgId).single(),
    service.from("scout_nudges").select("nudge_type, title, entity_name, priority").eq("org_id", orgId).eq("status", "active").order("priority").limit(5),
    service.from("client_health_scores").select("client_id, overall_score, stack_gaps, compliance_gaps, advisory_gaps, commercial_gaps").eq("org_id", orgId),
    service.from("tools").select("id, category").eq("org_id", orgId).eq("status", "active"),
    service.from("clients").select("id, name").eq("org_id", orgId),
    service.from("proposals").select("id").eq("org_id", orgId).limit(1),
    service.from("fractional_cto_briefs").select("id").eq("org_id", orgId).limit(1),
    service.from("horizon_digests").select("digest_json").eq("org_id", orgId).eq("status", "published").order("week_start", { ascending: false }).limit(1),
    service.from("usage_tracking").select("ai_generations_count").eq("org_id", orgId).eq("period_month", currentMonth()).single(),
    service.from("subscriptions").select("plan, trial_ends_at").eq("org_id", orgId).single(),
  ]);

  // Extract with safe defaults
  const onboarding = onboardingRes.status === "fulfilled" ? onboardingRes.value.data : null;
  const bundles = bundlesRes.status === "fulfilled" ? (bundlesRes.value.data ?? []) : [];
  const settings = settingsRes.status === "fulfilled" ? settingsRes.value.data : null;
  const nudges = nudgesRes.status === "fulfilled" ? (nudgesRes.value.data ?? []) : [];
  const healthScores = healthRes.status === "fulfilled" ? (healthRes.value.data ?? []) : [];
  const tools = toolsRes.status === "fulfilled" ? (toolsRes.value.data ?? []) : [];
  const clients = clientsRes.status === "fulfilled" ? (clientsRes.value.data ?? []) : [];
  const proposals = proposalsRes.status === "fulfilled" ? (proposalsRes.value.data ?? []) : [];
  const briefs = briefsRes.status === "fulfilled" ? (briefsRes.value.data ?? []) : [];
  const horizon = horizonRes.status === "fulfilled" ? (horizonRes.value.data ?? []) : [];
  const usage = usageRes.status === "fulfilled" ? usageRes.value.data : null;
  const sub = subRes.status === "fulfilled" ? subRes.value.data : null;

  // Fetch behavior separately (was added as 13th query)
  let behaviorData: { topics: string[]; actions_taken: string[] }[] = [];
  try {
    const { data } = await service
      .from("chat_behavior")
      .select("topics, actions_taken")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5);
    behaviorData = (data ?? []) as { topics: string[]; actions_taken: string[] }[];
  } catch {
    // Non-critical
  }

  // Fetch wizard profile for first-load assessment
  let wizardProfile: WizardProfile | null = null;
  try {
    const { data: wizSettings } = await service
      .from("org_settings")
      .select("settings, sales_model, delivery_models, sales_team_type, target_verticals, company_size, additional_context, onboarding_complete, onboarding_completed_at, first_load_assessment_shown_at, target_margin_pct")
      .eq("org_id", orgId)
      .maybeSingle();

    // Check both: the column (chat onboarding path) and the JSONB blob (old wizard path)
    const onboardingDone =
      wizSettings?.onboarding_complete ||
      (wizSettings?.settings as Record<string, unknown> | null)?.onboarding_completed === true;

    if (onboardingDone && wizSettings) {
      // Fetch onboarding tools for margin calculation
      const { data: onbTools } = await service
        .from("onboarding_tool_selections")
        .select("cost_amount, sell_amount, pricing_entered")
        .eq("org_id", orgId);

      const pricedTools = (onbTools ?? []).filter(
        (t: { cost_amount: number | null; sell_amount: number | null; pricing_entered: boolean }) =>
          t.pricing_entered && t.cost_amount != null && t.sell_amount != null && t.sell_amount > 0,
      );

      let blendedMargin: number | null = null;
      let hasHighMarginTools = false;
      let hasLowMarginTools = false;

      if (pricedTools.length > 0) {
        const margins = pricedTools.map(
          (t: { cost_amount: number; sell_amount: number }) =>
            ((t.sell_amount - t.cost_amount) / t.sell_amount) * 100,
        );
        blendedMargin = Math.round(margins.reduce((s: number, m: number) => s + m, 0) / margins.length);
        hasHighMarginTools = margins.some((m: number) => m > 60);
        hasLowMarginTools = margins.some((m: number) => m < 30);
      }

      // First dashboard load = onboarding completed + assessment never shown
      const completedAt = wizSettings.onboarding_completed_at;
      const assessmentShown = wizSettings.first_load_assessment_shown_at;
      const isFirstDashboardLoad = onboardingDone && !assessmentShown;

      wizardProfile = {
        serviceModel: wizSettings.sales_model as string | null,
        deliveryModel: Array.isArray(wizSettings.delivery_models)
          ? (wizSettings.delivery_models as string[]).join(", ")
          : (wizSettings.delivery_models as string | null),
        salesModel: wizSettings.sales_team_type as string | null,
        targetVerticals: (wizSettings.target_verticals as string[]) ?? [],
        teamSize: wizSettings.company_size as string | null,
        biggestChallenge: wizSettings.additional_context as string | null,
        toolCount: (onbTools ?? []).length,
        blendedMargin,
        hasHighMarginTools,
        hasLowMarginTools,
        primaryGoal: wizSettings.additional_context as string | null,
        isFirstDashboardLoad,
      };
    }
  } catch {
    // Non-critical — wizard profile unavailable
  }

  const targetMargin = settings ? Number(settings.default_target_margin_pct) * 100 : 35;

  // Client name map for health scores
  const clientMap = new Map(clients.map((c: { id: string; name: string }) => [c.id, c.name]));

  // Build horizon context string
  let horizonContext = "";
  if (horizon.length > 0) {
    const digest = horizon[0].digest_json as { technologyShifts?: { title: string }[]; mspBusinessTrends?: { title: string }[] };
    const shifts = (digest.technologyShifts ?? []).slice(0, 2).map((t) => t.title);
    const trends = (digest.mspBusinessTrends ?? []).slice(0, 2).map((t) => t.title);
    horizonContext = [...shifts, ...trends].map((t) => `- ${t}`).join("\n");
  }

  // Compute at-risk clients
  const atRisk = healthScores
    .filter((h: { overall_score: number }) => h.overall_score < 50)
    .slice(0, 5)
    .map((h: { client_id: string; overall_score: number; stack_gaps: string[]; compliance_gaps: string[]; advisory_gaps: string[]; commercial_gaps: string[] }) => ({
      name: clientMap.get(h.client_id) ?? "Unknown",
      score: h.overall_score,
      topGap: [...(h.stack_gaps ?? []), ...(h.compliance_gaps ?? []), ...(h.advisory_gaps ?? []), ...(h.commercial_gaps ?? [])][0] ?? "General",
    }));

  // Plan/usage info
  const plan = (sub?.plan as string) ?? "free";
  const LIMITS: Record<string, number> = { free: 2, trial: Infinity, pro: 40, enterprise: 150 };

  // Horizon signals indexed by category
  const horizonByCategory: Record<string, { title: string; summary: string; impact: string }[]> = {};
  if (horizon.length > 0) {
    const digest = horizon[0].digest_json as {
      technologyShifts?: { title: string; summary: string; impact: string; tags?: string[] }[];
      mspBusinessTrends?: { title: string; summary: string; impact: string; tags?: string[] }[];
      competitiveIntelligence?: { title: string; summary: string; impact: string; tags?: string[] }[];
    };
    const allItems = [
      ...(digest.technologyShifts ?? []),
      ...(digest.mspBusinessTrends ?? []),
      ...(digest.competitiveIntelligence ?? []),
    ];
    for (const item of allItems) {
      for (const tag of item.tags ?? []) {
        const key = tag.toLowerCase();
        if (!horizonByCategory[key]) horizonByCategory[key] = [];
        horizonByCategory[key].push({ title: item.title, summary: item.summary, impact: item.impact });
      }
    }
  }

  // Behavior signals
  const allActions = behaviorData.flatMap((b) => b.actions_taken);
  const allTopics = behaviorData.flatMap((b) => b.topics);

  return {
    profile: {
      serviceModel: onboarding?.sales_model ?? "unknown",
      targetVerticals: onboarding?.target_verticals ?? [],
      teamSize: onboarding?.company_size ?? "unknown",
      biggestChallenge: onboarding?.additional_context ?? "not specified",
    },
    wizardProfile,
    practice: {
      avgMargin: bundles.length > 0
        ? Math.round(bundles.reduce((s: number, b: { latest_margin: number | null }) => s + (Number(b.latest_margin ?? 0) * 100), 0) / bundles.length)
        : 0,
      targetMargin,
      portfolioMrr: bundles.reduce((s: number, b: { latest_mrr: number | null }) => s + (b.latest_mrr ?? 0), 0),
      serviceCount: bundles.length,
      clientCount: clients.length,
      servicesBelowTargetMargin: bundles
        .filter((b: { latest_margin: number | null }) => b.latest_margin !== null && Number(b.latest_margin) * 100 < targetMargin)
        .map((b: { name: string; latest_margin: number | null }) => ({ name: b.name, margin: Math.round(Number(b.latest_margin ?? 0) * 100) })),
    },
    scoutSignals: nudges.map((n: { nudge_type: string; title: string; entity_name: string | null; priority: number }) => ({
      type: n.nudge_type,
      title: n.title,
      clientName: n.entity_name ?? undefined,
      priority: n.priority,
    })),
    horizonContext,
    clientHealth: {
      atRisk,
      upsellOpportunities: [], // Derived from Scout nudges of type upsell_opportunity
    },
    tools: {
      categories: [...new Set(tools.map((t: { category: string }) => t.category))],
      toolCount: tools.length,
    },
    usage: {
      plan,
      trialDaysRemaining: sub?.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : undefined,
      aiGenerationsUsed: usage?.ai_generations_count ?? 0,
      aiGenerationsLimit: LIMITS[plan] ?? 2,
    },
    journey: {
      hasServices: bundles.length > 0,
      hasClients: clients.length > 0,
      hasProposals: proposals.length > 0,
      hasCTOBriefs: briefs.length > 0,
    },
    horizonByCategory,
    behavior: {
      hasActedOnRepricing: allActions.includes("repricing"),
      hasActedOnServiceBuild: allActions.includes("service_build"),
      lastTopics: allTopics.slice(0, 10),
    },
  };
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
