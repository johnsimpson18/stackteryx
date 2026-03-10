"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createContractAction } from "@/actions/clients";
import { calculatePricing } from "@/lib/pricing/engine";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import type {
  BundleWithMeta,
  BundleVersion,
  PricingToolInput,
} from "@/lib/types";
import type { OrgSettings } from "@/lib/db/org-settings";

interface VersionOption {
  version: BundleVersion;
  tools: PricingToolInput[];
}

interface ContractFormProps {
  clientId: string;
  clientName: string;
  bundles: BundleWithMeta[];
  versionsByBundle: Record<string, VersionOption[]>;
  settings: OrgSettings | null;
}

function marginColor(margin: number): string {
  if (margin >= 0.25) return "text-emerald-600";
  if (margin >= 0.15) return "text-amber-600";
  return "text-red-600";
}

export function ContractForm({
  clientId,
  clientName,
  bundles,
  versionsByBundle,
  settings,
}: ContractFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [seatCount, setSeatCount] = useState(25);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const availableVersions = selectedBundleId
    ? versionsByBundle[selectedBundleId] ?? []
    : [];

  const selectedVersionOption = availableVersions.find(
    (v) => v.version.id === selectedVersionId
  );

  const activeBundles = bundles.filter((b) => b.status === "active");

  // Live margin preview
  const pricing =
    selectedVersionOption && seatCount > 0
      ? calculatePricing({
          tools: selectedVersionOption.tools,
          seat_count: seatCount,
          target_margin_pct: Number(selectedVersionOption.version.target_margin_pct),
          overhead_pct: Number(selectedVersionOption.version.overhead_pct),
          labor_pct: Number(selectedVersionOption.version.labor_pct),
          discount_pct: Number(selectedVersionOption.version.discount_pct),
          red_zone_margin_pct: Number(settings?.red_zone_margin_pct ?? 0.15),
          max_discount_no_approval_pct: Number(
            settings?.max_discount_no_approval_pct ?? 0.1
          ),
          contract_term_months: Number(
            selectedVersionOption.version.contract_term_months
          ),
        })
      : null;

  function handleBundleChange(bundleId: string) {
    setSelectedBundleId(bundleId);
    setSelectedVersionId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBundleId || !selectedVersionId) return;

    startTransition(async () => {
      const result = await createContractAction(clientId, {
        bundle_id: selectedBundleId,
        bundle_version_id: selectedVersionId,
        seat_count: seatCount,
        start_date: startDate,
        end_date: endDate,
        notes,
      });

      if (result.success) {
        toast.success("Contract created successfully");
        router.push(`/clients/${clientId}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Contract details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service & Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={selectedBundleId} onValueChange={handleBundleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeBundles.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeBundles.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No active bundles. Create and activate a bundle first.
                  </p>
                )}
              </div>

              {selectedBundleId && (
                <div className="space-y-2">
                  <Label>Configuration</Label>
                  <Select
                    value={selectedVersionId}
                    onValueChange={setSelectedVersionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a configuration..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVersions.map(({ version: v }) => (
                        <SelectItem key={v.id} value={v.id}>
                          v{v.version_number} ·{" "}
                          {formatPercent(Number(v.computed_margin_post_discount ?? 0))}{" "}
                          margin ·{" "}
                          {formatCurrency(Number(v.computed_discounted_price ?? 0))}
                          /seat
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableVersions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No configurations for this service yet.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contract Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seat_count">Seat Count</Label>
                <Input
                  id="seat_count"
                  type="number"
                  min={1}
                  value={seatCount}
                  onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contract notes, special terms..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live pricing preview */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Revenue Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pricing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-xs text-muted-foreground">MRR</p>
                      <p className="text-xl font-bold font-mono mt-0.5">
                        {formatCurrency(pricing.total_mrr)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-xs text-muted-foreground">ARR</p>
                      <p className="text-xl font-bold font-mono mt-0.5">
                        {formatCurrency(pricing.total_arr)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-xs text-muted-foreground">Margin</p>
                      <p
                        className={cn(
                          "text-xl font-bold font-mono mt-0.5",
                          marginColor(pricing.margin_pct_post_discount)
                        )}
                      >
                        {formatPercent(pricing.margin_pct_post_discount)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        Monthly Profit
                      </p>
                      <p className="text-xl font-bold font-mono mt-0.5">
                        {formatCurrency(pricing.total_monthly_margin)}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price/seat</span>
                      <span className="font-mono">
                        {formatCurrency(pricing.discounted_price_per_seat)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost/seat</span>
                      <span className="font-mono">
                        {formatCurrency(pricing.true_cost_per_seat)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seats</span>
                      <span className="font-mono">{seatCount}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center">
                    Pricing computed at {seatCount} seats using v
                    {selectedVersionOption?.version.version_number} parameters
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Select a bundle and version to see revenue preview
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Creating contract for <strong>{clientName}</strong>
        </p>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/clients/${clientId}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !selectedVersionId || seatCount < 1}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isPending ? "Creating..." : "Create Contract"}
          </Button>
        </div>
      </div>
    </form>
  );
}
