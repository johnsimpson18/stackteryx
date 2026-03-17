export const PLAN_LIMITS = {
  free: {
    services: 2,
    clients: 3,
    aiGenerationsPerMonth: 5,
    exportsPerMonth: 3,
    ctoBriefsTotalEver: 1,
    teamMembers: 1,
    // Premium feature flags
    qbrGenerator: false,
    clientScorecards: false,
    bulkClientAnalysis: false,
    portfolioIntelligence: false,
    whiteLabel: false,
    teamWorkflows: false,
  },
  pro: {
    services: 10,
    clients: 15,
    aiGenerationsPerMonth: 40,
    exportsPerMonth: 20,
    ctoBriefsTotalEver: 10, // per month, not ever
    teamMembers: 3,
    qbrGenerator: false,
    clientScorecards: false,
    bulkClientAnalysis: false,
    portfolioIntelligence: false,
    whiteLabel: false,
    teamWorkflows: false,
  },
  enterprise: {
    services: Infinity,
    clients: Infinity,
    aiGenerationsPerMonth: 150,
    exportsPerMonth: 75,
    ctoBriefsTotalEver: Infinity,
    teamMembers: Infinity,
    qbrGenerator: true,
    clientScorecards: true,
    bulkClientAnalysis: true,
    portfolioIntelligence: true,
    whiteLabel: true,
    teamWorkflows: true,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
export type LimitKey = keyof (typeof PLAN_LIMITS)["free"];

/** Widened type for runtime plan limit access (literal types → number | boolean). */
export type PlanLimitValues = {
  readonly [K in LimitKey]: (typeof PLAN_LIMITS)["free"][K] extends boolean
    ? boolean
    : number;
};

export const PLAN_DISPLAY = {
  free: { label: "Free", price: "$0", period: "forever" },
  pro: { label: "Pro", price: "$149", period: "per month" },
  enterprise: { label: "Enterprise", price: "$399", period: "per month" },
} as const;

export function isBypassMode(): boolean {
  return (
    process.env.BYPASS_PLAN_LIMITS === "true" &&
    process.env.NODE_ENV !== "production"
  );
}
