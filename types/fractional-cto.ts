// ── Shared types for the Fractional CTO feature ────────────────────────────

export interface BriefInput {
  domain: string;
  industry: string;
  companySize: string;
  primaryConcern?: string;
  mspName: string;
}

export interface TechnologyRisk {
  title: string;
  description: string;
  severity: "High" | "Medium" | "Low";
}

export interface RadarItem {
  technology: string;
  relevance: string;
  implication: string;
}

export interface BriefSections {
  executivePerspective: string;
  businessLandscape: string;
  technologyRisks: TechnologyRisk[];
  technologyRadar: RadarItem[];
  strategicPriorities: string[];
  planningOutlook: {
    shortTerm: string[];
    midTerm: string[];
    longTerm: string[];
  };
}

export interface BriefOutput {
  mspName: string;
  clientDomain: string;
  industry: string;
  generatedAt: string;
  sections: BriefSections;
}

export interface SaveBriefInput {
  clientId?: string;
  domain: string;
  industry: string;
  companySize: string;
  primaryConcern?: string;
  mspName: string;
  quarterLabel: string;
  briefJson: BriefSections;
}

export interface CTOBriefRecord {
  id: string;
  clientId: string | null;
  clientName: string | null;
  domain: string;
  industry: string;
  companySize: string;
  primaryConcern: string | null;
  mspName: string;
  quarterLabel: string;
  briefJson: BriefSections;
  createdAt: string;
}
