"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { MarginHealthBadge } from "@/components/ui/margin-health-badge";
import { CostBreakdown, mapPricingOutputToBreakdownProps } from "@/components/pricing/cost-breakdown";
import { validatePricing } from "@/lib/pricing/validate";
import { calculateAdditionalServicesMrr } from "@/lib/pricing/additional-services";
import { cn } from "@/lib/utils";
import { RISK_TIER_LABELS, RISK_TIERS } from "@/lib/constants";
import { calculatePricing } from "@/lib/pricing/engine";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { toast } from "sonner";
import {
  ChevronsUpDown,
  Briefcase,
  AlertTriangle,
  Plus,
  X,
  Pencil,
  Headphones,
  Shield,
  GraduationCap,
  FolderKanban,
} from "lucide-react";
import {
  createAdditionalServiceAction,
} from "@/actions/additional-services";
import type {
  Tool,
  RiskTier,
  PricingInput,
  PricingToolInput,
  PricingOutput,
  AdditionalService,
  AdditionalServiceCategory,
  AdditionalServiceBillingType,
  AdditionalServiceCostType,
} from "@/lib/types";

// ── Constants ────────────────────────────────────────────────────────────────

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

const BILLING_TYPE_LABELS: Record<AdditionalServiceBillingType, string> = {
  monthly: "Monthly",
  per_user: "Per User",
  per_device: "Per Device",
  per_site: "Per Site",
  hourly: "Hourly",
  one_time: "One-Time",
};

const COST_TYPE_LABELS: Record<AdditionalServiceCostType, string> = {
  internal_labor: "Internal Labor",
  subcontractor: "Subcontractor",
  zero_cost: "Zero Cost",
};

const CATEGORY_ICONS: Record<AdditionalServiceCategory, typeof Briefcase> = {
  consulting: Briefcase,
  help_desk: Headphones,
  retainer: Shield,
  training: GraduationCap,
  project: FolderKanban,
  compliance: Shield,
};

type SellStrategyType = "cost_plus_margin" | "monthly_flat_rate" | "per_endpoint_monthly" | "per_user_monthly";

const SELL_STRATEGY_OPTIONS: { value: SellStrategyType; label: string; unitLabel: string }[] = [
  { value: "per_user_monthly", label: "Per User", unitLabel: "/user/mo" },
  { value: "per_endpoint_monthly", label: "Per Endpoint", unitLabel: "/endpoint/mo" },
  { value: "monthly_flat_rate", label: "Flat Monthly", unitLabel: "/mo" },
];

// ── Service templates (for empty catalog) ────────────────────────────────────

interface ServiceTemplate {
  name: string;
  category: AdditionalServiceCategory;
  billing_type: AdditionalServiceBillingType;
  cost: number;
  sell_price: number;
}

const TEMPLATES: ServiceTemplate[] = [
  { name: "Fractional vCISO", category: "consulting", billing_type: "monthly", cost: 0, sell_price: 1500 },
  { name: "Fractional CTO", category: "consulting", billing_type: "monthly", cost: 0, sell_price: 2000 },
  { name: "Compliance Advisory", category: "compliance", billing_type: "monthly", cost: 0, sell_price: 800 },
  { name: "IR Retainer", category: "retainer", billing_type: "monthly", cost: 0, sell_price: 500 },
  { name: "Help Desk", category: "help_desk", billing_type: "per_user", cost: 8, sell_price: 22 },
  { name: "Security Training", category: "training", billing_type: "per_user", cost: 2, sell_price: 6 },
  { name: "Project Work", category: "project", billing_type: "one_time", cost: 150, sell_price: 250 },
];

