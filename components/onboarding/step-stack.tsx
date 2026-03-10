"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATALOG_BY_CATEGORY, VENDOR_CATALOG } from "@/lib/onboarding/vendor-catalog";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { AgentGuide } from "./agent-guide";
import { PricingImportSheet } from "@/components/imports/pricing-import-sheet";
import type { ToolCategory } from "@/lib/types";

interface StepStackProps {
  selectedVendorIds: string[];
  endpointRange: string;
  onToggle: (id: string) => void;
}

export function StepStack({ selectedVendorIds, endpointRange, onToggle }: StepStackProps) {
  const [importOpen, setImportOpen] = useState(false);

  // Debounce agent trigger: only fire 700ms after last selection change
  const [agentTrigger, setAgentTrigger] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggle = useCallback(
    (id: string) => {
      onToggle(id);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setAgentTrigger((t) => t + 1);
      }, 700);
    },
    [onToggle]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectedNames = VENDOR_CATALOG.filter((v) =>
    selectedVendorIds.includes(v.id)
  ).map((v) => `${v.name} (${v.vendor})`);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Your Current Stack</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Select every tool you currently pay for from vendors. We&apos;ll add them to your catalog
          with real-world pricing defaults you can adjust later.
        </p>
      </div>

      {/* AI Guide */}
      <AgentGuide
        selectedVendorNames={selectedNames}
        endpointRange={endpointRange}
        trigger={agentTrigger}
      />

      {/* Vendor grid by category */}
      <div className="space-y-5">
        {CATALOG_BY_CATEGORY.map(([category, vendors]) => {
          const cat = category as ToolCategory;
          const colors = CATEGORY_COLORS[cat];
          const catLabel = CATEGORY_LABELS[cat];
          const selectedInCat = vendors.filter((v) =>
            selectedVendorIds.includes(v.id)
          ).length;

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full flex-shrink-0",
                    colors.dot
                  )}
                />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {catLabel}
                </h3>
                {selectedInCat > 0 && (
                  <span
                    className={cn(
                      "ml-auto text-xs font-medium px-1.5 py-0.5 rounded",
                      colors.bg,
                      colors.text
                    )}
                  >
                    {selectedInCat} selected
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {vendors.map((vendor) => {
                  const selected = selectedVendorIds.includes(vendor.id);
                  return (
                    <button
                      key={vendor.id}
                      type="button"
                      onClick={() => handleToggle(vendor.id)}
                      className={cn(
                        "relative text-left rounded-lg border px-3 py-2.5 transition-all duration-150",
                        "hover:border-primary/40 hover:bg-primary/5",
                        selected
                          ? "border-primary/60 bg-primary/8 shadow-[0_0_0_1px_oklch(0.65_0.18_250/0.3)]"
                          : "border-border bg-card/60"
                      )}
                    >
                      {selected && (
                        <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                        </span>
                      )}
                      <p className="text-sm font-medium text-foreground pr-5 leading-tight">
                        {vendor.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{vendor.vendor}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
                        {vendor.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-2 space-y-2">
        <p className="text-xs text-muted-foreground">
          Don&apos;t see your vendor?{" "}
          <span className="text-primary">
            You can add any tool manually after setup.
          </span>
        </p>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Upload className="h-3 w-3" />
          Or import from a pricing spreadsheet
        </button>
        <PricingImportSheet open={importOpen} onOpenChange={setImportOpen} />
      </div>
    </div>
  );
}
