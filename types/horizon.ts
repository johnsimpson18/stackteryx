export interface HorizonDigest {
  weekLabel: string;
  weekStart: string;
  generatedAt: string;

  technologyShifts: TrendItem[];
  mspBusinessTrends: TrendItem[];
  competitiveIntelligence: TrendItem[];

  searchQueriesUsed: string[];
  modelKnowledgeDate: string;
}

export interface TrendItem {
  id: string;
  title: string;
  summary: string;
  impact: "high" | "medium" | "low";
  impactLabel: string;
  actionable: boolean;
  action?: string;
  source?: string;
  tags: string[];
}