// ── Props ────────────────────────────────────────────────────────────────────

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
  redZoneMarginPct: number;
  maxDiscountNoApprovalPct: number;
  toolQuantities: Record<string, number>;
  onSeatCountChange: (v: number) => void;
  onRiskTierChange: (v: RiskTier) => void;
  onContractTermChange: (v: number) => void;
  onTargetMarginChange: (v: number) => void;
  onOverheadChange: (v: number) => void;
  onLaborChange: (v: number) => void;
  onDiscountChange: (v: number) => void;
  additionalServiceOverrides: Record<string, { cost?: number; sell_price?: number }>;
  onAdditionalServicesChange: (ids: Set<string>) => void;
  onAdditionalServiceOverridesChange: (overrides: Record<string, { cost?: number; sell_price?: number }>) => void;
  sellStrategy?: SellStrategyType;
  sellConfig?: Record<string, unknown>;
  onSellStrategyChange?: (v: SellStrategyType) => void;
  onSellConfigChange?: (v: Record<string, unknown>) => void;
  toolCostOverrides: Record<string, number>;
  onToolCostOverridesChange: (overrides: Record<string, number>) => void;
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
  redZoneMarginPct,
  maxDiscountNoApprovalPct,
  toolQuantities,
  onSeatCountChange,
  onRiskTierChange,
  onContractTermChange,
  onTargetMarginChange,
  onOverheadChange,
  onLaborChange,
  onDiscountChange,
  additionalServiceOverrides,
  onAdditionalServicesChange,
  onAdditionalServiceOverridesChange,
  sellStrategy,
  sellConfig,
  onSellStrategyChange,
  onSellConfigChange,
  toolCostOverrides,
  onToolCostOverridesChange,
}: StepEconomicsProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pricingMode, setPricingMode] = useState<"set_price" | "use_margin">(
    sellStrategy && sellStrategy !== "cost_plus_margin" ? "set_price" : "use_margin"
  );

  // Bug 6 fix: Track sell strategy type for "Set My Price" mode
  const [directSellStrategy, setDirectSellStrategy] = useState<SellStrategyType>(
    sellStrategy && sellStrategy !== "cost_plus_margin" ? sellStrategy : "per_user_monthly"
  );

  const [directSellPrice, setDirectSellPrice] = useState<number>(
    () => {
      if (sellConfig && typeof sellConfig === "object") {
        const cfg = sellConfig as Record<string, number>;
        return cfg.per_user_sell_price ?? cfg.per_endpoint_sell_price ?? cfg.monthly_flat_price ?? 0;
      }
      return 0;
    }
  );

  // Bug 5 fix: Sync directSellPrice when sellConfig prop changes (e.g. on resume)
  useEffect(() => {
    if (sellConfig && typeof sellConfig === "object") {
      const cfg = sellConfig as Record<string, number>;
      const val = cfg.per_user_sell_price ?? cfg.per_endpoint_sell_price ?? cfg.monthly_flat_price;
      if (val !== undefined && val > 0) {
        setDirectSellPrice(val);
      }
    }
  }, [sellConfig]);

  // Additional services sheet state
  const [addSvcSheetOpen, setAddSvcSheetOpen] = useState(false);
  const [addSvcTab, setAddSvcTab] = useState<"catalog" | "create">("catalog");
  const [templateForCreateState, setTemplateForCreate] = useState<ServiceTemplate | null>(null);

  // Price overrides for additional services (bundle-level, lifted to wizard shell)
  const priceOverrides = additionalServiceOverrides;

  // Auto-open advanced section if any advanced field has been changed from defaults
  useEffect(() => {
    const stored = localStorage.getItem(ADVANCED_KEY);
    const hasNonDefaultAdvanced =
      riskTier !== "medium" ||
      contractTermMonths !== 12 ||
      overheadPct !== 0.10 ||
      laborPct !== 0.15 ||
      discountPct !== 0;
    if (stored === "true" || hasNonDefaultAdvanced) setAdvancedOpen(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleAdvanced(open: boolean) {
    setAdvancedOpen(open);
    localStorage.setItem(ADVANCED_KEY, String(open));
  }

  const selectedTools = useMemo(
    () => tools.filter((t) => selectedToolIds.has(t.id)),
    [tools, selectedToolIds]
  );

  // Bug 3 fix: Use toolQuantities for quantity_multiplier
  // Bug 1 fix: Use org settings for red_zone and max_discount
  // Bug 6 fix: Use directSellStrategy instead of hardcoded per_user_monthly
  const pricing = useMemo((): PricingOutput | null => {
    if (selectedTools.length === 0) return null;

    const pricingTools: PricingToolInput[] = selectedTools.map((tool) => {
      const override = toolCostOverrides[tool.id];
      return {
        id: tool.id,
        name: tool.name,
        pricing_model: override != null ? "per_seat" as const : tool.pricing_model,
        per_seat_cost: override != null ? override : Number(tool.per_seat_cost),
        flat_monthly_cost: override != null ? 0 : Number(tool.flat_monthly_cost),
        tier_rules: override != null ? [] : (tool.tier_rules ?? []),
        vendor_minimum_monthly: override != null ? null : (tool.vendor_minimum_monthly
          ? Number(tool.vendor_minimum_monthly)
          : null),
        labor_cost_per_seat: tool.labor_cost_per_seat
          ? Number(tool.labor_cost_per_seat)
          : null,
        quantity_multiplier: toolQuantities[tool.id] ?? 1,
        annual_flat_cost: override != null ? 0 : tool.annual_flat_cost,
        per_user_cost: override != null ? 0 : tool.per_user_cost,
        per_org_cost: override != null ? 0 : tool.per_org_cost,
        percent_discount: override != null ? 0 : tool.percent_discount,
        flat_discount: override != null ? 0 : tool.flat_discount,
        min_monthly_commit: override != null ? null : tool.min_monthly_commit,
        tier_metric: override != null ? undefined : tool.tier_metric,
      };
    });

    const input: PricingInput = {
      tools: pricingTools,
      seat_count: seatCount,
      target_margin_pct: targetMarginPct,
      overhead_pct: overheadPct,
      labor_pct: laborPct,
      discount_pct: discountPct,
      red_zone_margin_pct: redZoneMarginPct,
      max_discount_no_approval_pct: maxDiscountNoApprovalPct,
      contract_term_months: contractTermMonths,
      ...(pricingMode === "set_price" && directSellPrice > 0
        ? {
            sell_config: {
              strategy: directSellStrategy,
              ...(directSellStrategy === "per_user_monthly" ? { per_user_sell_price: directSellPrice } : {}),
              ...(directSellStrategy === "per_endpoint_monthly" ? { per_endpoint_sell_price: directSellPrice } : {}),
              ...(directSellStrategy === "monthly_flat_rate" ? { monthly_flat_price: directSellPrice } : {}),
            },
          }
        : {}),
    };

    try {
      return calculatePricing(input);
    } catch {
      return null;
    }
  }, [selectedTools, seatCount, targetMarginPct, overheadPct, laborPct, discountPct, contractTermMonths, pricingMode, directSellPrice, directSellStrategy, toolQuantities, redZoneMarginPct, maxDiscountNoApprovalPct, toolCostOverrides]);

  // Bug 2 fix: Use calculateAdditionalServicesMrr instead of naive reduce
  const selectedAddSvcs = useMemo(
    () => additionalServices.filter((s) => selectedAdditionalServiceIds.has(s.id)),
    [additionalServices, selectedAdditionalServiceIds]
  );

  const addSvcTotals = useMemo(() => {
    if (selectedAddSvcs.length === 0) {
      return { total_mrr: 0, total_cost_mrr: 0, breakdown: [], count: 0 };
    }
    const result = calculateAdditionalServicesMrr(
      selectedAddSvcs.map((s) => ({
        service_id: s.id,
        service_name: s.name,
        billing_type: s.billing_type,
        cost: Number(s.cost),
        sell_price: Number(s.sell_price),
        cost_override: priceOverrides[s.id]?.cost ?? null,
        sell_price_override: priceOverrides[s.id]?.sell_price ?? null,
        quantity: 1,
      })),
      { endpoints: seatCount, users: seatCount, org_count: 1 }
    );
    return { ...result, count: selectedAddSvcs.length };
  }, [selectedAddSvcs, seatCount, priceOverrides]);

  // Bug 1 fix: Use org settings instead of hardcoded values
  const validationWarnings = useMemo(() => {
    if (!pricing) return [];
    return validatePricing(pricing, {
      targetMarginPct,
      redZoneMarginPct,
      maxDiscountNoApprovalPct,
      discountPct,
    });
  }, [pricing, targetMarginPct, discountPct, redZoneMarginPct, maxDiscountNoApprovalPct]);

  function handleAddService(svc: AdditionalService) {
    const next = new Set(selectedAdditionalServiceIds);
    next.add(svc.id);
    onAdditionalServicesChange(next);
    setAddSvcSheetOpen(false);
  }

  function handleRemoveService(id: string) {
    const next = new Set(selectedAdditionalServiceIds);
    next.delete(id);
    onAdditionalServicesChange(next);
    // Clean up any overrides
    const copy = { ...priceOverrides };
    delete copy[id];
    onAdditionalServiceOverridesChange(copy);
  }

  function handlePriceOverride(serviceId: string, field: "cost" | "sell_price", value: number) {
    onAdditionalServiceOverridesChange({
      ...priceOverrides,
      [serviceId]: { ...priceOverrides[serviceId], [field]: value },
    });
  }

  // Bug 6 fix: Build the correct sell_config based on selected strategy
  function buildSellConfig(strategy: SellStrategyType, price: number): Record<string, unknown> {
    switch (strategy) {
      case "per_user_monthly":
        return { strategy: "per_user_monthly", per_user_sell_price: price };
      case "per_endpoint_monthly":
        return { strategy: "per_endpoint_monthly", per_endpoint_sell_price: price };
      case "monthly_flat_rate":
        return { strategy: "monthly_flat_rate", monthly_flat_price: price };
      default:
        return {};
    }
  }

  function handleDirectSellStrategyChange(strategy: SellStrategyType) {
    setDirectSellStrategy(strategy);
    onSellStrategyChange?.(strategy);
    if (directSellPrice > 0) {
      onSellConfigChange?.(buildSellConfig(strategy, directSellPrice));
    }
  }

  function handleDirectSellPriceChange(val: number) {
    setDirectSellPrice(val);
    onSellStrategyChange?.(directSellStrategy);
    onSellConfigChange?.(buildSellConfig(directSellStrategy, val));
  }

  const currentUnitLabel = SELL_STRATEGY_OPTIONS.find((o) => o.value === directSellStrategy)?.unitLabel ?? "/user/mo";

  // Services available in catalog but not yet selected
  const availableServices = useMemo(
    () => additionalServices.filter((s) => !selectedAdditionalServiceIds.has(s.id)),
    [additionalServices, selectedAdditionalServiceIds]
  );

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
          {/* ── Simple fields (always visible) ──────────────────────── */}
          <div className="space-y-2">
            <Label>How many seats does this service cover?</Label>
            <Input
              type="number"
              min={1}
              value={seatCount}
              onChange={(e) => onSeatCountChange(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Pricing mode toggle */}
          <div className="space-y-3">
            <Label>How do you set your price?</Label>
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 w-fit">
              <button
                type="button"
                onClick={() => {
                  setPricingMode("set_price");
                  onSellStrategyChange?.(directSellStrategy);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  pricingMode === "set_price"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                I know my price
              </button>
              <button
                type="button"
                onClick={() => {
                  setPricingMode("use_margin");
                  onSellStrategyChange?.("cost_plus_margin");
                  onSellConfigChange?.({});
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  pricingMode === "use_margin"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Help me calculate my price
              </button>
            </div>
          </div>

          {pricingMode === "set_price" ? (
            <div className="space-y-3">
              {/* Bug 6 fix: Strategy selector for "Set My Price" */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">How do you price this service?</Label>
                <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 w-fit">
                  {SELL_STRATEGY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleDirectSellStrategyChange(opt.value)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        directSellStrategy === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Label>
                {directSellStrategy === "monthly_flat_rate"
                  ? "What monthly price do you want to charge?"
                  : directSellStrategy === "per_endpoint_monthly"
                    ? "What price per endpoint / mo?"
                    : "What price per seat / mo?"}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono text-muted-foreground">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={directSellPrice || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    handleDirectSellPriceChange(val);
                  }}
                  placeholder="0.00"
                  className="w-40 h-12 rounded-lg border border-border bg-background px-3 text-2xl font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="text-sm text-muted-foreground">{currentUnitLabel}</span>
              </div>
              {pricing && directSellPrice > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Your estimated margin:</span>
                  <MarginHealthBadge margin={pricing.margin_pct_post_discount} />
                </div>
              )}
              {pricing && directSellPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  Your monthly revenue: {formatCurrency(pricing.total_mrr)}
                </p>
              )}
              {pricing && directSellPrice > 0 && directSellStrategy !== "monthly_flat_rate" && directSellPrice < pricing.true_cost_per_seat && (
                <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-red-400">
                    Sell price is below your cost floor of {formatCurrency(pricing.true_cost_per_seat)}/seat.
                  </p>
                </div>
              )}
              {pricing && (
                <p className="text-xs text-muted-foreground">
                  Cost floor: {formatCurrency(pricing.true_cost_per_seat)}/seat
                </p>
              )}
            </div>
          ) : (
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
              {pricing && (
                <div className="space-y-1">
                  {pricing.suggested_price_per_seat > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Suggested price: {formatCurrency(pricing.suggested_price_per_seat)}/seat{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setDirectSellPrice(pricing.suggested_price_per_seat);
                          setPricingMode("set_price");
                          setDirectSellStrategy("per_user_monthly");
                          onSellStrategyChange?.("per_user_monthly");
                          onSellConfigChange?.({
                            strategy: "per_user_monthly",
                            per_user_sell_price: pricing.suggested_price_per_seat,
                          });
                        }}
                        className="text-primary hover:underline ml-1"
                      >
                        lock this price
                      </button>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your estimated margin: {formatPercent(pricing.margin_pct_post_discount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your monthly revenue: {formatCurrency(pricing.total_mrr)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Advanced options ─────────────────────────────────────── */}
          <Collapsible open={advancedOpen} onOpenChange={toggleAdvanced}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-white/5 transition-colors">
              <span className="font-medium text-foreground">
                {advancedOpen ? "\u2212 Hide advanced options" : "+ Show advanced options"}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 space-y-4 rounded-lg border-l-2 border-primary/20 bg-muted/10 pl-4 pr-2 py-3">
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
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Additional Services (Part 3) ──────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Add-On Services</span>
                {addSvcTotals.count > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {addSvcTotals.count}
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  setAddSvcTab("catalog");
                  setAddSvcSheetOpen(true);
                }}
              >
                <Plus className="h-3 w-3" />
                Add Service
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Services bundled into this package alongside your technical stack
            </p>

            {selectedAddSvcs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">No add-on services added.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add consulting, retainers, or advisory services that are delivered as part of this offering.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Billing</TableHead>
                      <TableHead className="text-xs">Sell Price</TableHead>
                      <TableHead className="text-xs">Margin</TableHead>
                      <TableHead className="text-xs w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedAddSvcs.map((svc) => {
                      const override = priceOverrides[svc.id];
                      const effectiveSellPrice = override?.sell_price ?? Number(svc.sell_price);
                      const effectiveCost = override?.cost ?? Number(svc.cost);
                      const margin = effectiveSellPrice > 0
                        ? (effectiveSellPrice - effectiveCost) / effectiveSellPrice
                        : 0;
                      const isPerUnit = svc.billing_type === "per_user" || svc.billing_type === "per_device";
                      const mrrForService = isPerUnit ? effectiveSellPrice * seatCount : effectiveSellPrice;
                      const hasOverride = override?.sell_price !== undefined && override.sell_price !== Number(svc.sell_price);

                      return (
                        <TableRow key={svc.id} className="border-border/30">
                          <TableCell>
                            <span className="text-sm font-medium text-foreground/90">{svc.name}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {BILLING_TYPE_LABELS[svc.billing_type]}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <WizardInlinePriceEditor
                                value={effectiveSellPrice}
                                unit={isPerUnit ? `/${svc.billing_type === "per_user" ? "user" : "device"}` : "/mo"}
                                onSave={(val) => handlePriceOverride(svc.id, "sell_price", val)}
                              />
                              {isPerUnit && (
                                <span className="text-[10px] text-muted-foreground block">
                                  ({formatCurrency(mrrForService)}/mo)
                                </span>
                              )}
                              {hasOverride && (
                                <span className="text-[10px] text-muted-foreground/60 block">
                                  catalog: {formatCurrency(Number(svc.sell_price))}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <MarginHealthBadge margin={margin} showLabel={false} />
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => handleRemoveService(svc.id)}
                              className="p-1 rounded hover:bg-destructive/10 transition-colors"
                            >
                              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/10">
                  <span className="text-xs font-medium text-muted-foreground">Add-On Services MRR</span>
                  <span className="text-sm font-bold font-mono text-foreground">
                    {formatCurrency(addSvcTotals.total_mrr)}/mo
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="rounded-xl border border-border bg-card p-5 h-fit sticky top-20">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pricing Preview</h3>
          {pricing ? (
            <div className="space-y-3">
              <CostBreakdown
                pricing={mapPricingOutputToBreakdownProps(pricing, seatCount)}
                seatCount={seatCount}
                mode="full"
                discountPct={discountPct}
                additionalServices={selectedAddSvcs.map((s) => ({
                  name: s.name,
                  sellPrice: addSvcTotals.breakdown.find((b) => b.service_id === s.id)?.monthly_revenue ?? Number(s.sell_price),
                  costPrice: addSvcTotals.breakdown.find((b) => b.service_id === s.id)?.monthly_cost ?? Number(s.cost),
                }))}
                toolCostOverrides={toolCostOverrides}
                onToolCostOverride={(toolId, cost) => {
                  if (cost === null) {
                    const next = { ...toolCostOverrides };
                    delete next[toolId];
                    onToolCostOverridesChange(next);
                  } else {
                    onToolCostOverridesChange({ ...toolCostOverrides, [toolId]: cost });
                  }
                }}
              />
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
              {validationWarnings.length > 0 && (
                <div className="mt-3 space-y-1">
                  {validationWarnings.map((w) => (
                    <div
                      key={w.code}
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        w.severity === "error"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                      )}
                    >
                      {w.message}
                    </div>
                  ))}
                </div>
              )}
              {addSvcTotals.total_mrr > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tool Stack MRR</span>
                    <span className="font-mono">{formatCurrency(pricing.total_mrr)}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-muted-foreground">Add-On Services MRR</span>
                    <span className="font-mono">{formatCurrency(addSvcTotals.total_mrr)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-border/30">
                    <span>Total MRR</span>
                    <span className="font-mono">{formatCurrency(pricing.total_mrr + addSvcTotals.total_mrr)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select tools to see pricing</p>
          )}
        </div>
      </div>

      {/* ── Additional Services Sheet (Part 3) ──────────────────────────── */}
      <Sheet open={addSvcSheetOpen} onOpenChange={setAddSvcSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Service</SheetTitle>
            <SheetDescription>
              Select from your catalog or create a new service.
            </SheetDescription>
          </SheetHeader>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 w-fit mt-4">
            <button
              type="button"
              onClick={() => setAddSvcTab("catalog")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                addSvcTab === "catalog"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              From Catalog
            </button>
            <button
              type="button"
              onClick={() => setAddSvcTab("create")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                addSvcTab === "create"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Create New
            </button>
          </div>

          {addSvcTab === "catalog" ? (
            <div className="mt-4 space-y-2">
              {availableServices.length > 0 ? (
                availableServices.map((svc) => {
                  const margin = Number(svc.sell_price) > 0
                    ? (Number(svc.sell_price) - Number(svc.cost)) / Number(svc.sell_price)
                    : 0;
                  return (
                    <div
                      key={svc.id}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {svc.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] shrink-0", ADD_SVC_CATEGORY_COLORS[svc.category])}
                          >
                            {ADD_SVC_CATEGORY_LABELS[svc.category]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>{BILLING_TYPE_LABELS[svc.billing_type]}</span>
                          <span className="font-mono">{formatCurrency(Number(svc.sell_price))}</span>
                          <MarginHealthBadge margin={margin} showLabel={false} />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => handleAddService(svc)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  );
                })
              ) : additionalServices.length === 0 ? (
                // No services in catalog at all — show templates
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    No services in your catalog yet. Start from a template — these will be added to your catalog and included in this package.
                  </p>
                  <div className="grid gap-2 grid-cols-1">
                    {TEMPLATES.map((tmpl) => {
                      const Icon = CATEGORY_ICONS[tmpl.category];
                      const margin = tmpl.sell_price > 0
                        ? (tmpl.sell_price - tmpl.cost) / tmpl.sell_price
                        : 0;
                      return (
                        <TemplateCard
                          key={tmpl.name}
                          template={tmpl}
                          Icon={Icon}
                          margin={margin}
                          onSelect={() => {
                            setAddSvcTab("create");
                            // Pre-populate form with template
                            setTemplateForCreate(tmpl);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">All catalog services have been added.</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => setAddSvcTab("create")}
                  >
                    Create a new service
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <WizardServiceForm
              template={templateForCreateState}
              onSuccess={(newService) => {
                handleAddService(newService);
                setTemplateForCreate(null);
              }}
              onCancel={() => {
                setAddSvcTab("catalog");
                setTemplateForCreate(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );

}

// ── Inline price editor for wizard (does NOT call server action) ─────────────

function WizardInlinePriceEditor({
  value,
  unit,
  onSave,
}: {
  value: number;
  unit: string;
  onSave: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  if (editing) {
    return (
      <span className="inline-flex items-baseline gap-0.5">
        <span className="text-muted-foreground font-mono text-sm">$</span>
        <input
          type="number"
          step="0.01"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = parseFloat(draft);
            if (!isNaN(n) && n >= 0 && n !== value) onSave(n);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const n = parseFloat(draft);
              if (!isNaN(n) && n >= 0 && n !== value) onSave(n);
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
          className="bg-transparent font-mono text-sm text-foreground outline-none border-b border-[#A8FF3E] appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-16"
        />
        {unit && <span className="text-muted-foreground text-[10px]">{unit}</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="group inline-flex items-baseline gap-0.5 cursor-pointer text-left"
    >
      <span className="font-mono text-sm">{formatCurrency(value)}</span>
      {unit && <span className="text-muted-foreground text-[10px]">{unit}</span>}
      <Pencil className="h-2.5 w-2.5 ml-0.5 opacity-0 group-hover:opacity-40 transition-opacity text-[#A8FF3E]" />
    </button>
  );
}

// ── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  Icon,
  margin,
  onSelect,
}: {
  template: ServiceTemplate;
  Icon: typeof Briefcase;
  margin: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-lg border border-border p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-all w-full"
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{template.name}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">
          {ADD_SVC_CATEGORY_LABELS[template.category]}
        </Badge>
        <span>{BILLING_TYPE_LABELS[template.billing_type]}</span>
        <span className="ml-auto font-mono">{formatCurrency(template.sell_price)}</span>
        <MarginHealthBadge margin={margin} showLabel={false} />
      </div>
    </button>
  );
}

// ── Wizard Service Form (creates in catalog + adds to wizard) ────────────────

function WizardServiceForm({
  template,
  onSuccess,
  onCancel,
}: {
  template: ServiceTemplate | null;
  onSuccess: (service: AdditionalService) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState<AdditionalServiceCategory>(template?.category ?? "consulting");
  const [description, setDescription] = useState("");
  const [billingType, setBillingType] = useState<AdditionalServiceBillingType>(template?.billing_type ?? "monthly");
  const [costType, setCostType] = useState<AdditionalServiceCostType>(
    template && template.cost === 0 ? "zero_cost" : "internal_labor"
  );
  const [cost, setCost] = useState(String(template?.cost ?? 0));
  const [sellPrice, setSellPrice] = useState(String(template?.sell_price ?? 0));
  const [notes, setNotes] = useState("");

  const costNum = parseFloat(cost) || 0;
  const sellNum = parseFloat(sellPrice) || 0;
  const liveMargin = sellNum > 0
    ? (sellNum - (costType === "zero_cost" ? 0 : costNum)) / sellNum
    : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = {
      name: name.trim(),
      category,
      description: description.trim() || null,
      billing_type: billingType,
      cost_type: costType,
      cost: costType === "zero_cost" ? 0 : costNum,
      sell_price: sellNum,
      notes: notes.trim() || null,
    };

    startTransition(async () => {
      const result = await createAdditionalServiceAction(formData);
      if (result.success) {
        toast.success("Service created and added");
        router.refresh();
        onSuccess(result.data);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as AdditionalServiceCategory)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(ADD_SVC_CATEGORY_LABELS) as AdditionalServiceCategory[]).map((c) => (
              <SelectItem key={c} value={c}>{ADD_SVC_CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional description"
        />
      </div>

      <div className="space-y-2">
        <Label>Billing Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(BILLING_TYPE_LABELS) as AdditionalServiceBillingType[]).map((bt) => (
            <Button
              key={bt}
              type="button"
              variant={billingType === bt ? "secondary" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setBillingType(bt)}
            >
              {BILLING_TYPE_LABELS[bt]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cost Type</Label>
        <div className="flex gap-3">
          {(Object.keys(COST_TYPE_LABELS) as AdditionalServiceCostType[]).map((ct) => (
            <label key={ct} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="cost_type"
                value={ct}
                checked={costType === ct}
                onChange={() => setCostType(ct)}
                className="accent-primary"
              />
              {COST_TYPE_LABELS[ct]}
            </label>
          ))}
        </div>
      </div>

      {costType !== "zero_cost" && (
        <div className="space-y-2">
          <Label>Cost ($)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Sell Price ($) *</Label>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          required
        />
      </div>

      {/* Live margin preview */}
      <div className="rounded-lg border border-border p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Estimated Margin</span>
          <MarginHealthBadge margin={liveMargin} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Internal Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Internal notes (not visible to clients)"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Creating..." : "Create & Add"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
