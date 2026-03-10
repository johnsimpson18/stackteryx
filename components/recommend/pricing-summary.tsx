"use client";

import { AlertTriangle, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import type { PricingOutput } from "@/lib/types";

interface PricingSummaryProps {
  pricing: PricingOutput;
  seatCount: number;
  budgetPerSeatMax?: number;
}

export function PricingSummary({ pricing, seatCount, budgetPerSeatMax }: PricingSummaryProps) {
  const margin = pricing.margin_pct_post_discount;
  const pricePerSeat = seatCount > 0 ? pricing.total_mrr / seatCount : 0;

  const marginColor =
    margin >= 0.3
      ? "text-emerald-400"
      : margin >= 0.15
        ? "text-amber-400"
        : "text-red-400";

  const overBudget =
    budgetPerSeatMax && budgetPerSeatMax > 0 && pricePerSeat > budgetPerSeatMax;

  const hasFlags = pricing.flags.some(
    (f) => f.severity === "error" || f.severity === "warning"
  );

  return (
    <div className="space-y-3">
      {/* Key metrics grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white/4 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Per Seat</p>
          <p className="text-base font-bold text-foreground mt-0.5">
            {formatCurrency(pricePerSeat)}
            <span className="text-xs font-normal text-muted-foreground">/mo</span>
          </p>
        </div>
        <div className="rounded-lg bg-white/4 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Gross Margin</p>
          <p className={cn("text-base font-bold mt-0.5", marginColor)}>
            {formatPercent(margin)}
          </p>
        </div>
        <div className="rounded-lg bg-white/4 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">MRR</p>
          <p className="text-base font-bold text-foreground mt-0.5">
            {formatCurrency(pricing.total_mrr)}
          </p>
        </div>
      </div>

      {/* Cost vs price row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
        <span>Cost: {formatCurrency(pricing.total_cost_mrr)}/mo</span>
        <span>Profit: {formatCurrency(pricing.total_monthly_margin)}/mo</span>
        <span>ARR: {formatCurrency(pricing.total_arr)}</span>
      </div>

      {/* Budget warning */}
      {overBudget && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-2.5 py-2">
          <TrendingDown className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Exceeds budget by{" "}
            <strong>{formatCurrency(pricePerSeat - (budgetPerSeatMax ?? 0))}/seat</strong>
          </p>
        </div>
      )}

      {/* Pricing flags */}
      {hasFlags &&
        pricing.flags
          .filter((f) => f.severity !== "info")
          .map((flag, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-2.5 py-2",
                flag.severity === "error"
                  ? "border-red-500/20 bg-red-500/8"
                  : "border-amber-500/20 bg-amber-500/8"
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0 mt-0.5",
                  flag.severity === "error" ? "text-red-400" : "text-amber-400"
                )}
              />
              <p
                className={cn(
                  "text-xs",
                  flag.severity === "error" ? "text-red-300" : "text-amber-300"
                )}
              >
                {flag.message}
              </p>
            </div>
          ))}
    </div>
  );
}
