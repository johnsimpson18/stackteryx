import type { PricingOutput } from "./index";

export interface ClientProfile {
  clientName: string;
  industry: string;
  seatCount: number;
  riskTolerance: "low" | "moderate" | "high";
  budgetPerSeatMax?: number;
  complianceRequirements: string[];
  currentPainPoints?: string;
  notes?: string;
}

export interface BundleRecommendation {
  tier: "essential" | "recommended" | "premium";
  name: string;
  description: string;
  toolIds: string[];
  reasoning: {
    whyTheseTools: string;
    coverageGaps: string;
    complianceNotes: string;
    sellingPoints: string[];
  };
  suggestedSettings: {
    targetMarginPct: number;
    overheadPct: number;
    laborPct: number;
    contractTermMonths: number;
    riskTier: "low" | "medium" | "high";
    discountPct: number;
  };
  // Populated client-side after pricing engine runs
  pricing?: PricingOutput;
}

export interface RecommendationResponse {
  recommendations: BundleRecommendation[];
}
