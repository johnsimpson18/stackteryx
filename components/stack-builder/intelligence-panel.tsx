"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import {
  calculateComplianceScores,
  TOOL_CATEGORY_TO_OUTCOMES,
  BASELINE_CATEGORIES,
  BASELINE_CATEGORY_LABELS,
} from "@/lib/compliance-tool-mapping";
import { OUTCOME_LIBRARY } from "@/lib/outcome-library";
import { CATEGORY_LABELS } from "@/lib/constants";
import { AgentBadge } from "@/components/agents/agent-badge";
import type { AddonServiceOption } from "@/lib/addon-services-library";
import type { Tool } from "@/lib/types";

interface IntelligencePanelProps {
  stackTools: Tool[];
  stackAddons: AddonServiceOption[];
  suggestedOutcomeIds: string[];
}

export function IntelligencePanel({
  stackTools,
  stackAddons,
  suggestedOutcomeIds,
}: IntelligencePanelProps) {
  const categories = useMemo(
    () => stackTools.map((t) => t.category),
    [stackTools]
  );

  const compliance = useMemo(
    () => calculateComplianceScores(categories),
    [categories]
  );

  // Suggested outcomes from tool categories + addon outcomes (de-duplicated)
  const suggestedOutcomes = useMemo(() => {
    const ids = new Set<string>();
    for (const cat of categories) {
      const outcomeIds = TOOL_CATEGORY_TO_OUTCOMES[cat];
      if (outcomeIds) outcomeIds.forEach((id) => ids.add(id));
    }
    for (const addon of stackAddons) {
      for (const id of addon.outcomeIds) ids.add(id);
    }
    return OUTCOME_LIBRARY.filter((o) => ids.has(o.id));
  }, [categories, stackAddons]);

  // Coverage gaps — baseline categories not represented
  const coveredCategories = useMemo(
    () => new Set(categories),
    [categories]
  );

  const gaps = useMemo(
    () =>
      BASELINE_CATEGORIES.filter((cat) => !coveredCategories.has(cat)),
    [coveredCategories]
  );

  // Economics estimate — tools + add-ons
  const economics = useMemo(() => {
    let toolCostPerSeat = 0;
    for (const tool of stackTools) {
      toolCostPerSeat += Number(tool.per_seat_cost) || 0;
    }
    const suggestedToolPrice =
      toolCostPerSeat > 0 ? toolCostPerSeat / 0.65 : 0; // 35% target margin
    const toolMargin =
      toolCostPerSeat > 0
        ? ((suggestedToolPrice - toolCostPerSeat) / suggestedToolPrice) * 100
        : 0;

    let addonMonthly = 0;
    for (const addon of stackAddons) {
      addonMonthly += addon.typicalMonthlyPrice;
    }

    const totalMonthly = suggestedToolPrice + addonMonthly;

    return {
      toolCostPerSeat,
      suggestedToolPrice,
      toolMargin,
      addonMonthly,
      totalMonthly,
    };
  }, [stackTools, stackAddons]);

  const hasItems = stackTools.length > 0 || stackAddons.length > 0;

  if (!hasItems) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 pt-3 pb-2">
          <AgentBadge agentId="aria" size="sm" />
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-muted-foreground/60 text-center">
            Add tools to your stack to see live economics, compliance coverage, and suggested outcomes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <AgentBadge agentId="aria" size="sm" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
        {/* Economics card — Margin agent */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <AgentBadge agentId="margin" size="sm" showTitle={false} />
            <span className="text-xs font-semibold text-foreground">Economics</span>
          </div>

          {stackTools.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Cost / seat</p>
                <p className="text-sm font-mono font-semibold text-foreground">
                  ${economics.toolCostPerSeat.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Suggested price</p>
                <p className="text-sm font-mono font-semibold text-primary">
                  ${economics.suggestedToolPrice.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {stackTools.length > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground">Est. margin</span>
              <span className="text-xs font-mono font-semibold text-primary">
                {economics.toolMargin.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Service composition — shows when add-ons are present */}
          {stackAddons.length > 0 && (
            <div className="pt-2 border-t border-border/50 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Service Composition
              </p>
              {stackTools.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Core tools</span>
                  <span className="text-[11px] font-mono text-foreground">
                    ${economics.suggestedToolPrice.toFixed(0)}/mo
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Add-on services</span>
                <span className="text-[11px] font-mono text-foreground">
                  ${economics.addonMonthly.toLocaleString()}/mo
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/30">
                <span className="text-[10px] font-medium text-foreground">Total</span>
                <span className="text-xs font-mono font-semibold text-primary">
                  ${economics.totalMonthly.toLocaleString()}/mo
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Compliance coverage */}
        {stackTools.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <span className="text-xs font-semibold text-foreground">Aria&apos;s Compliance Analysis</span>
            <ComplianceBar label="HIPAA" value={compliance.hipaa} />
            <ComplianceBar label="PCI DSS" value={compliance.pci} />
            <ComplianceBar label="CMMC" value={compliance.cmmc} />
            <Link
              href="/compliance"
              className="block text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors pt-1 border-t border-border/30 mt-1"
            >
              These scores update your org&apos;s Compliance Intelligence.{" "}
              <span className="underline">View dashboard &rarr;</span>
            </Link>
          </div>
        )}

        {/* Suggested outcomes */}
        {suggestedOutcomes.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <span className="text-xs font-semibold text-foreground">
              Aria&apos;s Outcome Suggestions ({suggestedOutcomes.length})
            </span>
            <div className="space-y-1.5">
              {suggestedOutcomes.map((outcome) => (
                <div
                  key={outcome.id}
                  className={`text-[11px] leading-relaxed rounded px-2 py-1.5 ${
                    suggestedOutcomeIds.includes(outcome.id)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground bg-muted/20"
                  }`}
                >
                  {outcome.statement}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coverage gaps */}
        {gaps.length > 0 && stackTools.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-foreground">
                Aria Detected {gaps.length} Gap{gaps.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1">
              {gaps.map((cat) => (
                <div
                  key={cat}
                  className="text-[11px] text-muted-foreground flex items-center gap-1.5"
                >
                  <span className="h-1 w-1 rounded-full bg-amber-400 shrink-0" />
                  {BASELINE_CATEGORY_LABELS[cat]} not covered
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All baseline covered */}
        {gaps.length === 0 && stackTools.length > 0 && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-foreground">
                Baseline covered
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Your stack covers all core security categories.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ComplianceBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${value}%`,
            backgroundColor:
              value >= 70
                ? "rgb(52, 211, 153)"
                : value >= 40
                  ? "rgb(251, 191, 36)"
                  : "rgb(239, 68, 68)",
          }}
        />
      </div>
    </div>
  );
}
