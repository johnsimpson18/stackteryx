import type { ClientContractWithMeta } from "@/lib/types";

// ── Service Fit ─────────────────────────────────────────────────────────────

export type ServiceFitLevel = "Strong" | "Moderate" | "Weak";

const INDUSTRY_OUTCOME_MAP: Record<string, string[]> = {
  Healthcare: ["compliance", "risk_reduction"],
  Legal: ["compliance", "risk_reduction"],
  "Finance & Banking": ["compliance", "risk_reduction"],
  Finance: ["compliance", "risk_reduction"],
  Insurance: ["compliance", "risk_reduction"],
  Technology: ["risk_reduction", "productivity"],
  SaaS: ["risk_reduction", "productivity"],
  Retail: ["revenue_protection", "compliance"],
  Hospitality: ["revenue_protection", "compliance"],
};

const DEFAULT_MATCH = ["risk_reduction"];

export function calculateServiceFit(
  clientIndustry: string,
  outcomeTypes: string[]
): ServiceFitLevel {
  if (outcomeTypes.length === 0) return "Weak";

  const prioritized =
    INDUSTRY_OUTCOME_MAP[clientIndustry] ?? DEFAULT_MATCH;

  const matchCount = outcomeTypes.filter((ot) =>
    prioritized.includes(ot.toLowerCase().replace(/\s+/g, "_"))
  ).length;

  const matchRatio = matchCount / outcomeTypes.length;

  if (matchRatio >= 1) return "Strong";
  if (matchRatio >= 0.5) return "Moderate";
  return "Weak";
}

// ── Renewal Helper ──────────────────────────────────────────────────────────

export function findSoonestRenewal(
  contracts: ClientContractWithMeta[]
): { contract: ClientContractWithMeta; daysUntil: number } | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let soonest: { contract: ClientContractWithMeta; daysUntil: number } | null =
    null;

  for (const c of contracts) {
    if (c.status !== "active") continue;
    const days = Math.ceil(
      (new Date(c.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days >= 0 && days <= 60) {
      if (!soonest || days < soonest.daysUntil) {
        soonest = { contract: c, daysUntil: days };
      }
    }
  }

  return soonest;
}
