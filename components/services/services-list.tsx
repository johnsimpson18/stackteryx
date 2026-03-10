"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Layers } from "lucide-react";
import type { BundleWithMeta, ServiceCompleteness } from "@/lib/types";
import { BUNDLE_STATUS_LABELS } from "@/lib/constants";
import type { BundleStatus } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface ServicesListProps {
  bundles: BundleWithMeta[];
  completenessMap: Record<string, ServiceCompleteness>;
  outcomeTypeMap: Record<string, string>;
}

// ── Layer bar constants (same as Dashboard PortfolioHealthGrid) ──────────────

const LAYER_LABELS = ["Outcome", "Service", "Stack", "Economics", "Enablement"];
const LAYER_KEYS: (keyof ServiceCompleteness)[] = [
  "outcome_complete",
  "service_complete",
  "stack_complete",
  "economics_complete",
  "enablement_complete",
];

const OUTCOME_TYPE_LABELS: Record<string, string> = {
  compliance: "Compliance",
  efficiency: "Efficiency",
  security: "Security",
  growth: "Growth",
  custom: "Custom",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

type FilterTab = "all" | "active" | "draft";

// ── Component ────────────────────────────────────────────────────────────────

export function ServicesList({
  bundles,
  completenessMap,
  outcomeTypeMap,
}: ServicesListProps) {
  const [filter, setFilter] = useState<FilterTab>("all");

  if (bundles.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="You haven't built any services yet."
        description="Start by defining the business outcome you want to deliver. The AI will help you build the rest."
        actionLabel="Build Your First Service"
        actionHref="/services/new"
      />
    );
  }

  const filtered =
    filter === "all"
      ? bundles
      : bundles.filter((b) => b.status === filter);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "draft", label: "Draft" },
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              filter === t.key
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-x-4 items-center px-4 py-2.5 border-b border-border bg-white/[0.02]">
          <span className="text-xs font-medium text-muted-foreground">Service</span>
          <span className="w-20 text-xs font-medium text-muted-foreground text-center">Status</span>
          <span className="w-24 text-xs font-medium text-muted-foreground text-center">Outcome</span>
          <span className="w-[200px] text-xs font-medium text-muted-foreground text-center">Completeness</span>
          <span className="w-12 text-xs font-medium text-muted-foreground text-right">Layers</span>
          <span className="w-20 text-xs font-medium text-muted-foreground text-right">Updated</span>
          <span className="w-5" />
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No {filter} services found.
            </p>
          </div>
        ) : (
          filtered.map((bundle) => {
            const comp = completenessMap[bundle.id];
            const layers = comp
              ? LAYER_KEYS.map((k) => comp[k] as boolean)
              : [false, false, false, false, false];
            const layersComplete = comp?.layers_complete ?? 0;
            const outcomeType = outcomeTypeMap[bundle.id];

            return (
              <div
                key={bundle.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors border-b border-border last:border-b-0"
              >
                {/* Name */}
                <div className="min-w-0">
                  <Link
                    href={`/services/${bundle.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {bundle.name}
                  </Link>
                </div>

                {/* Status */}
                <div className="w-20 flex justify-center">
                  <StatusBadge
                    status={bundle.status as "draft" | "active" | "archived"}
                    label={BUNDLE_STATUS_LABELS[bundle.status as BundleStatus]}
                  />
                </div>

                {/* Outcome type */}
                <div className="w-24 flex justify-center">
                  {outcomeType ? (
                    <Badge
                      variant="secondary"
                      className="bg-white/5 text-muted-foreground border border-border text-[10px] px-2 py-0.5"
                    >
                      {OUTCOME_TYPE_LABELS[outcomeType] ?? outcomeType}
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-white/5 text-muted-foreground/50 border border-border/50 text-[10px] px-2 py-0.5"
                    >
                      No Outcome
                    </Badge>
                  )}
                </div>

                {/* Five layer bar */}
                <div className="w-[200px] flex items-center gap-1">
                  {layers.map((complete, i) => (
                    <div key={i} className="relative group flex-1">
                      <div
                        className={cn(
                          "h-5 rounded-sm transition-colors",
                          complete ? "bg-emerald-500/60" : "bg-red-500/30"
                        )}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-popover border border-border text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        {LAYER_LABELS[i]}: {complete ? "Complete" : "Incomplete"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Score */}
                <div className="w-12 text-right">
                  <span
                    className={cn(
                      "text-xs font-mono font-medium",
                      layersComplete >= 5
                        ? "text-emerald-400"
                        : layersComplete >= 3
                          ? "text-amber-400"
                          : "text-red-400"
                    )}
                  >
                    {layersComplete} / 5
                  </span>
                </div>

                {/* Updated */}
                <div className="w-20 text-right">
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(bundle.updated_at)}
                  </span>
                </div>

                {/* Arrow */}
                <Link href={`/services/${bundle.id}`} className="w-5 flex justify-center">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
