"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarginHealthBadge } from "@/components/ui/margin-health-badge";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { BundleVersion } from "@/lib/types";

interface VersionDiffProps {
  current: BundleVersion;
  previous: BundleVersion | null;
}

interface DeltaRowProps {
  label: string;
  currentValue: number;
  previousValue: number | null;
  format: (n: number) => string;
  higherIsBetter?: boolean;
}

function DeltaRow({
  label,
  currentValue,
  previousValue,
  format,
  higherIsBetter = true,
}: DeltaRowProps) {
  if (previousValue == null) return null;

  const delta = currentValue - previousValue;
  if (Math.abs(delta) < 0.001) return null;

  const isPositive = delta > 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  const pctChange =
    previousValue !== 0
      ? ((delta / Math.abs(previousValue)) * 100).toFixed(1)
      : null;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono">{format(currentValue)}</span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-mono",
            isGood ? "text-emerald-500" : "text-red-500",
          )}
        >
          {isPositive ? "↑" : "↓"}{" "}
          {format(Math.abs(delta))}
          {pctChange && (
            <span className="text-muted-foreground ml-0.5">
              ({pctChange}%)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export function VersionDiff({ current, previous }: VersionDiffProps) {
  if (!previous) {
    return (
      <Card>
        <CardContent className="pt-4 pb-3">
          <Badge variant="outline" className="text-xs">
            First version — no previous data to compare
          </Badge>
        </CardContent>
      </Card>
    );
  }

  const costCurrent = Number(current.computed_true_cost_per_seat ?? 0);
  const costPrevious = Number(previous.computed_true_cost_per_seat ?? 0);
  const sellCurrent = Number(current.computed_suggested_price ?? 0);
  const sellPrevious = Number(previous.computed_suggested_price ?? 0);
  const marginCurrent = Number(current.computed_margin_post_discount ?? 0);
  const marginPrevious = Number(previous.computed_margin_post_discount ?? 0);
  const mrrCurrent = Number(current.computed_mrr ?? 0);
  const mrrPrevious = Number(previous.computed_mrr ?? 0);

  const hasChanges =
    Math.abs(costCurrent - costPrevious) > 0.001 ||
    Math.abs(sellCurrent - sellPrevious) > 0.001 ||
    Math.abs(marginCurrent - marginPrevious) > 0.001 ||
    Math.abs(mrrCurrent - mrrPrevious) > 0.001;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Changes from v{previous.version_number}
          {current.stale_reason && (
            <span className="text-xs font-normal text-muted-foreground">
              — {current.stale_reason}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {hasChanges ? (
          <>
            <DeltaRow
              label="Cost Floor"
              currentValue={costCurrent}
              previousValue={costPrevious}
              format={formatCurrency}
              higherIsBetter={false}
            />
            <DeltaRow
              label="Sell Price"
              currentValue={sellCurrent}
              previousValue={sellPrevious}
              format={formatCurrency}
              higherIsBetter
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Margin</span>
              <div className="flex items-center gap-2">
                <MarginHealthBadge margin={marginCurrent} />
                {Math.abs(marginCurrent - marginPrevious) > 0.001 && (
                  <span
                    className={cn(
                      "text-xs font-mono",
                      marginCurrent > marginPrevious
                        ? "text-emerald-500"
                        : "text-red-500",
                    )}
                  >
                    {marginCurrent > marginPrevious ? "↑" : "↓"}{" "}
                    {((marginCurrent - marginPrevious) * 100).toFixed(1)}pp
                  </span>
                )}
              </div>
            </div>
            <DeltaRow
              label="MRR"
              currentValue={mrrCurrent}
              previousValue={mrrPrevious}
              format={formatCurrency}
              higherIsBetter
            />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            No pricing changes from previous version.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
