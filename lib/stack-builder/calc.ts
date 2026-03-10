import type {
  BundleState,
  PricingSnapshot,
  BundleWarning,
  StackCategory,
} from "./types";

export function computePricing(
  state: BundleState,
  categories: StackCategory[]
): PricingSnapshot {
  const allSelected = Object.values(state.selectedByCategory).flat();

  // Cost — scale per-seat/per-endpoint by quantity; flat is just monthly total
  const multiplier =
    state.pricingModel === "flat" ? 1 : Math.max(state.quantity, 1);

  let totalCostMonthly = 0;
  const perCategoryCost: Record<string, number> = {};

  for (const [catId, tools] of Object.entries(state.selectedByCategory)) {
    const catCost = tools.reduce((sum, t) => sum + t.costMonthly * multiplier, 0);
    perCategoryCost[catId] = catCost;
    totalCostMonthly += catCost;
  }

  const margin = Math.max(0, Math.min(state.targetMargin, 0.99));
  const suggestedSellMonthly =
    margin < 1 ? totalCostMonthly / (1 - margin) : totalCostMonthly;

  const marginDollars = suggestedSellMonthly - totalCostMonthly;
  const marginPercent =
    suggestedSellMonthly > 0 ? marginDollars / suggestedSellMonthly : 0;

  const categoriesFilled = Object.values(state.selectedByCategory).filter(
    (tools) => tools.length > 0
  ).length;
  const totalCategories = categories.length;
  const coverageScore =
    totalCategories > 0 ? categoriesFilled / totalCategories : 0;

  // Warnings
  const warnings: BundleWarning[] = [];

  // Missing core categories
  for (const cat of categories) {
    if (cat.isCoreRequired) {
      const tools = state.selectedByCategory[cat.id] ?? [];
      if (tools.length === 0) {
        warnings.push({
          type: "missing-core",
          categoryId: cat.id,
          message: `${cat.name} is a core security layer — add at least one tool.`,
        });
      }
    }
  }

  // Redundant tools (>1 in a single category)
  for (const [catId, tools] of Object.entries(state.selectedByCategory)) {
    if (tools.length > 1) {
      const cat = categories.find((c) => c.id === catId);
      warnings.push({
        type: "redundant-tools",
        categoryId: catId,
        message: `${cat?.name ?? catId} has ${tools.length} tools — redundant coverage may increase cost without added protection.`,
      });
    }
  }

  // Margin warnings
  if (allSelected.length > 0) {
    if (marginPercent <= 0) {
      warnings.push({
        type: "zero-margin",
        message: "This bundle has zero or negative margin. Increase target margin.",
      });
    } else if (marginPercent < 0.15) {
      warnings.push({
        type: "low-margin",
        message: `Margin is only ${(marginPercent * 100).toFixed(1)}% — below the recommended 15% floor.`,
      });
    }
  }

  return {
    totalCostMonthly,
    suggestedSellMonthly,
    marginDollars,
    marginPercent,
    coverageScore,
    categoriesFilled,
    totalCategories,
    perCategoryCost,
    warnings,
  };
}

/** Normalise per-category cost to [0,1] for tower layer height */
export function normalizeCategoryCosts(
  perCategoryCost: Record<string, number>,
  categoryIds: string[]
): Record<string, number> {
  const max = Math.max(...categoryIds.map((id) => perCategoryCost[id] ?? 0), 1);
  return Object.fromEntries(
    categoryIds.map((id) => [id, (perCategoryCost[id] ?? 0) / max])
  );
}

export function toolMarginPercent(tool: { costMonthly: number; msrpMonthly: number }): number {
  if (tool.msrpMonthly <= 0) return 0;
  return (tool.msrpMonthly - tool.costMonthly) / tool.msrpMonthly;
}
