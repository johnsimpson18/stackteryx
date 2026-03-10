"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatting";
import { Loader2, Check, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { confirmImportAction, discardImportAction } from "@/actions/imports";
import type { ExtractedVendor, ToolCategory } from "@/lib/types";

interface ImportPreviewProps {
  importId: string;
  extracted: ExtractedVendor[];
  onConfirmed: (summary: { vendors_created: number; cost_models_created: number }) => void;
  onDiscard: () => void;
}

export function ImportPreview({
  importId,
  extracted,
  onConfirmed,
  onDiscard,
}: ImportPreviewProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedVendors, setExpandedVendors] = useState<Set<number>>(new Set());

  const totalCostModels = extracted.reduce(
    (sum, v) => sum + v.cost_models.length,
    0
  );

  const toggleExpanded = (idx: number) => {
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);
    const result = await confirmImportAction(importId);
    setIsConfirming(false);

    if (result.success) {
      onConfirmed(result.data);
    } else {
      setError(result.error);
    }
  };

  const handleDiscard = async () => {
    setIsDiscarding(true);
    await discardImportAction(importId);
    setIsDiscarding(false);
    onDiscard();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Review extracted pricing
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {extracted.length} vendor{extracted.length !== 1 ? "s" : ""} and{" "}
          {totalCostModels} cost model{totalCostModels !== 1 ? "s" : ""} found.
          Review the data below, then confirm to import.
        </p>
      </div>

      <div className="rounded-lg border max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Cost Models</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {extracted.map((vendor, idx) => {
              const isExpanded = expandedVendors.has(idx);
              const catLabel = vendor.category
                ? CATEGORY_LABELS[vendor.category as ToolCategory] ?? vendor.category
                : "—";

              return (
                <>
                  <TableRow
                    key={`vendor-${idx}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpanded(idx)}
                  >
                    <TableCell className="w-8 px-2">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {vendor.vendor_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {catLabel}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {vendor.cost_models.length}
                    </TableCell>
                  </TableRow>
                  {isExpanded &&
                    vendor.cost_models.map((cm, cmIdx) => (
                      <TableRow
                        key={`vendor-${idx}-cm-${cmIdx}`}
                        className="bg-muted/20"
                      >
                        <TableCell></TableCell>
                        <TableCell
                          colSpan={3}
                          className="text-sm text-muted-foreground"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-foreground/80">
                                {cm.name}
                              </span>
                              <span className="ml-2 text-xs">
                                {cm.billing_basis} · {cm.cadence}
                              </span>
                            </div>
                            <div className="text-xs font-mono">
                              {cm.tiers.length === 1
                                ? formatCurrency(cm.tiers[0].unit_price) + "/unit"
                                : `${cm.tiers.length} tiers`}
                            </div>
                          </div>
                          {cm.tiers.length > 1 && (
                            <div className="mt-1.5 space-y-0.5">
                              {cm.tiers.map((t, tIdx) => (
                                <div
                                  key={tIdx}
                                  className="flex items-center gap-2 text-xs text-muted-foreground/80"
                                >
                                  <span className="w-20">
                                    {t.min_value}–{t.max_value ?? "∞"}
                                  </span>
                                  <span className="font-mono">
                                    {formatCurrency(t.unit_price)}/unit
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDiscard}
          disabled={isConfirming || isDiscarding}
        >
          {isDiscarding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          )}
          Discard
        </Button>
        <Button onClick={handleConfirm} disabled={isConfirming || isDiscarding}>
          {isConfirming ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Confirm Import ({extracted.length} vendor{extracted.length !== 1 ? "s" : ""})
        </Button>
      </div>
    </div>
  );
}
