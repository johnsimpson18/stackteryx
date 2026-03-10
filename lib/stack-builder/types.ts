export type StackPricingModel = "per-seat" | "per-endpoint" | "flat";

export interface StackCategory {
  id: string;
  name: string;
  icon: string; // emoji or lucide name reference
  color: string; // hex color for the stack tower layer
  isCoreRequired: boolean; // triggers warning if empty
}

export interface StackTool {
  id: string;
  name: string;
  vendor: string;
  categoryId: string;
  displayCategory: string; // plain-English group shown in the UI
  shortDescription: string; // one-line value prop for the tool card
  costMonthly: number; // vendor cost per seat/endpoint/flat
  msrpMonthly: number; // suggested sell price per seat/endpoint/flat
  notes?: string;
  tags?: string[]; // e.g. ["high-margin", "cloud-native"]
}

export interface StackPreset {
  id: string;
  label: string;
  description: string;
  emoji: string;
  toolIds: string[];
}

export interface BundleState {
  name: string;
  pricingModel: StackPricingModel;
  quantity: number;
  targetMargin: number; // 0–1 decimal
  selectedByCategory: Record<string, StackTool[]>; // categoryId → tools
}

export interface PricingSnapshot {
  totalCostMonthly: number;
  suggestedSellMonthly: number;
  marginDollars: number;
  marginPercent: number;
  coverageScore: number; // 0–1
  categoriesFilled: number;
  totalCategories: number;
  perCategoryCost: Record<string, number>; // categoryId → cost
  warnings: BundleWarning[];
}

export interface BundleWarning {
  type: "missing-core" | "redundant-tools" | "zero-margin" | "low-margin";
  categoryId?: string;
  message: string;
}

