"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting";
import { AlertTriangle, CheckCircle2, Save, FileText, GitBranch } from "lucide-react";
import { toast } from "sonner";
import type { BundleState, PricingSnapshot, StackPricingModel } from "@/lib/stack-builder/types";

interface BundleSummaryProps {
  bundleState: BundleState;
  pricing: PricingSnapshot;
  onChange: (patch: Partial<BundleState>) => void;
}

function CountUp({ value, prefix = "", suffix = "" }: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <motion.span
      key={value.toFixed(2)}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="tabular-nums"
    >
      {prefix}{value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}
    </motion.span>
  );
}

function MetricRow({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  highlight?: "green" | "amber" | "red";
}) {
  const hlCls = {
    green: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/50 mt-0.5">{sub}</p>}
      </div>
      <div
        className={cn(
          "text-sm font-bold font-mono text-right",
          highlight ? hlCls[highlight] : "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function BundleSummary({ bundleState, pricing, onChange }: BundleSummaryProps) {
  const marginPct = Math.round(bundleState.targetMargin * 100);
  const allTools = Object.values(bundleState.selectedByCategory).flat();
  const canSave = bundleState.name.trim().length > 0 && allTools.length > 0;

  const marginHighlight =
    pricing.marginPercent >= 0.25
      ? "green"
      : pricing.marginPercent >= 0.15
        ? "amber"
        : "red";

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          Bundle Config
        </span>
      </div>

      <div className="px-4 space-y-4 py-4">
        {/* Bundle name */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Bundle Name
          </label>
          <Input
            placeholder="e.g. Essential Security Stack"
            value={bundleState.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-9 text-sm bg-muted/40 border-border focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>

        <Separator className="bg-border/40" />

        {/* Pricing model */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Pricing Model
          </label>
          <Tabs
            value={bundleState.pricingModel}
            onValueChange={(v) => onChange({ pricingModel: v as StackPricingModel })}
          >
            <TabsList className="w-full bg-muted/40 h-8 p-0.5">
              <TabsTrigger value="per-seat" className="flex-1 text-xs h-7">Per Seat</TabsTrigger>
              <TabsTrigger value="per-endpoint" className="flex-1 text-xs h-7">Per Endpoint</TabsTrigger>
              <TabsTrigger value="flat" className="flex-1 text-xs h-7">Flat Rate</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Quantity — hidden for flat */}
        <AnimatePresence>
          {bundleState.pricingModel !== "flat" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1.5 overflow-hidden"
            >
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {bundleState.pricingModel === "per-seat" ? "Seats" : "Endpoints"}
              </label>
              <Input
                type="number"
                min={1}
                value={bundleState.quantity}
                onChange={(e) =>
                  onChange({ quantity: Math.max(1, parseInt(e.target.value) || 1) })
                }
                className="h-9 text-sm font-mono bg-muted/40 border-border focus-visible:ring-1 focus-visible:ring-primary/50"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Target margin slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Target Margin
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={5}
                max={80}
                value={marginPct}
                onChange={(e) =>
                  onChange({ targetMargin: Math.max(0.05, Math.min(0.8, parseInt(e.target.value) / 100 || 0)) })
                }
                className="w-12 h-6 text-center text-xs font-mono bg-muted/40 border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <input
            type="range"
            min={5}
            max={80}
            value={marginPct}
            onChange={(e) => onChange({ targetMargin: parseInt(e.target.value) / 100 })}
            className="w-full h-1.5 appearance-none rounded-full bg-white/10 cursor-pointer accent-[#A8FF3E]"
            style={{
              background: `linear-gradient(to right, #A8FF3E ${marginPct * (100/80)}%, rgba(255,255,255,0.1) ${marginPct * (100/80)}%)`
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>5%</span>
            <span>80%</span>
          </div>
        </div>

        <Separator className="bg-border/40" />

        {/* Live metrics */}
        <div className="space-y-0 divide-y divide-border/30">
          <MetricRow
            label="Total cost / mo"
            sub={bundleState.pricingModel !== "flat" ? `${bundleState.quantity} × unit cost` : undefined}
            value={<CountUp value={pricing.totalCostMonthly} prefix="$" />}
          />
          <MetricRow
            label="Suggested sell / mo"
            value={<CountUp value={pricing.suggestedSellMonthly} prefix="$" />}
          />
          <MetricRow
            label="Margin"
            value={
              <span className="flex items-center gap-2">
                <CountUp value={pricing.marginDollars} prefix="$" />
                <span className={cn(
                  "text-xs",
                  marginHighlight === "green" ? "text-emerald-400" :
                  marginHighlight === "amber" ? "text-amber-400" : "text-red-400"
                )}>
                  ({(pricing.marginPercent * 100).toFixed(1)}%)
                </span>
              </span>
            }
            highlight={marginHighlight}
          />
          <MetricRow
            label="Stack coverage"
            value={`${pricing.categoriesFilled}/${pricing.totalCategories}`}
          />
        </div>

        {/* Margin bar */}
        {allTools.length > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  marginHighlight === "green" ? "bg-emerald-500" :
                  marginHighlight === "amber" ? "bg-amber-500" : "bg-red-500"
                )}
                animate={{ width: `${Math.min(pricing.marginPercent * 100, 100)}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
              />
            </div>
          </div>
        )}

        {/* Warnings */}
        <AnimatePresence mode="popLayout">
          {pricing.warnings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-1.5"
            >
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Warnings
              </p>
              {pricing.warnings.map((w, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs border",
                    w.type === "missing-core"
                      ? "bg-amber-500/8 border-amber-500/20 text-amber-300"
                      : w.type === "redundant-tools"
                        ? "bg-orange-500/8 border-orange-500/20 text-orange-300"
                        : "bg-red-500/8 border-red-500/20 text-red-300"
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{w.message}</span>
                </div>
              ))}
            </motion.div>
          )}
          {pricing.warnings.length === 0 && allTools.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs bg-emerald-500/8 border border-emerald-500/20 text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              Bundle looks clean — no warnings.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="px-4 pb-5 pt-3 border-t border-border space-y-2">
        <Button
          className={cn(
            "w-full text-sm font-semibold h-9",
            canSave
              ? "bg-primary hover:bg-primary/90 text-white shadow-[0_0_16px_rgba(99,102,241,0.3)]"
              : "opacity-40 cursor-not-allowed"
          )}
          disabled={!canSave}
          onClick={() => {
            if (!canSave) return;
            toast.success(`"${bundleState.name}" saved (mock)`, {
              description: `${allTools.length} tools · ${formatCurrency(pricing.suggestedSellMonthly)}/mo · ${(pricing.marginPercent * 100).toFixed(1)}% margin`,
            });
          }}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Save Bundle
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs border-border bg-white/3 hover:bg-white/6"
            onClick={() => toast.info("Create Version — connect to DB to enable")}
          >
            <GitBranch className="h-3 w-3 mr-1" />
            Version
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs border-border bg-white/3 hover:bg-white/6"
            disabled
          >
            <FileText className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
        {!canSave && (
          <p className="text-[10px] text-muted-foreground/50 text-center">
            {!bundleState.name.trim() ? "Enter a bundle name to save" : "Add at least one tool to save"}
          </p>
        )}
      </div>
    </div>
  );
}
