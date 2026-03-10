"use client";

import { useMemo, useState } from "react";
import { Check, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import {
  VENDOR_CATALOG,
  ENDPOINT_RANGE_LABELS,
  ENDPOINT_RANGE_VALUES,
} from "@/lib/onboarding/vendor-catalog";
import { CATEGORY_LABELS } from "@/lib/constants";
import { normalizeToMonthly } from "@/lib/pricing/engine";
import type { ToolCategory, BundleAssumptions, SellStrategy } from "@/lib/types";

const CORE_CATEGORIES: ToolCategory[] = ["edr", "mfa", "email_security", "backup"];

const SELL_STRATEGIES: { value: SellStrategy; label: string; hint: string }[] = [
  { value: "cost_plus_margin", label: "Cost + Margin %", hint: "Recommended" },
  { value: "per_endpoint_monthly", label: "Per Endpoint / mo", hint: "Predictable" },
  { value: "monthly_flat_rate", label: "Flat Monthly Rate", hint: "Simple" },
];

interface StepLaunchProps {
  workspaceName: string;
  selectedVendorIds: string[];
  // Pricing prefs
  endpointRange: "small" | "smb" | "mid" | "enterprise";
  sellStrategy: SellStrategy;
  targetMarginPct: number;
  // Advanced defaults
  overheadPct: number;
  laborPct: number;
  redZonePct: number;
  maxDiscountPct: number;
  // Pending state
  isPending: boolean;
  // Callbacks
  onEndpointRangeChange: (v: string) => void;
  onSellStrategyChange: (v: SellStrategy) => void;
  onTargetMarginPctChange: (v: number) => void;
  onOverheadPctChange: (v: number) => void;
  onLaborPctChange: (v: number) => void;
  onRedZonePctChange: (v: number) => void;
  onMaxDiscountPctChange: (v: number) => void;
}

export function StepLaunch({
  workspaceName,
  selectedVendorIds,
  endpointRange,
  sellStrategy,
  targetMarginPct,
  overheadPct,
  laborPct,
  redZonePct,
  maxDiscountPct,
  isPending,
  onEndpointRangeChange,
  onSellStrategyChange,
  onTargetMarginPctChange,
  onOverheadPctChange,
  onLaborPctChange,
  onRedZonePctChange,
  onMaxDiscountPctChange,
}: StepLaunchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedVendors = VENDOR_CATALOG.filter((v) => selectedVendorIds.includes(v.id));
  const endpoints = ENDPOINT_RANGE_VALUES[endpointRange] ?? 50;

  const assumptions: BundleAssumptions = {
    endpoints,
    users: endpoints,
    headcount: Math.round(endpoints * 1.5),
    org_count: 1,
  };

  const { totalCost, coveredCategories, missingCore } = useMemo(() => {
    const covered = new Set(selectedVendors.map((v) => v.category as ToolCategory));
    const missing = CORE_CATEGORIES.filter((c) => !covered.has(c));
    let cost = 0;
    for (const v of selectedVendors) {
      cost += normalizeToMonthly(
        {
          id: v.id,
          name: v.name,
          pricing_model: v.pricing_model,
          per_seat_cost: v.per_seat_cost,
          flat_monthly_cost: v.flat_monthly_cost,
          annual_flat_cost: v.annual_flat_cost,
          per_user_cost: v.per_user_cost,
          per_org_cost: v.per_org_cost,
          tier_rules: v.tier_rules,
          tier_metric: v.tier_metric,
          vendor_minimum_monthly: v.vendor_minimum_monthly,
          labor_cost_per_seat: null,
          quantity_multiplier: 1,
        },
        assumptions
      );
    }
    return { totalCost: cost, coveredCategories: covered, missingCore: missing };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVendors, endpoints]);

  const suggestedPrice =
    targetMarginPct < 1 ? totalCost / (1 - targetMarginPct) : totalCost;
  const grossProfit = suggestedPrice - totalCost;
  const marginPct = suggestedPrice > 0 ? grossProfit / suggestedPrice : 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Almost ready, {workspaceName.split(" ")[0] || "there"}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Set your default pricing profile and launch. Everything can be changed later.
        </p>
      </div>

      {/* ── Typical client size ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Typical client size</Label>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(ENDPOINT_RANGE_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onEndpointRangeChange(key)}
              className={cn(
                "rounded-lg border px-2.5 py-2.5 text-center transition-all duration-150 text-xs",
                "hover:border-primary/40 hover:bg-primary/5",
                endpointRange === key
                  ? "border-primary/60 bg-primary/8 text-primary font-semibold shadow-[0_0_0_1px_oklch(0.65_0.18_250/0.3)]"
                  : "border-border bg-card/60 text-foreground/80"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pricing model ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">How you price for clients</Label>
        <div className="grid grid-cols-3 gap-2">
          {SELL_STRATEGIES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onSellStrategyChange(s.value)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-all duration-150",
                "hover:border-primary/40 hover:bg-primary/5",
                sellStrategy === s.value
                  ? "border-primary/60 bg-primary/8 shadow-[0_0_0_1px_oklch(0.65_0.18_250/0.3)]"
                  : "border-border bg-card/60"
              )}
            >
              <p className="text-xs font-semibold text-foreground leading-tight">{s.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.hint}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Target margin ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">
          Target margin{" "}
          <span
            className={cn(
              "ml-1 font-bold tabular-nums",
              marginPct >= 0.3 ? "text-emerald-400" : marginPct >= 0.15 ? "text-amber-400" : "text-red-400"
            )}
          >
            {Math.round(targetMarginPct * 100)}%
          </span>
        </Label>
        <input
          type="range"
          min={10}
          max={70}
          step={5}
          value={Math.round(targetMarginPct * 100)}
          onChange={(e) => onTargetMarginPctChange(Number(e.target.value) / 100)}
          className="w-full accent-primary"
        />
        <p className="text-xs text-muted-foreground">
          Industry sweet spot: 30–45%.{" "}
          {targetMarginPct >= 0.3 && targetMarginPct <= 0.45 && (
            <span className="text-emerald-400">You&apos;re in the healthy range.</span>
          )}
          {targetMarginPct < 0.3 && (
            <span className="text-amber-400">Below 30% — consider tightening tooling costs.</span>
          )}
          {targetMarginPct > 0.45 && (
            <span className="text-amber-400">Above 45% — check your pricing stays competitive.</span>
          )}
        </p>
      </div>

      {/* ── Live pricing preview ────────────────────────────────────────────── */}
      {selectedVendors.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Preview @ {ENDPOINT_RANGE_LABELS[endpointRange]}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Your cost</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(totalCost)}
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sell price</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(suggestedPrice)}
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gross margin</p>
              <p
                className={cn(
                  "text-lg font-bold",
                  marginPct >= 0.3 ? "text-emerald-400" : marginPct >= 0.15 ? "text-amber-400" : "text-red-400"
                )}
              >
                {formatPercent(marginPct)}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              {selectedVendors.length} tool{selectedVendors.length !== 1 ? "s" : ""} ·{" "}
              {coveredCategories.size} categories ·{" "}
              {coveredCategories.size > 0
                ? Array.from(coveredCategories)
                    .slice(0, 3)
                    .map((c) => CATEGORY_LABELS[c as ToolCategory])
                    .join(", ") + (coveredCategories.size > 3 ? ` +${coveredCategories.size - 3} more` : "")
                : "No tools selected yet"}
            </p>
          </div>
        </div>
      )}

      {/* ── Missing core warning ────────────────────────────────────────────── */}
      {missingCore.length > 0 && selectedVendors.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3.5 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-400/90">
            Missing core categories:{" "}
            <strong>{missingCore.map((c) => CATEGORY_LABELS[c]).join(", ")}</strong>. You can add tools after setup.
          </p>
        </div>
      )}

      {/* ── What gets created ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card/60 px-4 py-3 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          We&apos;ll create
        </p>
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span>
            <strong>{selectedVendors.length}</strong> tool{selectedVendors.length !== 1 ? "s" : ""} in your catalog
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span>
            Service: <strong>Standard Security Stack</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span>
            Scenario: <strong>{ENDPOINT_RANGE_LABELS[endpointRange]}</strong> defaults
          </span>
        </div>
      </div>

      {/* ── Advanced defaults (collapsible) ────────────────────────────────── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.02] transition-colors"
        >
          <span className="font-medium">Advanced pricing defaults</span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {showAdvanced && (
          <div className="border-t border-border px-4 py-3 space-y-0">
            {[
              { id: "overhead", label: "Overhead %", hint: "Ops costs beyond tool cost", value: overheadPct, onChange: onOverheadPctChange, max: 50 },
              { id: "labor", label: "Labor %", hint: "Tech time per bundle", value: laborPct, onChange: onLaborPctChange, max: 60 },
              { id: "redzone", label: "Red Zone Margin", hint: "Warn below this threshold", value: redZonePct, onChange: onRedZonePctChange, max: 40 },
              { id: "maxdiscount", label: "Max Discount (no approval)", hint: "Above this requires manager sign-off", value: maxDiscountPct, onChange: onMaxDiscountPctChange, max: 50 },
            ].map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-4 py-2.5 border-b border-border/40 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.hint}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Input
                    type="number"
                    min={0}
                    max={row.max}
                    step={1}
                    value={Math.round(row.value * 100)}
                    onChange={(e) =>
                      row.onChange(
                        Math.min(row.max / 100, Math.max(0, Number(e.target.value) / 100))
                      )
                    }
                    className="w-16 h-8 text-center text-sm"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isPending && (
        <div className="flex items-center justify-center gap-2 py-1 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Setting up your workspace…
        </div>
      )}
    </div>
  );
}
