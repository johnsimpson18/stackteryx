"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { Button } from "@/components/ui/button";
import { PricingStatusBadge } from "@/components/shared/pricing-status-badge";
import { MarginHealthBadge } from "@/components/ui/margin-health-badge";
import { InlinePriceEditor } from "@/components/ui/inline-price-editor";
import {
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  batchRecalculateStaleAction,
  updateVersionSellPriceAction,
} from "@/actions/pricing";
import type { BundleWithMeta, ServiceCompleteness } from "@/lib/types";
import type { PricingStatus } from "@/lib/pricing/status";

// ── Types ────────────────────────────────────────────────────────────────────

interface PricingHealthClientProps {
  bundles: BundleWithMeta[];
  completenessMap: Record<string, ServiceCompleteness>;
  staleMap: Record<string, boolean>;
  pricingStatusMap: Record<string, PricingStatus>;
  defaultTargetMargin: number;
  staleCount: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function PricingHealthClient({
  bundles,
  completenessMap,
  staleMap,
  pricingStatusMap,
  defaultTargetMargin,
  staleCount,
}: PricingHealthClientProps) {
  const [isRecalculating, startRecalcTransition] = useTransition();

  // Categorize bundles
  const needsAttention = bundles.filter((b) => {
    const status = pricingStatusMap[b.id];
    const margin = b.latest_margin;
    return (
      status === "STALE" ||
      status === "INCOMPLETE" ||
      status === "NOT_SET" ||
      (margin !== null && margin < defaultTargetMargin - 0.05)
    );
  });

  const sorted = [...bundles].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return (
    <div className="space-y-6">
      {/* 1. Needs Attention */}
      {needsAttention.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Needs Attention ({needsAttention.length})
            </h2>
            {staleCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                disabled={isRecalculating}
                onClick={() => {
                  startRecalcTransition(async () => {
                    const result = await batchRecalculateStaleAction();
                    if (result.success) {
                      toast.success(
                        `Recalculated ${result.data.recalculated} version(s)`
                      );
                    } else {
                      toast.error(result.error);
                    }
                  });
                }}
              >
                <RefreshCw
                  className={cn("h-3 w-3", isRecalculating && "animate-spin")}
                />
                Recalculate All Stale
              </Button>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {needsAttention.map((bundle) => {
              const status = pricingStatusMap[bundle.id];
              const margin = bundle.latest_margin;
              const belowRedZone =
                margin !== null && margin < defaultTargetMargin - 0.05;

              return (
                <Link
                  key={bundle.id}
                  href={`/services/${bundle.id}`}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:bg-white/[0.02] transition-colors"
                >
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      status === "STALE" || status === "INCOMPLETE"
                        ? "text-amber-400"
                        : belowRedZone
                          ? "text-red-400"
                          : "text-muted-foreground"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {bundle.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <PricingStatusBadge status={status} />
                      {belowRedZone && margin !== null && (
                        <span className="text-[10px] text-red-400">
                          Margin: {formatPercent(margin)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Service Pricing Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Service Pricing Overview
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bundles.length} service{bundles.length !== 1 ? "s" : ""} in your portfolio
          </p>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-x-4 items-center px-4 py-2.5 border-b border-border bg-white/[0.02]">
          <span className="text-xs font-medium text-muted-foreground">Service</span>
          <span className="w-24 text-xs font-medium text-muted-foreground text-center">
            Sell Price
          </span>
          <span className="w-24 text-xs font-medium text-muted-foreground text-center">
            Cost / Seat
          </span>
          <span className="w-20 text-xs font-medium text-muted-foreground text-center">
            Margin
          </span>
          <span className="w-20 text-xs font-medium text-muted-foreground text-right">
            MRR
          </span>
          <span className="w-20 text-xs font-medium text-muted-foreground text-center">
            Status
          </span>
          <span className="w-5" />
        </div>

        {/* Rows */}
        {sorted.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No services yet.</p>
          </div>
        ) : (
          sorted.map((bundle) => (
            <ServicePricingRow
              key={bundle.id}
              bundle={bundle}
              pricingStatus={pricingStatusMap[bundle.id] ?? "NOT_SET"}
              defaultTargetMargin={defaultTargetMargin}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Service Pricing Row ──────────────────────────────────────────────────────

function ServicePricingRow({
  bundle,
  pricingStatus,
  defaultTargetMargin,
}: {
  bundle: BundleWithMeta;
  pricingStatus: PricingStatus;
  defaultTargetMargin: number;
}) {
  const sellPrice = bundle.latest_mrr != null
    ? bundle.latest_mrr / Math.max(1, bundle.version_count > 0 ? 1 : 1)
    : null;
  const margin = bundle.latest_margin;
  const mrr = bundle.latest_mrr;

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-white/[0.02] transition-colors">
      {/* Service name */}
      <div className="min-w-0">
        <Link
          href={`/services/${bundle.id}`}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
        >
          {bundle.name}
        </Link>
      </div>

      {/* Sell price */}
      <div className="w-24 text-center">
        {sellPrice != null ? (
          <span className="text-sm font-mono text-foreground">
            {formatCurrency(sellPrice)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Cost / seat — not available from BundleWithMeta, show dash */}
      <div className="w-24 text-center">
        <span className="text-xs text-muted-foreground">—</span>
      </div>

      {/* Margin */}
      <div className="w-20 flex justify-center">
        {margin != null ? (
          <MarginHealthBadge margin={margin} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* MRR */}
      <div className="w-20 text-right">
        {mrr != null ? (
          <span className="text-sm font-mono text-foreground">
            {formatCurrency(mrr)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Status */}
      <div className="w-20 flex justify-center">
        <PricingStatusBadge status={pricingStatus} />
      </div>

      {/* Arrow */}
      <Link
        href={`/services/${bundle.id}`}
        className="w-5 flex justify-center"
      >
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
      </Link>
    </div>
  );
}
