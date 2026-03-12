"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { MarginHealthBadge } from "@/components/ui/margin-health-badge";
import { cn } from "@/lib/utils";
import { RISK_TIER_LABELS, RISK_TIERS } from "@/lib/constants";
import { calculatePricing } from "@/lib/pricing/engine";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { ChevronsUpDown, Briefcase, Check } from "lucide-react";
import type {
  Tool,
  RiskTier,
  PricingInput,
  PricingToolInput,
  PricingOutput,
  AdditionalService,
  AdditionalServiceCategory,
} from "@/lib/types";

const ADD_SVC_CATEGORY_LABELS: Record<AdditionalServiceCategory, string> = {
  consulting: "Consulting",
  help_desk: "Help Desk",
  retainer: "Retainer",
  training: "Training",
  project: "Project",
  compliance: "Compliance",
};

const ADD_SVC_CATEGORY_COLORS: Record<AdditionalServiceCategory, string> = {
  consulting: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  help_desk: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  retainer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  training: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  project: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  compliance: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

interface StepEconomicsProps {
  tools: Tool[];
  selectedToolIds: Set<string>;
  additionalServices: AdditionalService[];
  selectedAdditionalServiceIds: Set<string>;
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
  onToggleAdditionalService: (id: string) => void;
}

const ADVANCED_KEY = "service-wizard-advanced-expanded";

export function StepEconomics({
  tools,
  selectedToolIds,
  additionalServices,
  selectedAdditionalServiceIds,
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
  onToggleAdditionalService,
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

  const addSvcTotals = useMemo(() => {
    const selected = additionalServices.filter((s) =>
      selectedAdditionalServiceIds.has(s.id)
    );
    const totalCost = selected.reduce((sum, s) => sum + Number(s.cost), 0);
    const totalSell = selected.reduce((sum, s) => sum + Number(s.sell_price), 0);
    return { selected, totalCost, totalSell, count: selected.length };
  }, [additionalServices, selectedAdditionalServiceIds]);

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

          {/* Additional Services */}
          {additionalServices.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-white/5 transition-colors">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  Additional Services
                </span>
                <span className="flex items-center gap-2">
                  {addSvcTotals.count > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {addSvcTotals.count} selected
                    </Badge>
                  )}
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Include consulting, retainers, or professional services.
                </p>
                {additionalServices.map((svc) => {
                  const isSelected = selectedAdditionalServiceIds.has(svc.id);
                  return (
                    <button
                      type="button"
                      key={svc.id}
                      onClick={() => onToggleAdditionalService(svc.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors text-left w-full",
                        isSelected
                          ? "border-primary/30 bg-primary/5"
                          : "border-border hover:bg-white/5"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {svc.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] shrink-0",
                              ADD_SVC_CATEGORY_COLORS[svc.category]
                            )}
                          >
                            {ADD_SVC_CATEGORY_LABELS[svc.category]}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-sm text-foreground">
                          {formatCurrency(Number(svc.sell_price))}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">/mo</span>
                      </div>
                    </button>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
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
                <span className="text-muted-foreground">Tool MRR</span>
                <span className="font-mono font-medium">
                  {formatCurrency(pricing.total_mrr)}
                </span>
              </div>
              {addSvcTotals.count > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Add-On MRR</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(addSvcTotals.totalSell)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total MRR</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(pricing.total_mrr + addSvcTotals.totalSell)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ARR</span>
                <span className="font-mono font-medium">
                  {formatCurrency((pricing.total_mrr + addSvcTotals.totalSell) * 12)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margin</span>
                <MarginHealthBadge
                  margin={pricing.margin_pct_post_discount}
                />
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
