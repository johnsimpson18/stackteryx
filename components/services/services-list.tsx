"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { PricingStatusBadge } from "@/components/shared/pricing-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Layers, RefreshCw, LayoutGrid, List as ListIcon, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPercent } from "@/lib/formatting";
import { toast } from "sonner";
import type { BundleWithMeta, ServiceCompleteness } from "@/lib/types";
import type { PricingStatus } from "@/lib/pricing/status";
import { BUNDLE_STATUS_LABELS } from "@/lib/constants";
import type { BundleStatus } from "@/lib/types";
import { batchRecalculateStaleAction } from "@/actions/pricing";

// ── Types ────────────────────────────────────────────────────────────────────

interface ServicesListProps {
  bundles: BundleWithMeta[];
  completenessMap: Record<string, ServiceCompleteness>;
  outcomeTypeMap: Record<string, string>;
  staleMap?: Record<string, boolean>;
  pricingStatusMap?: Record<string, PricingStatus>;
  initialFilter?: FilterTab;
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

type FilterTab = "all" | "active" | "draft" | "stale";

// ── Component ────────────────────────────────────────────────────────────────

export function ServicesList({
  bundles,
  completenessMap,
  outcomeTypeMap,
  staleMap = {},
  pricingStatusMap = {},
  initialFilter,
}: ServicesListProps) {
  const [filter, setFilter] = useState<FilterTab>(initialFilter ?? "all");
  const [isRecalculating, startRecalcTransition] = useTransition();
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("stackteryx-services-view") as "grid" | "list") ?? "grid";
    }
    return "grid";
  });
  const [sortBy, setSortBy] = useState<"name" | "margin" | "completeness" | "updated">("updated");

  function handleViewChange(mode: "grid" | "list") {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("stackteryx-services-view", mode);
    }
  }

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

  const staleCount = Object.values(staleMap).filter(Boolean).length;

  const filtered =
    filter === "all"
      ? bundles
      : filter === "stale"
        ? bundles.filter((b) => staleMap[b.id])
        : bundles.filter((b) => b.status === filter);

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "margin": {
        const aMargin = a.latest_margin ?? -Infinity;
        const bMargin = b.latest_margin ?? -Infinity;
        return bMargin - aMargin;
      }
      case "completeness": {
        const aComp = completenessMap[a.id]?.layers_complete ?? 0;
        const bComp = completenessMap[b.id]?.layers_complete ?? 0;
        return bComp - aComp;
      }
      case "updated":
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "draft", label: "Draft" },
    ...(staleCount > 0 ? [{ key: "stale" as FilterTab, label: `Stale (${staleCount})` }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <Button
              key={t.key}
              variant={filter === t.key ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {staleCount > 0 && filter === "stale" && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            disabled={isRecalculating}
            onClick={() => {
              startRecalcTransition(async () => {
                const result = await batchRecalculateStaleAction();
                if (result.success) {
                  toast.success(`Recalculated ${result.data.recalculated} version(s)`);
                } else {
                  toast.error(result.error);
                }
              });
            }}
          >
            <RefreshCw className={cn("h-3 w-3", isRecalculating && "animate-spin")} />
            Recalculate All
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last Updated</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="margin">Margin</SelectItem>
              <SelectItem value="completeness">Completeness</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-0.5 border border-border rounded-lg p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleViewChange("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleViewChange("list")}
            >
              <ListIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        /* Table view */
        sorted.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No {filter} services found.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-center">Completeness</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="w-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((bundle) => {
                  const comp = completenessMap[bundle.id];
                  const layersComplete = comp?.layers_complete ?? 0;

                  return (
                    <TableRow key={bundle.id}>
                      <TableCell>
                        <Link
                          href={`/services/${bundle.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {bundle.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-white/5 text-muted-foreground border border-border text-[10px]"
                        >
                          {bundle.bundle_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {bundle.latest_margin != null
                          ? formatPercent(bundle.latest_margin)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center">
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
                          {layersComplete}/5
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge
                          status={bundle.status as "draft" | "active" | "archived"}
                          label={BUNDLE_STATUS_LABELS[bundle.status as BundleStatus]}
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatRelativeDate(bundle.updated_at)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/services/${bundle.id}`}>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        /* Grid/card view — existing rendering */
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-x-4 items-center px-4 py-2.5 border-b border-border bg-white/[0.02]">
            <span className="text-xs font-medium text-muted-foreground">Service</span>
            <span className="w-20 text-xs font-medium text-muted-foreground text-center">Status</span>
            <span className="w-24 text-xs font-medium text-muted-foreground text-center">Outcome</span>
            <span className="w-20 text-xs font-medium text-muted-foreground text-center">Pricing</span>
            <span className="w-[200px] text-xs font-medium text-muted-foreground text-center">Completeness</span>
            <span className="w-12 text-xs font-medium text-muted-foreground text-right">Layers</span>
            <span className="w-20 text-xs font-medium text-muted-foreground text-right">Updated</span>
            <span className="w-5" />
          </div>

          {sorted.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No {filter} services found.
              </p>
            </div>
          ) : (
            sorted.map((bundle) => {
              const comp = completenessMap[bundle.id];
              const layers = comp
                ? LAYER_KEYS.map((k) => comp[k] as boolean)
                : [false, false, false, false, false];
              const layersComplete = comp?.layers_complete ?? 0;
              const outcomeType = outcomeTypeMap[bundle.id];

              return (
                <div
                  key={bundle.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors border-b border-border last:border-b-0"
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

                  {/* Pricing status */}
                  <div className="w-20 flex justify-center">
                    <PricingStatusBadge status={pricingStatusMap[bundle.id] ?? "NOT_SET"} />
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
      )}
    </div>
  );
}
