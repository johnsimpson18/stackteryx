import { CATEGORY_LABELS, PRICING_MODEL_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Tool } from "@/lib/types";

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
