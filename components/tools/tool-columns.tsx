import { CATEGORY_LABELS, PRICING_MODEL_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Tool } from "@/lib/types";

// ── Polymorphic cost field resolver ─────────────────────────────────────────

export interface ToolCostInfo {
  value: number;
  fieldName: "per_seat_cost" | "per_user_cost" | "per_org_cost" | "flat_monthly_cost" | "annual_flat_cost";
  unit: string;
  isEditable: boolean;
}

const COST_FIELD_MAP: Record<string, { field: ToolCostInfo["fieldName"]; unit: string }> = {
  per_seat:      { field: "per_seat_cost",      unit: "/endpoint" },
  per_user:      { field: "per_user_cost",      unit: "/user" },
  per_org:       { field: "per_org_cost",       unit: "/org" },
  flat_monthly:  { field: "flat_monthly_cost",  unit: "/mo" },
  annual_flat:   { field: "annual_flat_cost",   unit: "/yr" },
};

export function getToolCostField(tool: Tool): ToolCostInfo | null {
  const mapping = COST_FIELD_MAP[tool.pricing_model];
  if (!mapping) return null; // tiered / tiered_by_metric — not inline-editable
  return {
    value: Number(tool[mapping.field] ?? 0),
    fieldName: mapping.field,
    unit: mapping.unit,
    isEditable: true,
  };
}

// ── Format cost for display ─────────────────────────────────────────────────

export function formatCost(tool: Tool): string {
  switch (tool.pricing_model) {
    case "per_seat":
      return `$${Number(tool.per_seat_cost).toFixed(2)}/endpoint`;
    case "per_user":
      return `$${Number(tool.per_user_cost ?? 0).toFixed(2)}/user`;
    case "per_org":
      return `$${Number(tool.per_org_cost ?? 0).toFixed(2)}/org`;
    case "flat_monthly":
      return `$${Number(tool.flat_monthly_cost).toFixed(2)}/mo`;
    case "annual_flat":
      return `$${Number(tool.annual_flat_cost ?? 0).toFixed(2)}/yr`;
    case "tiered":
      if (tool.tier_rules.length > 0) {
        const first = tool.tier_rules[0];
        const last = tool.tier_rules[tool.tier_rules.length - 1];
        return `$${last.costPerSeat.toFixed(2)}–$${first.costPerSeat.toFixed(2)}/seat`;
      }
      return "Tiered";
    default:
      return "—";
  }
}

export function CategoryBadge({ category }: { category: Tool["category"] }) {
  const c = CATEGORY_COLORS[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium border",
        c.bg, c.text, c.border
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", c.dot)} />
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export function PricingBadge({ model }: { model: Tool["pricing_model"] }) {
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-white/5 text-muted-foreground border border-white/8">
      {PRICING_MODEL_LABELS[model]}
    </span>
  );
}

export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium border",
        isActive
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-muted text-muted-foreground border-border"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isActive ? "bg-emerald-500" : "bg-muted-foreground/30"
        )}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function ComplexityDots({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors",
            i < value ? "bg-primary" : "bg-white/10"
          )}
        />
      ))}
    </div>
  );
}
