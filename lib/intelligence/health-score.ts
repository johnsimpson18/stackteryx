// ── Client Health Score Calculation Engine ────────────────────────────────────
//
// Deterministic scoring across four dimensions:
//   Stack Coverage (30%) — security domain coverage
//   Compliance (25%)     — framework coverage scores
//   Advisory (25%)       — CTO brief recency + engagement
//   Commercial (20%)     — contract health + renewal proximity

export interface HealthScoreInput {
  clientId: string;
  orgId: string;

  // Stack data — tool categories from active services
  coveredCategories: string[];

  // Compliance data
  complianceScorePcts: number[]; // score_pct from each enabled framework

  // Advisory data
  lastBriefDate: Date | null;
  briefCount: number;

  // Commercial data
  hasActiveContract: boolean;
  contractEndDate: Date | null;
  marginPct: number | null;
}

export interface HealthScoreResult {
  stackScore: number;
  complianceScore: number;
  advisoryScore: number;
  commercialScore: number;
  overallScore: number;
  stackGaps: string[];
  complianceGaps: string[];
  advisoryGaps: string[];
  commercialGaps: string[];
  grade: "A" | "B" | "C" | "D" | "F";
  color: "green" | "amber" | "red";
}

const BASELINE_DOMAINS = [
  "edr",
  "backup",
  "identity",
  "email-security",
  "network",
] as const;

const DOMAIN_LABELS: Record<string, string> = {
  edr: "Endpoint Protection",
  backup: "Backup & Recovery",
  identity: "Identity Protection",
  "email-security": "Email Security",
  network: "Network Security",
};

export function calculateHealthScore(
  input: HealthScoreInput,
  now: Date = new Date(),
): HealthScoreResult {
  // ── Stack score (0-100) ───────────────────────────────────────────────────
  const coveredSet = new Set(input.coveredCategories);
  const stackGaps = BASELINE_DOMAINS.filter((d) => !coveredSet.has(d)).map(
    (d) => DOMAIN_LABELS[d] ?? d,
  );
  const stackScore = Math.round(
    ((BASELINE_DOMAINS.length - stackGaps.length) / BASELINE_DOMAINS.length) *
      100,
  );

  // ── Compliance score (0-100) ──────────────────────────────────────────────
  const complianceGaps: string[] = [];
  let complianceScore: number;

  if (input.complianceScorePcts.length === 0) {
    // No compliance frameworks enabled — neutral score
    complianceScore = 50;
    complianceGaps.push("No compliance frameworks assessed");
  } else {
    const avg =
      input.complianceScorePcts.reduce((sum, p) => sum + p, 0) /
      input.complianceScorePcts.length;
    complianceScore = Math.round(avg);
    for (const pct of input.complianceScorePcts) {
      if (pct < 60) {
        complianceGaps.push(`Framework coverage at ${Math.round(pct)}%`);
      }
    }
  }

  // ── Advisory score (0-100) ────────────────────────────────────────────────
  const advisoryGaps: string[] = [];
  let advisoryScore: number;

  if (!input.lastBriefDate) {
    advisoryScore = 0;
    advisoryGaps.push("No Technology Strategy Brief generated");
  } else {
    const daysSinceBrief = Math.floor(
      (now.getTime() - input.lastBriefDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceBrief > 90) {
      advisoryScore = 40;
      advisoryGaps.push(`Last brief was ${daysSinceBrief} days ago`);
    } else if (daysSinceBrief > 45) {
      advisoryScore = 70;
      advisoryGaps.push("Brief due for refresh");
    } else {
      advisoryScore = 100;
    }
  }

  // ── Commercial score (0-100) ──────────────────────────────────────────────
  const commercialGaps: string[] = [];
  let commercialScore: number;

  if (!input.hasActiveContract) {
    commercialScore = 20;
    commercialGaps.push("No active contract");
  } else {
    commercialScore = 100;

    if (input.contractEndDate) {
      const daysToRenewal = Math.floor(
        (input.contractEndDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysToRenewal < 0) {
        commercialScore = 30;
        commercialGaps.push("Contract expired");
      } else if (daysToRenewal < 30) {
        commercialScore = 50;
        commercialGaps.push(`Contract renews in ${daysToRenewal} days`);
      } else if (daysToRenewal < 60) {
        commercialScore = 75;
        commercialGaps.push(`Renewal approaching in ${daysToRenewal} days`);
      }
    }

    if (input.marginPct !== null && input.marginPct < 0.15) {
      commercialScore = Math.min(commercialScore, 60);
      commercialGaps.push(
        `Margin at ${Math.round(input.marginPct * 100)}% (below target)`,
      );
    }
  }

  // ── Weighted overall ──────────────────────────────────────────────────────
  const overallScore = Math.round(
    stackScore * 0.3 +
      complianceScore * 0.25 +
      advisoryScore * 0.25 +
      commercialScore * 0.2,
  );

  const grade: HealthScoreResult["grade"] =
    overallScore >= 80
      ? "A"
      : overallScore >= 65
        ? "B"
        : overallScore >= 50
          ? "C"
          : overallScore >= 35
            ? "D"
            : "F";

  const color: HealthScoreResult["color"] =
    overallScore >= 65 ? "green" : overallScore >= 40 ? "amber" : "red";

  return {
    stackScore,
    complianceScore,
    advisoryScore,
    commercialScore,
    overallScore,
    stackGaps,
    complianceGaps,
    advisoryGaps,
    commercialGaps,
    grade,
    color,
  };
}
