"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PricingFlags } from "./pricing-flags";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import type { PricingOutput } from "@/lib/types";

interface PricingPreviewProps {
  pricing: PricingOutput | null;
}

function marginColor(margin: number): string {
  if (margin >= 0.25) return "text-emerald-600";
  if (margin >= 0.15) return "text-amber-600";
  return "text-red-600";
}

export function PricingPreview({ pricing }: PricingPreviewProps) {
  if (!pricing) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Configure parameters and select tools to see pricing
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Suggested Price/Seat
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold">
              {formatCurrency(pricing.suggested_price_per_seat)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Your Price/Seat
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold">
              {formatCurrency(pricing.discounted_price_per_seat)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Post-Discount Margin
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div
              className={`text-xl font-bold ${marginColor(pricing.margin_pct_post_discount)}`}
            >
              {formatPercent(pricing.margin_pct_post_discount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total MRR
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold">
              {formatCurrency(pricing.total_mrr)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Cost Breakdown (per seat)</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Blended tool cost</span>
            <span className="font-mono">
              {formatCurrency(pricing.blended_tool_cost_per_seat)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Labor cost</span>
            <span className="font-mono">
              {formatCurrency(pricing.total_labor_cost_per_seat)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Overhead</span>
            <span className="font-mono">
              {formatCurrency(pricing.overhead_amount_per_seat)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-1 font-medium">
            <span>True cost</span>
            <span className="font-mono">
              {formatCurrency(pricing.true_cost_per_seat)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Revenue */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Revenue (per seat)</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Suggested price</span>
            <span className="font-mono">
              {formatCurrency(pricing.suggested_price_per_seat)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-mono text-red-500">
              -
              {formatCurrency(
                pricing.suggested_price_per_seat -
                  pricing.discounted_price_per_seat
              )}
            </span>
          </div>
          <div className="flex justify-between border-t pt-1 font-medium">
            <span>Final price</span>
            <span className="font-mono">
              {formatCurrency(pricing.discounted_price_per_seat)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Totals</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">MRR</span>
            <span className="font-mono">
              {formatCurrency(pricing.total_mrr)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ARR</span>
            <span className="font-mono">
              {formatCurrency(pricing.total_arr)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contract total</span>
            <span className="font-mono">
              {formatCurrency(pricing.contract_total_revenue)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly margin</span>
            <span
              className={`font-mono ${pricing.total_monthly_margin >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              {formatCurrency(pricing.total_monthly_margin)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Per-tool breakdown */}
      {pricing.tool_costs.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm">Per-Tool Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tool</TableHead>
                    <TableHead className="text-xs text-right">
                      Raw/Seat
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Eff./Seat
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Labor/Seat
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Monthly
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricing.tool_costs.map((tc) => (
                    <TableRow key={tc.tool_id}>
                      <TableCell className="text-xs font-medium">
                        {tc.tool_name}
                        {tc.vendor_minimum_applied && (
                          <span className="ml-1 text-amber-500" title="Vendor minimum applied">
                            *
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {formatCurrency(tc.raw_cost_per_seat)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {formatCurrency(tc.effective_cost_per_seat)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {formatCurrency(tc.labor_cost_per_seat)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {formatCurrency(tc.monthly_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flags */}
      <PricingFlags flags={pricing.flags} />
    </div>
  );
}
