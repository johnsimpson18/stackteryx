"use client";

import { useState } from "react";
import { Loader2, Download, AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { exportRiskSummaryPdfAction } from "@/actions/fractional-cto";
import type { TechnologyRisk } from "@/types/fractional-cto";

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<TechnologyRisk["severity"], number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

function severityColor(severity: TechnologyRisk["severity"]): string {
  switch (severity) {
    case "High":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "Medium":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Low":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
}

function downloadBase64(base64: string, filename: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Props ────────────────────────────────────────────────────────────────────

interface RiskSummaryProps {
  risks: TechnologyRisk[];
  clientDomain: string;
  mspName: string;
  quarterLabel: string;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function RiskSummary({
  risks,
  clientDomain,
  mspName,
  quarterLabel,
  className,
}: RiskSummaryProps) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...risks].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  async function handleExportPdf() {
    setExportingPdf(true);
    setError(null);
    try {
      const { base64, filename } = await exportRiskSummaryPdfAction({
        risks,
        mspName,
        clientDomain,
        quarterLabel,
      });
      downloadBase64(base64, filename, "application/pdf");
    } catch {
      setError("Failed to export risk summary PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  // Empty state
  if (risks.length === 0) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-8 text-center space-y-3", className)}>
        <div className="mx-auto h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          No risks identified in this brief. Generate a new brief to refresh risk data.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Technology Risk Summary
          </h2>
          <p className="text-sm text-muted-foreground">
            {clientDomain}{" "}
            <span className="text-muted-foreground/60">&middot; As of {quarterLabel}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={exportingPdf}
        >
          {exportingPdf ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Export PDF
        </Button>
      </div>

      {/* Risk list */}
      <div className="space-y-3">
        {sorted.map((risk, i) => (
          <div
            key={i}
            className="rounded-lg border border-border/50 bg-card p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-full border",
                  severityColor(risk.severity),
                )}
              >
                {risk.severity.toUpperCase()}
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                {risk.title}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {risk.description}
            </p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
