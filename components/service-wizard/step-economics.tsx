"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { RISK_TIER_LABELS, RISK_TIERS } from "@/lib/constants";
import { calculatePricing } from "@/lib/pricing/engine";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { ChevronsUpDown } from "lucide-react";
import type {
  Tool,
  RiskTier,
  PricingInput,
  PricingToolInput,
  PricingOutput,
} from "@/lib/types";

interface StepEconomicsProps {
  tools: Tool[];
  selectedToolIds: Set<string>;
  seatCount: number;
  riskTier: RiskTier;
  contractTermMonths: number;
  targetMarginPct: number;
  overheadPct: number;
  laborPct: number;
  discountPct: number;
  onSeatCountChange: (v: number) => void;
  onRiskTierChange: (v: RiskTier) => void;
  onContractTermChange: (v: number) => void;
  onTargetMarginChange: (v: number) => void;
  onOverheadChange: (v: number) => void;
  onLaborChange: (v: number) => void;
  onDiscountChange: (v: number) => void;
}

const ADVANCED_KEY = "service-wizard-advanced-expanded";

export function StepEconomics({
  tools,
  selectedToolIds,
  seatCount,
  riskTier,
  contractTermMonths,
  targetMarginPct,
  overheadPct,
  laborPct,
  discountPct,
  onSeatCountChange,
  onRiskTierChange,
  onContractTermChange,
  onTargetMarginChange,
  onOverheadChange,
  onLaborChange,
  onDiscountChange,
}: StepEconomicsProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(ADVANCED_KEY);
    if (stored === "true") setAdvancedOpen(true);
  }, []);

  function toggleAdvanced(open: boolean) {
    setAdvancedOpen(open);
    localStorage.setItem(ADVANCED_KEY, String(open));
  }

  const selectedTools = useMemo(
    () => tools.filter((t) => selectedToolIds.has(t.id)),
    [tools, selectedToolIds]
  );

  const pricing = useMemo((): PricingOutput | null => {
    if (selectedTools.length === 0) return null;

    const pricingTools: PricingToolInput[] = selectedTools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      pricing_model: tool.pricing_model,
      per_seat_cost: Number(tool.per_seat_cost),
      flat_monthly_cost: Number(tool.flat_monthly_cost),
      tier_rules: tool.tier_rules ?? [],
      vendor_minimum_monthly: tool.vendor_minimum_monthly
        ? Number(tool.vendor_minimum_monthly)
        : null,
      labor_cost_per_seat: tool.labor_cost_per_seat
        ? Number(tool.labor_cost_per_seat)
        : null,
      quantity_multiplier: 1,
      annual_flat_cost: tool.annual_flat_cost,
      per_user_cost: tool.per_user_cost,
      per_org_cost: tool.per_org_cost,
      percent_discount: tool.percent_discount,
      flat_discount: tool.flat_discount,
      min_monthly_commit: tool.min_monthly_commit,
      tier_metric: tool.tier_metric,
    }));

    const input: PricingInput = {
      tools: pricingTools,
      seat_count: seatCount,
      target_margin_pct: targetMarginPct,
      overhead_pct: overheadPct,
      labor_pct: laborPct,
      discount_pct: discountPct,
      red_zone_margin_pct: 0.15,
      max_discount_no_approval_pct: 0.1,
      contract_term_months: contractTermMonths,
    };

    try {
      return calculatePricing(input);
    } catch {
      return null;
    }
  }, [selectedTools, seatCount, targetMarginPct, overheadPct, laborPct, discountPct, contractTermMonths]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configure Economics</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Set your pricing parameters. The preview updates live.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Form fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Seat count</Label>
            <Input
              type="number"
              min={1}
              value={seatCount}
              onChange={(e) => onSeatCountChange(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label>Risk tier</Label>
            <Select value={riskTier} onValueChange={(v) => onRiskTierChange(v as RiskTier)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RISK_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {RISK_TIER_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Contract term (months)</Label>
            <Input
              type="number"
              min={1}
              value={contractTermMonths}
              onChange={(e) => onContractTermChange(parseInt(e.target.value) || 12)}
            />
          </div>

          <div className="space-y-2">
            <Label>Target margin ({formatPercent(targetMarginPct)})</Label>
            <input
              type="range"
              min={0}
              max={0.6}
              step={0.01}
              value={targetMarginPct}
              onChange={(e) => onTargetMarginChange(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <Collapsible open={advancedOpen} onOpenChange={toggleAdvanced}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-white/5 transition-colors">
              <span className="font-medium text-foreground">Advanced pricing settings</span>
              <span className="flex items-center gap-2">
                {!advancedOpen && (
                  <span className="text-xs text-muted-foreground">3 settings</span>
                )}
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label>Overhead ({formatPercent(overheadPct)})</Label>
                <input
                  type="range"
                  min={0}
                  max={0.3}
                  step={0.01}
                  value={overheadPct}
                  onChange={(e) => onOverheadChange(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="space-y-2">
                <Label>Labor ({formatPercent(laborPct)})</Label>
                <input
                  type="range"
                  min={0}
                  max={0.3}
                  step={0.01}
                  value={laborPct}
                  onChange={(e) => onLaborChange(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="space-y-2">
                <Label>Discount ({formatPercent(discountPct)})</Label>
                <input
                  type="range"
                  min={0}
                  max={0.3}
                  step={0.01}
                  value={discountPct}
                  onChange={(e) => onDiscountChange(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Right: Live preview */}
        <div className="rounded-xl border border-border bg-card p-5 h-fit sticky top-20">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pricing Preview</h3>
          {pricing ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost per seat</span>
                <span className="font-mono font-medium">
                  {formatCurrency(pricing.true_cost_per_seat)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Suggested price</span>
                <span className="font-mono font-medium">
                  {formatCurrency(pricing.suggested_price_per_seat)}
                </span>
              </div>
              {discountPct > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">After discount</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(pricing.discounted_price_per_seat)}
                  </span>
                </div>
              )}
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">MRR</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(pricing.total_mrr)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ARR</span>
                <span className="font-mono font-medium">
                  {formatCurrency(pricing.total_arr)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margin</span>
                <span
                  className={cn(
                    "font-mono font-medium",
                    pricing.margin_pct_post_discount >= 0.25
                      ? "text-emerald-400"
                      : pricing.margin_pct_post_discount >= 0.15
                        ? "text-amber-400"
                        : "text-red-400"
                  )}
                >
                  {formatPercent(pricing.margin_pct_post_discount)}
                </span>
              </div>
              {pricing.flags.length > 0 && (
                <div className="mt-3 space-y-1">
                  {pricing.flags.map((flag, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        flag.severity === "error"
                          ? "bg-red-500/10 text-red-400"
                          : flag.severity === "warning"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-blue-500/10 text-blue-400"
                      )}
                    >
                      {flag.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select tools to see pricing</p>
          )}
        </div>
      </div>
    </div>
  );
}
