"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarginHealthBadge } from "@/components/ui/margin-health-badge";
import { formatCurrency } from "@/lib/formatting";
import type { ClientContractWithMeta } from "@/lib/types";

interface ClientProfitabilityCardProps {
  contracts: ClientContractWithMeta[];
}

export function ClientProfitabilityCard({
  contracts,
}: ClientProfitabilityCardProps) {
  const active = contracts.filter((c) => c.status === "active");
  if (active.length === 0) return null;

  const totalRevenue = active.reduce((s, c) => s + c.monthly_revenue, 0);
  const totalCost = active.reduce((s, c) => s + c.monthly_cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const blendedMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

  // Contract value = revenue × remaining months
  const now = new Date();
  const contractValue = active.reduce((s, c) => {
    const endDate = new Date(c.end_date);
    const remainingMonths = Math.max(
      0,
      (endDate.getFullYear() - now.getFullYear()) * 12 +
        endDate.getMonth() -
        now.getMonth(),
    );
    return s + c.monthly_revenue * remainingMonths;
  }, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Client Profitability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
              Monthly Revenue
            </p>
            <p className="text-lg font-bold font-mono">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
              Monthly Cost
            </p>
            <p className="text-lg font-bold font-mono">
              {formatCurrency(totalCost)}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
              Monthly Profit
            </p>
            <p className="text-lg font-bold font-mono">
              {formatCurrency(totalProfit)}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
              Blended Margin
            </p>
            <MarginHealthBadge margin={blendedMargin} showLabel />
          </div>
        </div>

        {contractValue > 0 && (
          <div className="flex justify-between text-sm border-t pt-3">
            <span className="text-muted-foreground">
              Remaining Contract Value
            </span>
            <span className="font-mono font-medium">
              {formatCurrency(contractValue)}
            </span>
          </div>
        )}

        {/* Per-service breakdown when multiple active contracts */}
        {active.length > 1 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Per-Service Breakdown
            </p>
            <div className="space-y-1.5">
              {active.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate mr-4">{c.bundle_name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs">
                      {formatCurrency(c.monthly_revenue)}
                    </span>
                    <MarginHealthBadge margin={c.margin_pct} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
