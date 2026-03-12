"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { MarginHealthBadge } from "@/components/ui/margin-health-badge";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { PricingToolCost, PricingOutput } from "@/lib/types";

interface CostBreakdownProps {
  pricing: {
    tool_costs: PricingToolCost[];
    blended_tool_cost_per_seat: number;
    total_labor_cost_per_seat: number;
    overhead_amount_per_seat: number;
    true_cost_per_seat: number;
    suggested_price_per_seat: number;
    discounted_price_per_seat: number;
    margin_pct_post_discount: number;
    total_mrr: number;
    total_arr: number;
    total_monthly_margin: number;
    renewal_suggested_price_per_seat?: number;
  };
  seatCount: number;
  mode?: "full" | "compact";
  defaultExpanded?: boolean;
  showMonthly?: boolean;
  discountPct?: number;
  additionalServices?: { name: string; sellPrice: number; costPrice: number }[];
  className?: string;
}

export function mapPricingOutputToBreakdownProps(
  pricing: PricingOutput,
  seatCount: number,
): CostBreakdownProps["pricing"] {
  return {
    tool_costs: pricing.tool_costs,
    blended_tool_cost_per_seat: pricing.blended_tool_cost_per_seat,
    total_labor_cost_per_seat: pricing.total_labor_cost_per_seat,
    overhead_amount_per_seat: pricing.overhead_amount_per_seat,
    true_cost_per_seat: pricing.true_cost_per_seat,
    suggested_price_per_seat: pricing.suggested_price_per_seat,
    discounted_price_per_seat: pricing.discounted_price_per_seat,
    margin_pct_post_discount: pricing.margin_pct_post_discount,
    total_mrr: pricing.total_mrr,
    total_arr: pricing.total_arr,
    total_monthly_margin: pricing.total_monthly_margin,
    renewal_suggested_price_per_seat: pricing.renewal_suggested_price_per_seat,
  };
}

