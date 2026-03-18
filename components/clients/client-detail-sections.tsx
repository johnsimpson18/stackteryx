"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  updateProposalStatusAction,
  exportProposalPdfAction,
  exportProposalDocxAction,
} from "@/actions/proposals";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  X,
  CalendarClock,
  ArrowRight,
  FileText,
  FileDown,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import type { Proposal, ProposalStatus, ClientContractWithMeta } from "@/lib/types";
import {
  calculateServiceFit,
  findSoonestRenewal,
  type ServiceFitLevel,
} from "@/lib/client-utils";

// Re-export for backwards compatibility
export { calculateServiceFit, findSoonestRenewal, type ServiceFitLevel };

// ── Renewal Intelligence Banner ──────────────────────────────────────────────

interface RenewalBannerProps {
  contractName: string;
  endDate: string;
  daysUntil: number;
  clientId: string;
}

export function RenewalBanner({
  contractName,
  endDate,
  daysUntil,
  clientId,
}: RenewalBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CalendarClock className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Renewal coming up
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {contractName} renews on{" "}
              <span suppressHydrationWarning>{new Date(endDate).toLocaleDateString()}</span> — {daysUntil} day
              {daysUntil !== 1 ? "s" : ""} away. Consider generating a fresh
              proposal before renewal.
            </p>
            <Button size="sm" className="mt-2" asChild>
              <Link href={`/sales-studio?client=${clientId}`}>
                Generate Renewal Proposal
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Service Fit Indicator ────────────────────────────────────────────────────

const FIT_COLORS: Record<ServiceFitLevel, { bg: string; text: string; border: string }> = {
  Strong: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  Moderate: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  Weak: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
};

export function ServiceFitBadge({ level }: { level: ServiceFitLevel }) {
  const c = FIT_COLORS[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium border cursor-help",
        c.bg,
        c.text,
        c.border
      )}
      title="Based on how well your assigned services match this client's industry profile."
    >
      Service Fit: {level}
    </span>
  );
}

// ── Proposal History Section ─────────────────────────────────────────────────

interface ProposalHistoryProps {
  proposals: Proposal[];
  clientId: string;
}

function relativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? "s" : ""} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? "s" : ""} ago`;
}

function downloadBase64(base64: string, filename: string, mime: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteNumbers], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  archived: "Archived",
};

const STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  archived: "bg-muted text-muted-foreground border-border",
};

export function ProposalHistory({ proposals, clientId }: ProposalHistoryProps) {
  const [, startTransition] = useTransition();

  function handleStatusChange(proposalId: string, newStatus: ProposalStatus) {
    startTransition(async () => {
      const result = await updateProposalStatusAction(proposalId, newStatus);
      if (result.success) {
        toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleExportPdf(proposalId: string) {
    startTransition(async () => {
      const result = await exportProposalPdfAction(proposalId);
      if (result.success) {
        downloadBase64(result.data.base64, result.data.filename, "application/pdf");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleExportDocx(proposalId: string) {
    startTransition(async () => {
      const result = await exportProposalDocxAction(proposalId);
      if (result.success) {
        downloadBase64(
          result.data.base64,
          result.data.filename,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposal History</CardTitle>
      </CardHeader>
      <CardContent>
        {proposals.length === 0 ? (
          <EmptyState
            title="No proposals generated yet"
            description="Generate a proposal to start building your sales pipeline for this client."
            actionLabel="Generate Proposal"
            actionHref={`/sales-studio?client=${clientId}`}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Export</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <ProposalRow
                  key={proposal.id}
                  proposal={proposal}
                  clientId={clientId}
                  onStatusChange={handleStatusChange}
                  onExportPdf={handleExportPdf}
                  onExportDocx={handleExportDocx}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ProposalRow({
  proposal,
  clientId,
  onStatusChange,
  onExportPdf,
  onExportDocx,
}: {
  proposal: Proposal;
  clientId: string;
  onStatusChange: (id: string, status: ProposalStatus) => void;
  onExportPdf: (id: string) => void;
  onExportDocx: (id: string) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const serviceNames = proposal.services_included.map((s) => s.service_name);

  return (
    <TableRow className="border-border/30">
      <TableCell>
        <span
          className="text-sm text-foreground"
          title={new Date(proposal.created_at).toLocaleString()}
          suppressHydrationWarning
        >
          {relativeDate(proposal.created_at)}
        </span>
      </TableCell>
      <TableCell>
        <span
          className="text-sm text-muted-foreground cursor-help"
          title={serviceNames.join(", ")}
        >
          {serviceNames.length} service{serviceNames.length !== 1 ? "s" : ""}
        </span>
      </TableCell>
      <TableCell>
        <div className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border transition-colors",
              STATUS_COLORS[proposal.status]
            )}
          >
            {STATUS_LABELS[proposal.status]}
            <ChevronDown className="h-3 w-3" />
          </button>
          {statusOpen && (
            <div className="absolute top-full left-0 mt-1 z-10 rounded-md border border-border bg-popover shadow-md py-1 min-w-[100px]">
              {(["draft", "sent", "archived"] as ProposalStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange(proposal.id, status);
                      setStatusOpen(false);
                    }}
                    className={cn(
                      "block w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors",
                      proposal.status === status
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onExportPdf(proposal.id)}
            title="Export PDF"
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onExportDocx(proposal.id)}
            title="Export Word"
          >
            <FileDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`/sales-studio?client=${clientId}&proposal=${proposal.id}`}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Load in Studio
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

