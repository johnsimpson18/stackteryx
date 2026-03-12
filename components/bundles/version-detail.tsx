"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PricingFlags } from "./pricing-flags";
import { CostBreakdown, mapPricingOutputToBreakdownProps } from "@/components/pricing/cost-breakdown";
import { VersionDiff } from "./version-diff";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { RISK_TIER_LABELS, CATEGORY_LABELS } from "@/lib/constants";
import type { BundleVersionWithTools, BundleVersion, PricingFlag, PricingOutput } from "@/lib/types";

interface VersionDetailProps {
  version: BundleVersionWithTools;
  pricingOutput?: PricingOutput;
  previousVersion?: BundleVersion | null;
}

export function VersionDetail({ version, pricingOutput, previousVersion }: VersionDetailProps) {
  const flags = (version.pricing_flags ?? []) as PricingFlag[];

  return (
    <div className="space-y-6">
      {/* Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Seats</span>
              <p className="font-medium">{version.seat_count}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Contract Term</span>
              <p className="font-medium">{version.contract_term_months} months</p>
            </div>
            <div>
              <span className="text-muted-foreground">Risk Tier</span>
              <p className="font-medium">
                <Badge variant="outline">
                  {RISK_TIER_LABELS[version.risk_tier]}
                </Badge>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Target Margin</span>
              <p className="font-medium">
                {formatPercent(Number(version.target_margin_pct))}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Overhead</span>
              <p className="font-medium">
                {formatPercent(Number(version.overhead_pct))}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Labor</span>
              <p className="font-medium">
                {formatPercent(Number(version.labor_pct))}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Discount</span>
              <p className="font-medium">
                {formatPercent(Number(version.discount_pct))}
              </p>
            </div>
          </div>
          {version.notes && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Notes</span>
              <p className="text-sm mt-1">{version.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version Diff */}
      {previousVersion !== undefined && (
        <VersionDiff current={version} previous={previousVersion ?? null} />
      )}

      {/* Pricing Snapshot — full breakdown if PricingOutput available */}
      {pricingOutput ? (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CostBreakdown
              pricing={mapPricingOutputToBreakdownProps(pricingOutput, version.seat_count)}
              seatCount={version.seat_count}
              mode="full"
              defaultExpanded
              discountPct={Number(version.discount_pct)}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  True Cost/Seat
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-xl font-bold">
                  {formatCurrency(Number(version.computed_true_cost_per_seat ?? 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Suggested Price/Seat
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-xl font-bold">
                  {formatCurrency(Number(version.computed_suggested_price ?? 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Discounted Price/Seat
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-xl font-bold">
                  {formatCurrency(Number(version.computed_discounted_price ?? 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Post-Discount Margin
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-xl font-bold">
                  {formatPercent(Number(version.computed_margin_post_discount ?? 0))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">MRR</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-lg font-bold">
                  {formatCurrency(Number(version.computed_mrr ?? 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">ARR</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-lg font-bold">
                  {formatCurrency(Number(version.computed_arr ?? 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Pre-Discount Margin
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-lg font-bold">
                  {formatPercent(Number(version.computed_margin_pre_discount ?? 0))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Tools in this Version</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty Multiplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {version.tools.map((vt) => (
                <TableRow key={vt.id || vt.tool_id}>
                  <TableCell className="font-medium">
                    {vt.tool?.name ?? vt.tool_id}
                  </TableCell>
                  <TableCell>{vt.tool?.vendor ?? "—"}</TableCell>
                  <TableCell>
                    {vt.tool && (
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORY_LABELS[vt.tool.category]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(vt.quantity_multiplier).toFixed(1)}x
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Flags */}
      {flags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Pricing Flags</h3>
          <PricingFlags flags={flags} />
        </div>
      )}
    </div>
  );
}