export function CostBreakdown({
  pricing,
  seatCount,
  mode = "full",
  defaultExpanded = false,
  showMonthly = true,
  discountPct,
  additionalServices,
  className,
}: CostBreakdownProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // ── Compact mode ──────────────────────────────────────────────────────────
  if (mode === "compact") {
    return (
      <div className={cn("flex items-center gap-2 text-xs font-mono", className)}>
        <span className="text-muted-foreground">Cost:</span>
        <span>{formatCurrency(pricing.true_cost_per_seat)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Sell:</span>
        <span>{formatCurrency(pricing.discounted_price_per_seat)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Margin:</span>
        <MarginHealthBadge margin={pricing.margin_pct_post_discount} />
      </div>
    );
  }

  // ── Full mode ─────────────────────────────────────────────────────────────
  const zeroCostTools = pricing.tool_costs.filter(
    (tc) => tc.effective_cost_per_seat === 0,
  );
  const hasDiscount = discountPct != null && discountPct > 0;
  const addSvcTotalSell = additionalServices?.reduce((s, a) => s + a.sellPrice, 0) ?? 0;
  const addSvcTotalCost = additionalServices?.reduce((s, a) => s + a.costPrice, 0) ?? 0;

  const renewalDiffers =
    pricing.renewal_suggested_price_per_seat != null &&
    pricing.renewal_suggested_price_per_seat > 0 &&
    pricing.renewal_suggested_price_per_seat !== pricing.suggested_price_per_seat;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Cost per seat */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Cost per seat</span>
        <span className="font-mono font-medium">
          {formatCurrency(pricing.true_cost_per_seat)}
        </span>
      </div>

      {/* Expandable tool-by-tool rows */}
      {pricing.tool_costs.length > 0 && (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/5 transition-colors"
          >
            <span className="font-medium">Cost Breakdown</span>
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          {expanded && (
            <div className="px-3 pb-2.5 space-y-1 border-t border-border/30 pt-1.5">
              {pricing.tool_costs.map((tc) => (
                <div key={tc.tool_id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate mr-2">
                    {tc.tool_name}
                    {tc.vendor_minimum_applied && (
                      <span className="ml-1 text-amber-400">(vendor min)</span>
                    )}
                    {tc.effective_cost_per_seat === 0 && (
                      <span className="ml-1 text-amber-400">(no cost)</span>
                    )}
                  </span>
                  <span className="font-mono shrink-0">
                    {formatCurrency(tc.effective_cost_per_seat)}/seat
                    {showMonthly && seatCount > 0 && (
                      <span className="text-muted-foreground ml-1">
                        ({formatCurrency(tc.effective_cost_per_seat * seatCount)}/mo)
                      </span>
                    )}
                  </span>
                </div>
              ))}
              <div className="h-px bg-border/30 my-1" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Blended tools</span>
                <span className="font-mono">
                  {formatCurrency(pricing.blended_tool_cost_per_seat)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Labor</span>
                <span className="font-mono">
                  {formatCurrency(pricing.total_labor_cost_per_seat)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Overhead</span>
                <span className="font-mono">
                  {formatCurrency(pricing.overhead_amount_per_seat)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zero-cost tool warnings */}
      {zeroCostTools.length > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-amber-500/5 border border-amber-500/20 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-[11px] text-amber-400">
            {zeroCostTools.map((tc) => tc.tool_name).join(", ")}{" "}
            {zeroCostTools.length === 1 ? "has" : "have"} no cost configured. Margin
            may be overstated.
          </div>
        </div>
      )}

      {/* Cost floor line */}
      <div className="h-px bg-border/30" />

      {/* Suggested price */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Suggested price</span>
        <span className="font-mono font-medium">
          {formatCurrency(pricing.suggested_price_per_seat)}
        </span>
      </div>

      {/* Discount line */}
      {hasDiscount && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            After discount ({formatPercent(discountPct!)})
          </span>
          <span className="font-mono font-medium">
            {formatCurrency(pricing.discounted_price_per_seat)}
          </span>
        </div>
      )}

      <div className="h-px bg-border my-2" />

      {/* MRR */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Tool MRR</span>
        <span className="font-mono font-medium">
          {formatCurrency(pricing.total_mrr)}
        </span>
      </div>

      {/* Additional services */}
      {additionalServices && additionalServices.length > 0 && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Add-On MRR</span>
            <span className="font-mono font-medium">
              {formatCurrency(addSvcTotalSell)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total MRR</span>
            <span className="font-mono font-semibold text-foreground">
              {formatCurrency(pricing.total_mrr + addSvcTotalSell)}
            </span>
          </div>
        </>
      )}

      {/* ARR */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">ARR</span>
        <span className="font-mono font-medium">
          {formatCurrency(
            (pricing.total_mrr + addSvcTotalSell) * 12,
          )}
        </span>
      </div>

      {/* Renewal row */}
      {renewalDiffers && (
        <div className="flex justify-between text-sm border-t border-border/30 pt-2">
          <span className="text-muted-foreground">Year 2 price</span>
          <span className="font-mono font-medium">
            {formatCurrency(pricing.renewal_suggested_price_per_seat!)}/seat
            <span className="text-[10px] text-muted-foreground ml-1">
              (+
              {(
                ((pricing.renewal_suggested_price_per_seat! -
                  pricing.suggested_price_per_seat) /
                  pricing.suggested_price_per_seat) *
                100
              ).toFixed(1)}
              %)
            </span>
          </span>
        </div>
      )}
      {pricing.renewal_suggested_price_per_seat != null &&
        pricing.renewal_suggested_price_per_seat > 0 &&
        pricing.renewal_suggested_price_per_seat === pricing.suggested_price_per_seat && (
          <div className="flex justify-between text-sm text-muted-foreground/60">
            <span>Year 2 price</span>
            <span className="font-mono">same</span>
          </div>
        )}

      {/* Margin */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Margin</span>
        <MarginHealthBadge margin={pricing.margin_pct_post_discount} />
      </div>

      {/* Monthly profit */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Monthly Profit</span>
        <span className="font-mono font-medium">
          {formatCurrency(pricing.total_monthly_margin + (addSvcTotalSell - addSvcTotalCost))}
        </span>
      </div>
    </div>
  );
}
