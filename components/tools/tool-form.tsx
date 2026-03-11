"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

import { toolFormSchema, type ToolFormValues } from "@/lib/schemas/tool";
import {
  normalizeToMonthly,
  annotateNormalization,
} from "@/lib/pricing/engine";
import {
  TOOL_CATEGORIES,
  CATEGORY_LABELS,
  PRICING_MODEL_LABELS,
  PRICING_MODELS,
  TIER_METRIC_LABELS,
  TIER_METRICS,
} from "@/lib/constants";
import type { TierMetric } from "@/lib/types";
import { createToolAction, updateToolAction, deactivateToolAction } from "@/actions/tools";
import { formatCurrency } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Tool, PricingToolInput, ToolCategory } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const PREVIEW_ASSUMPTIONS = { endpoints: 30, users: 30, headcount: 30, org_count: 1 };
const PREVIEW_SELL_MONTHLY = 15 * 30; // $15/endpoint × 30 = $450 implied sell

// ── Helpers ───────────────────────────────────────────────────────────────────

function formValuesToInput(values: ToolFormValues): PricingToolInput {
  return {
    id: "preview",
    name: values.name || "Preview",
    pricing_model: values.pricing_model,
    per_seat_cost: values.per_seat_cost ?? 0,
    flat_monthly_cost: values.flat_monthly_cost ?? 0,
    tier_rules: values.tier_rules ?? [],
    vendor_minimum_monthly: values.vendor_minimum_monthly ?? null,
    labor_cost_per_seat: values.labor_cost_per_seat ?? null,
    quantity_multiplier: 1,
    annual_flat_cost: values.annual_flat_cost ?? 0,
    per_user_cost: values.per_user_cost ?? 0,
    per_org_cost: values.per_org_cost ?? 0,
    percent_discount: values.percent_discount ?? 0,
    flat_discount: values.flat_discount ?? 0,
    min_monthly_commit: values.min_monthly_commit ?? null,
    tier_metric: values.tier_metric as TierMetric | undefined,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SectionToggleProps {
  label: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  label,
  hint,
  open,
  onToggle,
  children,
}: SectionToggleProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-white/[0.01] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          <span className="font-medium">{label}</span>
        </div>
        {!open && (
          <span className="text-[10px] text-muted-foreground/35">{hint}</span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-4 border-t border-border/30 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest"
    >
      {children}
    </Label>
  );
}

// ── Live Preview Panel ────────────────────────────────────────────────────────

function PreviewPanel({ values }: { values: ToolFormValues }) {
  const previewInput = formValuesToInput(values);
  const monthlyCost = normalizeToMonthly(previewInput, PREVIEW_ASSUMPTIONS);
  const annotation = annotateNormalization(previewInput, PREVIEW_ASSUMPTIONS);
  const hasData = monthlyCost > 0;

  const grossMarginPct =
    PREVIEW_SELL_MONTHLY > 0
      ? (PREVIEW_SELL_MONTHLY - monthlyCost) / PREVIEW_SELL_MONTHLY
      : 0;
  const marginColor =
    grossMarginPct > 0.3
      ? "emerald"
      : grossMarginPct > 0.15
        ? "amber"
        : "red";

  const perUnitLabel = (() => {
    if (!hasData) return null;
    switch (values.pricing_model) {
      case "per_seat":
        return `${formatCurrency(monthlyCost / PREVIEW_ASSUMPTIONS.endpoints)} per endpoint`;
      case "per_user":
        return `${formatCurrency(monthlyCost / PREVIEW_ASSUMPTIONS.users)} per user`;
      case "flat_monthly":
      case "per_org":
        return "flat — not per-unit";
      case "annual_flat":
      case "tiered_by_metric":
        return null; // annotation handles this
      default:
        return null;
    }
  })();

  return (
    <div className="rounded-xl border border-border bg-white/[0.025] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center">
          <TrendingUp className="h-3 w-3 text-primary" />
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          Live Preview
        </span>
      </div>

      {/* Main cost */}
      <div>
        <p className="text-[10px] text-muted-foreground/40 mb-1.5">
          Monthly cost @ 30 endpoints / 30 users
        </p>
        <p
          className={cn(
            "text-3xl font-bold font-mono leading-none",
            hasData ? "text-foreground" : "text-muted-foreground/25"
          )}
        >
          {formatCurrency(monthlyCost)}
          <span className="text-lg text-muted-foreground/40 font-normal">/mo</span>
        </p>

        {/* Annotation for annual_flat */}
        {annotation && (
          <p className="text-xs font-mono text-primary/70 mt-1.5">{annotation}</p>
        )}

        {/* Per-unit context */}
        {perUnitLabel && (
          <p className="text-[11px] text-muted-foreground/50 mt-1">{perUnitLabel}</p>
        )}
      </div>

      {/* Discount badge */}
      {hasData &&
        ((values.percent_discount ?? 0) > 0 || (values.flat_discount ?? 0) > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {(values.percent_discount ?? 0) > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {((values.percent_discount ?? 0) * 100).toFixed(0)}% discount applied
              </span>
            )}
            {(values.flat_discount ?? 0) > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                −{formatCurrency(values.flat_discount ?? 0)}/mo flat
              </span>
            )}
          </div>
        )}

      {/* Margin indicator */}
      {hasData && (
        <>
          <Separator className="bg-border/30" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/45">
                Margin hint
              </span>
              <span
                className={cn(
                  "text-xs font-mono font-semibold",
                  marginColor === "emerald"
                    ? "text-emerald-400"
                    : marginColor === "amber"
                      ? "text-amber-400"
                      : "text-red-400"
                )}
              >
                {grossMarginPct > 0
                  ? `~${(grossMarginPct * 100).toFixed(0)}%`
                  : "loss"}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  marginColor === "emerald"
                    ? "bg-emerald-500"
                    : marginColor === "amber"
                      ? "bg-amber-500"
                      : "bg-red-500"
                )}
                animate={{
                  width: `${Math.max(0, Math.min(grossMarginPct * 100, 100))}%`,
                }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
              />
            </div>
            <p className="text-[9px] text-muted-foreground/30 leading-relaxed">
              Hint: $15/endpoint × 30 endpoints = $450/mo assumed sell
            </p>
          </div>
        </>
      )}

      {!hasData && (
        <p className="text-[10px] text-muted-foreground/30 italic">
          Enter a cost above to see the preview
        </p>
      )}
    </div>
  );
}

