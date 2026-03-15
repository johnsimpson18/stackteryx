"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Loader2,
  Download,
  FileText,
  ArrowRight,
  Clock,
  Brain,
  FileStack,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BriefOutputDisplay } from "@/components/fractional-cto/brief-output";
import {
  getCTOBriefs,
  exportBriefPdfAction,
  exportBriefDocxAction,
  exportCombinedPdfAction,
} from "@/actions/fractional-cto";
import type {
  CTOBriefRecord,
  BriefOutput,
} from "@/types/fractional-cto";
import type { ProposalContent } from "@/lib/types";

// ── Props ────────────────────────────────────────────────────────────────────

interface FractionalCTOStudioPanelProps {
  proposal: ProposalContent | null;
  recipientName: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (minutes > 0) return `${minutes} min ago`;
  return "just now";
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

function proposalToText(proposal: ProposalContent): string {
  const parts: string[] = [];

  parts.push("# Executive Summary\n\n" + proposal.executive_summary);

  if (proposal.services_overview?.length > 0) {
    parts.push("# Services Overview\n\n" + proposal.services_overview
      .map((s) => `## ${s.name}\n\n${s.description}`)
      .join("\n\n"));
  }

  parts.push("# Pricing Summary\n\n" + proposal.pricing_summary);
  parts.push("# Why Choose Us\n\n" + proposal.why_us);
  parts.push("# Risk Snapshot\n\n" + proposal.risk_snapshot);

  return parts.join("\n\n");
}

function recordToBriefOutput(record: CTOBriefRecord): BriefOutput {
  return {
    mspName: record.mspName,
    clientDomain: record.domain,
    industry: record.industry,
    generatedAt: record.createdAt,
    sections: record.briefJson,
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export function FractionalCTOStudioPanel({
  proposal,
  recipientName,
}: FractionalCTOStudioPanelProps) {
  const [briefs, setBriefs] = useState<CTOBriefRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrief, setSelectedBrief] = useState<CTOBriefRecord | null>(null);

  // Export state
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingCombined, setExportingCombined] = useState(false);
  const [, startTransition] = useTransition();

  // Fetch briefs on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    startTransition(async () => {
      try {
        const data = await getCTOBriefs();
        if (!cancelled) {
          setBriefs(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load briefs");
          setLoading(false);
        }
      }
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasProposal = proposal !== null;
  const activeBrief = selectedBrief ? recordToBriefOutput(selectedBrief) : null;

  async function handleExportPdf() {
    if (!activeBrief) return;
    setExportingPdf(true);
    try {
      const { base64, filename } = await exportBriefPdfAction(activeBrief, true);
      downloadBase64(base64, filename, "application/pdf");
    } catch {
      setError("Failed to generate PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportDocx() {
    if (!activeBrief) return;
    setExportingDocx(true);
    try {
      const { base64, filename } = await exportBriefDocxAction(activeBrief, true);
      downloadBase64(
        base64,
        filename,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    } catch {
      setError("Failed to generate document.");
    } finally {
      setExportingDocx(false);
    }
  }

  async function handleCombinedExport() {
    if (!selectedBrief || !proposal) return;
    setExportingCombined(true);
    setError(null);
    try {
      const { base64, filename } = await exportCombinedPdfAction({
        briefJson: selectedBrief.briefJson,
        mspName: selectedBrief.mspName,
        clientDomain: selectedBrief.domain,
        quarterLabel: selectedBrief.quarterLabel,
        generatedAt: selectedBrief.createdAt,
        proposalContent: proposalToText(proposal),
        proposalTitle: `Managed Services Proposal \u2014 ${recipientName}`,
      });
      downloadBase64(base64, filename, "application/pdf");
    } catch {
      setError("Failed to generate combined PDF.");
    } finally {
      setExportingCombined(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading briefs...</span>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────

  if (briefs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            No Technology Strategy Briefs generated yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate your first brief to attach it to proposals.
          </p>
        </div>
        <Button asChild>
          <Link href="/cto-briefs">
            Go to Fractional CTO
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* ── Left: Brief selector ──────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Attach a Technology Strategy Brief
        </h3>

        <div className="space-y-1 max-h-[480px] overflow-y-auto">
          {briefs.map((brief) => (
            <button
              key={brief.id}
              type="button"
              onClick={() => setSelectedBrief(brief)}
              className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                selectedBrief?.id === brief.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50 border border-transparent"
              }`}
            >
              <p className="text-sm font-medium text-foreground truncate">
                {brief.clientName ?? "Standalone"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {brief.domain} &middot; {brief.quarterLabel}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-[11px] text-muted-foreground/60">
                  {relativeTime(brief.createdAt)}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">
            No brief for this client yet?
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/cto-briefs">
              Generate a New Brief
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Right: Brief preview ──────────────────────────────────────── */}
      <div className="space-y-4">
        {!selectedBrief ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Select a brief from the left to preview it.
            </p>
          </div>
        ) : (
          <>
            {/* Preview area */}
            <div className="rounded-xl border border-border bg-card p-6 max-h-[600px] overflow-y-auto">
              <BriefOutputDisplay brief={activeBrief!} />
            </div>

            {/* Row 1: Standalone exports */}
            <div className="flex items-center gap-3 flex-wrap">
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
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDocx}
                disabled={exportingDocx}
              >
                {exportingDocx ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                Download Word
              </Button>
            </div>

            {/* Row 2: Combined export */}
            <div className="space-y-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button
                        size="sm"
                        onClick={handleCombinedExport}
                        disabled={!hasProposal || exportingCombined}
                      >
                        {exportingCombined ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileStack className="h-3.5 w-3.5" />
                        )}
                        Export Proposal + Brief (PDF)
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasProposal && (
                    <TooltipContent>
                      <p>Generate a proposal first to enable the combined export.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <p className="text-xs text-muted-foreground">
                Combines the active proposal and this brief into a single client-ready PDF
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
