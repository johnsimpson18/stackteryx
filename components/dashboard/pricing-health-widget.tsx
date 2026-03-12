"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarginHealthBadge } from "@/components/ui/margin-health-badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { PricingHealthSummary } from "@/lib/db/dashboard";

interface PricingHealthWidgetProps {
  data: PricingHealthSummary;
}

const BUCKET_CONFIG = [
  { key: "healthy" as const, label: "Healthy", color: "bg-emerald-500" },
  { key: "watch" as const, label: "Watch", color: "bg-amber-500" },
  { key: "atRisk" as const, label: "At Risk", color: "bg-red-500" },
  { key: "critical" as const, label: "Critical", color: "bg-red-700" },
] as const;

export function PricingHealthWidget({ data }: PricingHealthWidgetProps) {
  const total =
    data.marginBuckets.healthy +
    data.marginBuckets.watch +
    data.marginBuckets.atRisk +
    data.marginBuckets.critical;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pricing Health</CardTitle>
          <div className="flex items-center gap-2">
            {data.staleCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {data.staleCount} stale
              </Badge>
            )}
            <Link
              href="/pricing"
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Margin bucket bars */}
        {total > 0 ? (
          <>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden">
              {BUCKET_CONFIG.map(({ key, color }) => {
                const count = data.marginBuckets[key];
                if (count === 0) return null;
                return (
                  <div
                    key={key}
                    className={cn("transition-all", color)}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                );
              })}
            </div>
            <div className="flex gap-4 text-xs">
              {BUCKET_CONFIG.map(({ key, label, color }) => {
                const count = data.marginBuckets[key];
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-full", color)} />
                    <span className="text-muted-foreground">
                      {label}: {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No active services with margin data.
          </p>
        )}

        {/* Top margin risks */}
        {data.topRisks.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Top Margin Risks
            </p>
            <div className="space-y-2">
              {data.topRisks.map((risk) => {
                const delta =
                  risk.previousMargin != null
                    ? risk.currentMargin - risk.previousMargin
                    : null;

                return (
                  <div
                    key={risk.bundleId}
                    className="flex items-center justify-between text-sm"
                  >
                    <Link
                      href={`/services/${risk.bundleId}`}
                      className="truncate mr-2 hover:text-primary transition-colors"
                    >
                      {risk.bundleName}
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <MarginHealthBadge margin={risk.currentMargin} />
                      {delta != null && Math.abs(delta) > 0.001 && (
                        <span
                          className={cn(
                            "text-[10px] font-mono",
                            delta > 0 ? "text-emerald-500" : "text-red-500",
                          )}
                        >
                          {delta > 0 ? "↑" : "↓"}
                          {(Math.abs(delta) * 100).toFixed(1)}pp
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