// ── Main Form Component ───────────────────────────────────────────────────────

interface ToolFormProps {
  tool?: Tool;
}

export function ToolForm({ tool }: ToolFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDiscounts, setShowDiscounts] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isEditing = !!tool;

  const form = useForm<ToolFormValues>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: tool
      ? {
          name: tool.name,
          vendor: tool.vendor,
          category: tool.category,
          pricing_model: tool.pricing_model,
          tier_metric: (tool.tier_metric as TierMetric | undefined) ?? "endpoints",
          per_seat_cost: Number(tool.per_seat_cost),
          flat_monthly_cost: Number(tool.flat_monthly_cost),
          tier_rules: tool.tier_rules ?? [],
          vendor_minimum_monthly: tool.vendor_minimum_monthly
            ? Number(tool.vendor_minimum_monthly)
            : null,
          labor_cost_per_seat: tool.labor_cost_per_seat
            ? Number(tool.labor_cost_per_seat)
            : null,
          support_complexity: tool.support_complexity,
          renewal_uplift_pct: Number(tool.renewal_uplift_pct),
          annual_flat_cost: Number(tool.annual_flat_cost ?? 0),
          per_user_cost: Number(tool.per_user_cost ?? 0),
          per_org_cost: Number(tool.per_org_cost ?? 0),
          percent_discount: Number(tool.percent_discount ?? 0),
          flat_discount: Number(tool.flat_discount ?? 0),
          min_monthly_commit: tool.min_monthly_commit
            ? Number(tool.min_monthly_commit)
            : null,
        }
      : {
          name: "",
          vendor: "",
          category: "other",
          pricing_model: "per_seat",
          tier_metric: "endpoints",
          per_seat_cost: 0,
          flat_monthly_cost: 0,
          tier_rules: [],
          vendor_minimum_monthly: null,
          labor_cost_per_seat: null,
          support_complexity: 3,
          renewal_uplift_pct: 0,
          annual_flat_cost: 0,
          per_user_cost: 0,
          per_org_cost: 0,
          percent_discount: 0,
          flat_discount: 0,
          min_monthly_commit: null,
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tier_rules",
  });

  const pricingModel = form.watch("pricing_model");
  const annualCost = form.watch("annual_flat_cost") ?? 0;
  const values = form.watch(); // drives live preview

  function onSubmit(data: ToolFormValues) {
    startTransition(async () => {
      const result = isEditing
        ? await updateToolAction(tool.id, data)
        : await createToolAction(data);

      if (result.success) {
        toast.success(isEditing ? "Tool updated" : "Tool created");
        router.push("/stack-catalog");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex gap-6 items-start">
      {/* ── LEFT: Form ── */}
      <div className="flex-1 min-w-0">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* ── Zone A: Core fields ── */}
          <div className="rounded-xl border border-border bg-white/[0.02] p-5 space-y-5">
            {/* Row 1: Name + Vendor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="name">Tool Name</FieldLabel>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="e.g. ESET MDR"
                />
                <FieldError message={form.formState.errors.name?.message} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="vendor">Vendor</FieldLabel>
                <Input
                  id="vendor"
                  {...form.register("vendor")}
                  placeholder="e.g. ESET"
                />
                <FieldError message={form.formState.errors.vendor?.message} />
              </div>
            </div>

            {/* Row 2: Category + Pricing Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel>Category</FieldLabel>
                <Select
                  value={form.watch("category")}
                  onValueChange={(v) =>
                    form.setValue("category", v as ToolCategory)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Pricing Model</FieldLabel>
                <Select
                  value={pricingModel}
                  onValueChange={(v) =>
                    form.setValue(
                      "pricing_model",
                      v as ToolFormValues["pricing_model"]
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_MODELS.map((model) => (
                      <SelectItem key={model} value={model}>
                        {PRICING_MODEL_LABELS[model]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Conditional cost field */}
            {pricingModel === "per_seat" && (
              <div className="space-y-1.5">
                <FieldLabel htmlFor="per_seat_cost">
                  Cost per endpoint / mo ($)
                </FieldLabel>
                <Input
                  id="per_seat_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("per_seat_cost")}
                  className="font-mono"
                  placeholder="e.g. 3.00"
                />
                <FieldError
                  message={form.formState.errors.per_seat_cost?.message}
                />
              </div>
            )}

            {pricingModel === "per_user" && (
              <div className="space-y-1.5">
                <FieldLabel htmlFor="per_user_cost">
                  Cost per user / mo ($)
                </FieldLabel>
                <Input
                  id="per_user_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("per_user_cost")}
                  className="font-mono"
                  placeholder="e.g. 5.00"
                />
                <FieldError
                  message={form.formState.errors.per_user_cost?.message}
                />
              </div>
            )}

            {pricingModel === "per_org" && (
              <div className="space-y-1.5">
                <FieldLabel htmlFor="per_org_cost">
                  Cost per org / mo ($)
                </FieldLabel>
                <Input
                  id="per_org_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("per_org_cost")}
                  className="font-mono"
                  placeholder="e.g. 200.00"
                />
                <FieldError
                  message={form.formState.errors.per_org_cost?.message}
                />
              </div>
            )}

            {pricingModel === "flat_monthly" && (
              <div className="space-y-1.5">
                <FieldLabel htmlFor="flat_monthly_cost">
                  Flat monthly cost ($)
                </FieldLabel>
                <Input
                  id="flat_monthly_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("flat_monthly_cost")}
                  className="font-mono"
                  placeholder="e.g. 99.00"
                />
                <FieldError
                  message={form.formState.errors.flat_monthly_cost?.message}
                />
              </div>
            )}

            {pricingModel === "annual_flat" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="annual_flat_cost">
                    Annual flat cost ($)
                  </FieldLabel>
                  {annualCost > 0 && (
                    <span className="text-xs font-mono text-primary/70">
                      ${annualCost}/yr → ${(annualCost / 12).toFixed(2)}/mo
                    </span>
                  )}
                </div>
                <Input
                  id="annual_flat_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("annual_flat_cost")}
                  className="font-mono"
                  placeholder="e.g. 840.00"
                />
                <FieldError
                  message={form.formState.errors.annual_flat_cost?.message}
                />
              </div>
            )}

            {pricingModel === "tiered" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FieldLabel>Tier Rules (by endpoints)</FieldLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      append({ minSeats: 1, maxSeats: null, costPerSeat: 0 })
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Tier
                  </Button>
                </div>
                {typeof form.formState.errors.tier_rules?.message === "string" && (
                  <FieldError message={form.formState.errors.tier_rules.message} />
                )}
                {fields.length === 0 && (
                  <p className="text-xs text-muted-foreground/40 italic py-2 text-center border border-dashed border-border/40 rounded-lg">
                    No tiers yet — add one above
                  </p>
                )}
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-end gap-3 rounded-lg border border-border/50 bg-white/[0.02] p-3"
                  >
                    <div className="space-y-1 flex-1">
                      <FieldLabel>Min</FieldLabel>
                      <Input type="number" {...form.register(`tier_rules.${index}.minSeats`)} className="font-mono" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <FieldLabel>Max</FieldLabel>
                      <Input type="number" placeholder="∞" {...form.register(`tier_rules.${index}.maxSeats`)} className="font-mono" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <FieldLabel>$/Seat</FieldLabel>
                      <Input type="number" step="0.01" {...form.register(`tier_rules.${index}.costPerSeat`)} className="font-mono" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {pricingModel === "tiered_by_metric" && (
              <div className="space-y-4">
                {/* Metric selector */}
                <div className="space-y-1.5">
                  <FieldLabel>Metric (what drives tier selection?)</FieldLabel>
                  <Select
                    value={form.watch("tier_metric") ?? "endpoints"}
                    onValueChange={(v) =>
                      form.setValue("tier_metric", v as TierMetric)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIER_METRICS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {TIER_METRIC_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground/50">
                    e.g. Flare TEM uses headcount (employees) to select the annual flat tier
                  </p>
                </div>

                {/* Tier builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FieldLabel>Tier Rules</FieldLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        append({
                          minSeats: 0,
                          maxSeats: null,
                          costPerSeat: 0,
                          priceType: "annualFlat",
                          annualFlat: 0,
                        })
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Tier
                    </Button>
                  </div>
                  {typeof form.formState.errors.tier_rules?.message === "string" && (
                    <FieldError message={form.formState.errors.tier_rules.message} />
                  )}
                  {fields.length === 0 && (
                    <p className="text-xs text-muted-foreground/40 italic py-2 text-center border border-dashed border-border/40 rounded-lg">
                      No tiers yet — add one above
                    </p>
                  )}
                  {fields.map((field, index) => {
                    const priceType = form.watch(`tier_rules.${index}.priceType`) ?? "annualFlat";
                    return (
                      <div
                        key={field.id}
                        className="rounded-lg border border-border/50 bg-white/[0.02] p-3 space-y-3"
                      >
                        <div className="flex items-end gap-3">
                          <div className="space-y-1 flex-1">
                            <FieldLabel>Min</FieldLabel>
                            <Input type="number" {...form.register(`tier_rules.${index}.minSeats`)} className="font-mono" placeholder="0" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <FieldLabel>Max</FieldLabel>
                            <Input type="number" placeholder="∞" {...form.register(`tier_rules.${index}.maxSeats`)} className="font-mono" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <FieldLabel>Price Type</FieldLabel>
                            <Select
                              value={priceType}
                              onValueChange={(v) =>
                                form.setValue(`tier_rules.${index}.priceType`, v as "unitMonthly" | "flatMonthly" | "annualFlat")
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="annualFlat">Annual Flat</SelectItem>
                                <SelectItem value="flatMonthly">Flat Monthly</SelectItem>
                                <SelectItem value="unitMonthly">Per Unit / Month</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        {priceType === "annualFlat" && (
                          <div className="space-y-1">
                            <FieldLabel>Annual Flat Cost ($)</FieldLabel>
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`tier_rules.${index}.annualFlat`)}
                              className="font-mono"
                              placeholder="e.g. 840"
                            />
                            {(form.watch(`tier_rules.${index}.annualFlat`) ?? 0) > 0 && (
                              <p className="text-[10px] text-primary/60 font-mono">
                                = ${((form.watch(`tier_rules.${index}.annualFlat`) ?? 0) / 12).toFixed(2)}/mo
                              </p>
                            )}
                          </div>
                        )}
                        {priceType === "flatMonthly" && (
                          <div className="space-y-1">
                            <FieldLabel>Flat Monthly Cost ($)</FieldLabel>
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`tier_rules.${index}.flatMonthly`)}
                              className="font-mono"
                              placeholder="e.g. 200"
                            />
                          </div>
                        )}
                        {priceType === "unitMonthly" && (
                          <div className="space-y-1">
                            <FieldLabel>Per Unit / Month ($)</FieldLabel>
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`tier_rules.${index}.unitPriceMonthly`)}
                              className="font-mono"
                              placeholder="e.g. 3.00"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Zone B: Discounts & Minimums (collapsed) ── */}
          <CollapsibleSection
            label="Discounts & Minimums"
            hint="percent off, flat discount, min commit"
            open={showDiscounts}
            onToggle={() => setShowDiscounts((v) => !v)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="percent_discount">
                  Percent Discount
                </FieldLabel>
                <Input
                  id="percent_discount"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  {...form.register("percent_discount")}
                  className="font-mono"
                  placeholder="e.g. 0.10 = 10% off"
                />
                <p className="text-[10px] text-muted-foreground/35">
                  Applied first — fraction 0–1
                </p>
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="flat_discount">
                  Flat Discount ($/mo)
                </FieldLabel>
                <Input
                  id="flat_discount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("flat_discount")}
                  className="font-mono"
                  placeholder="e.g. 5.00"
                />
                <p className="text-[10px] text-muted-foreground/35">
                  Applied after percent discount
                </p>
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="min_monthly_commit">
                  Min Monthly Commit ($/mo)
                </FieldLabel>
                <Input
                  id="min_monthly_commit"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("min_monthly_commit")}
                  className="font-mono"
                  placeholder="None"
                />
                <p className="text-[10px] text-muted-foreground/35">
                  Floor after all discounts
                </p>
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="vendor_minimum_monthly">
                  Vendor Minimum Monthly ($/mo)
                </FieldLabel>
                <Input
                  id="vendor_minimum_monthly"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("vendor_minimum_monthly")}
                  className="font-mono"
                  placeholder="None"
                />
                <p className="text-[10px] text-muted-foreground/35">
                  Legacy — minimum vendor bill
                </p>
              </div>
            </div>
          </CollapsibleSection>

          {/* ── Zone C: Operations & Advanced (collapsed) ── */}
          <CollapsibleSection
            label="Operations & Advanced"
            hint="labor cost, complexity, renewal uplift"
            open={showAdvanced}
            onToggle={() => setShowAdvanced((v) => !v)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="labor_cost_per_seat">
                  Labor Cost / Seat ($){" "}
                  <span className="normal-case text-muted-foreground/35">
                    optional
                  </span>
                </FieldLabel>
                <Input
                  id="labor_cost_per_seat"
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  {...form.register("labor_cost_per_seat")}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="renewal_uplift_pct">
                  Renewal Uplift{" "}
                  <span className="normal-case text-muted-foreground/35">
                    e.g. 0.05 = 5%
                  </span>
                </FieldLabel>
                <Input
                  id="renewal_uplift_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  {...form.register("renewal_uplift_pct")}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FieldLabel>
                  Support Complexity{" "}
                  <span className="normal-case text-muted-foreground/35">
                    1–5
                  </span>
                </FieldLabel>
                <span className="text-sm font-mono text-foreground/70">
                  {form.watch("support_complexity")}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                {...form.register("support_complexity")}
                className="w-full h-1.5 appearance-none rounded-full cursor-pointer accent-[#A8FF3E]"
                style={{
                  background: `linear-gradient(to right, #A8FF3E ${((form.watch("support_complexity") - 1) / 4) * 100}%, rgba(255,255,255,0.1) ${((form.watch("support_complexity") - 1) / 4) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/30">
                <span>Low complexity</span>
                <span>High complexity</span>
              </div>
            </div>
          </CollapsibleSection>

          <Separator className="bg-border/30" />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Remove Tool
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove tool?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remove <strong>{tool?.name || "this tool"}</strong> from your stack? This tool will be unassigned from any services that reference it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          startTransition(async () => {
                            const result = await deactivateToolAction(tool!.id);
                            if (result.success) {
                              toast.success("Tool removed");
                              router.push("/stack-catalog");
                            } else {
                              toast.error(result.error);
                            }
                          });
                        }}
                      >
                        Remove Tool
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="text-sm"
                onClick={() => router.push("/stack-catalog")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="text-sm font-semibold bg-primary hover:bg-primary/90 shadow-[0_0_16px_rgba(99,102,241,0.25)]"
              >
                {isPending
                  ? "Saving…"
                  : isEditing
                    ? "Update Tool"
                    : "Create Tool"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* ── RIGHT: Live Preview Panel ── */}
      <div className="w-[280px] flex-shrink-0 sticky top-6">
        <PreviewPanel values={values} />
      </div>
    </div>
  );
}
