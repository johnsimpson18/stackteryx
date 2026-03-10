"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BUNDLE_TYPE_LABELS,
  CATEGORY_COLORS,
} from "@/lib/constants";
import { calculatePricing } from "@/lib/pricing/engine";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { CheckCircle2, Pencil } from "lucide-react";
import type { WizardFormData } from "./wizard-shell";
import type { Tool, PricingInput, PricingToolInput, PricingOutput } from "@/lib/types";

interface StepReviewProps {
  form: WizardFormData;
  tools: Tool[];
  onEditStep: (step: number) => void;
}

export function StepReview({ form, tools, onEditStep }: StepReviewProps) {
  const selectedTools = useMemo(
    () => tools.filter((t) => form.selectedToolIds.has(t.id)),
    [tools, form.selectedToolIds]
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
      seat_count: form.seat_count,
      target_margin_pct: form.target_margin_pct,
      overhead_pct: form.overhead_pct,
      labor_pct: form.labor_pct,
      discount_pct: form.discount_pct,
      red_zone_margin_pct: 0.15,
      max_discount_no_approval_pct: 0.1,
      contract_term_months: form.contract_term_months,
    };

    try {
      return calculatePricing(input);
    } catch {
      return null;
    }
  }, [selectedTools, form]);

  // Completeness check
  const layers = [
    { name: "Outcome", complete: !!form.name.trim() },
    { name: "Service", complete: true },
    { name: "Stack", complete: form.selectedToolIds.size > 0 },
    { name: "Economics", complete: form.seat_count > 0 },
    { name: "Enablement", complete: true },
  ];
  const completeLayers = layers.filter((l) => l.complete).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Review &amp; Confirm</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Review all layers of your service before launching.
        </p>
      </div>

      {/* Completeness indicator */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          Service completeness
        </span>
        <div className="flex gap-1 ml-auto">
          {layers.map((l) => (
            <div
              key={l.name}
              className={cn(
                "h-2 w-8 rounded-full",
                l.complete ? "bg-emerald-400" : "bg-zinc-700"
              )}
              title={l.name}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-2">{completeLayers}/5</span>
      </div>

      {/* Outcome */}
      <ReviewCard title="Outcome" step={1} onEdit={onEditStep}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Name</span>
            <p className="font-medium">{form.name || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Outcome type</span>
            <p className="font-medium capitalize">{form.outcome_type}</p>
          </div>
          {form.outcome_statement && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Statement</span>
              <p className="font-medium">{form.outcome_statement}</p>
            </div>
          )}
          {form.target_vertical && (
            <div>
              <span className="text-muted-foreground">Vertical</span>
              <p className="font-medium">{form.target_vertical}</p>
            </div>
          )}
          {form.target_persona && (
            <div>
              <span className="text-muted-foreground">Persona</span>
              <p className="font-medium">{form.target_persona}</p>
            </div>
          )}
        </div>
      </ReviewCard>

      {/* Service */}
      <ReviewCard title="Service Definition" step={2} onEdit={onEditStep}>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Service type</span>
            <p className="font-medium">{BUNDLE_TYPE_LABELS[form.bundle_type]}</p>
          </div>
          {form.service_capabilities.length > 0 && (
            <div>
              <span className="text-muted-foreground">
                Capabilities ({form.service_capabilities.length})
              </span>
              <ul className="mt-1 space-y-1">
                {form.service_capabilities.map((cap, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="font-medium">{cap.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </ReviewCard>

      {/* Stack */}
      <ReviewCard title="Stack" step={3} onEdit={onEditStep}>
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">
            Tools ({selectedTools.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {selectedTools.map((tool) => {
              const colors = CATEGORY_COLORS[tool.category];
              return (
                <Badge
                  key={tool.id}
                  variant="outline"
                  className={cn("text-xs", colors.bg, colors.text, colors.border)}
                >
                  {tool.name}
                </Badge>
              );
            })}
          </div>
        </div>
      </ReviewCard>

      {/* Economics */}
      <ReviewCard title="Economics" step={4} onEdit={onEditStep}>
        {pricing ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Seats</p>
              <p className="text-lg font-bold">{form.seat_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-lg font-bold">{formatCurrency(pricing.total_mrr)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ARR</p>
              <p className="text-lg font-bold">{formatCurrency(pricing.total_arr)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margin</p>
              <p
                className={cn(
                  "text-lg font-bold",
                  pricing.margin_pct_post_discount >= 0.25
                    ? "text-emerald-400"
                    : pricing.margin_pct_post_discount >= 0.15
                      ? "text-amber-400"
                      : "text-red-400"
                )}
              >
                {formatPercent(pricing.margin_pct_post_discount)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No pricing data</p>
        )}
      </ReviewCard>

      {/* Enablement */}
      <ReviewCard title="Enablement" step={5} onEdit={onEditStep}>
        <div className="space-y-2 text-sm">
          {[
            { label: "Service overview", value: form.service_overview },
            { label: "What's included", value: form.whats_included },
            { label: "Talking points", value: form.talking_points },
            { label: "Pricing narrative", value: form.pricing_narrative },
            { label: "Why us", value: form.why_us },
          ].map(({ label, value }) => (
            <div key={label}>
              <span className="text-muted-foreground">{label}</span>
              <p className="font-medium line-clamp-2">{value || "—"}</p>
            </div>
          ))}
        </div>
      </ReviewCard>
    </div>
  );
}

function ReviewCard({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(step)}
          className="h-7 text-xs gap-1"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </div>
      {children}
    </div>
  );
}
