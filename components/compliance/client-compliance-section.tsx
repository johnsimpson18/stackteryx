"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { assessClientComplianceAction } from "@/actions/compliance";
import type { ComplianceScore, DomainScore, ComplianceGap } from "@/lib/compliance/scoring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface StoredScore {
  framework_id: string;
  framework_name: string;
  score_pct: number;
  controls_total: number;
  controls_satisfied: number;
  controls_partial: number;
  controls_gap: number;
  controls_manual: number;
  domain_scores: DomainScore[] | null;
  gap_details: ComplianceGap[] | null;
  suggested_services: ComplianceScore["suggestedServices"] | null;
  computed_at: string;
}

interface ClientComplianceSectionProps {
  clientId: string;
  scores: StoredScore[];
  enabledFrameworkIds: string[];
}

// ── Score helpers ────────────────────────────────────────────────────────────

function getScoreColor(pct: number): string {
  if (pct >= 80) return "text-[#A8FF3E]";
  if (pct >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getBarColor(pct: number): string {
  if (pct >= 80) return "bg-[#A8FF3E]";
  if (pct >= 50) return "bg-yellow-400";
  return "bg-red-400";
}

function statusIcon(status: string) {
  if (status === "satisfied")
    return <CheckCircle2 className="h-3.5 w-3.5 text-[#A8FF3E]" />;
  if (status === "partial")
    return <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />;
  if (status === "gap")
    return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
}

function statusLabel(status: string) {
  if (status === "satisfied") return "Satisfied";
  if (status === "partial") return "Partial";
  if (status === "gap") return "Gap";
  return "Manual";
}

// ── Component ───────────────────────────────────────────────────────────────

export function ClientComplianceSection({
  clientId,
  scores,
  enabledFrameworkIds,
}: ClientComplianceSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assessingFw, setAssessingFw] = useState<string | null>(null);
  const [expandedGaps, setExpandedGaps] = useState(false);

  // Select first scored framework or first enabled
  const [selectedFw, setSelectedFw] = useState(
    scores[0]?.framework_id ?? enabledFrameworkIds[0] ?? ""
  );

  const currentScore = scores.find((s) => s.framework_id === selectedFw);

  function handleAssess(frameworkId: string) {
    setAssessingFw(frameworkId);
    startTransition(async () => {
      const result = await assessClientComplianceAction(clientId, frameworkId);
      setAssessingFw(null);
      if (result.success) {
        toast.success(`Assessment complete: ${result.data!.scorePct}%`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Assessment failed");
      }
    });
  }

  if (enabledFrameworkIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No compliance frameworks enabled.{" "}
            <a href="/compliance" className="text-[#A8FF3E] hover:underline">
              Configure frameworks
            </a>{" "}
            to start assessing this client.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Compliance
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Framework tabs */}
          {enabledFrameworkIds.length > 1 && (
            <div className="flex items-center gap-1">
              {scores.map((s) => (
                <button
                  key={s.framework_id}
                  onClick={() => setSelectedFw(s.framework_id)}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium transition-colors",
                    selectedFw === s.framework_id
                      ? "bg-[#A8FF3E]/10 text-[#A8FF3E]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.framework_name}
                </button>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAssess(selectedFw)}
            disabled={isPending || !!assessingFw}
          >
            {assessingFw === selectedFw ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1" />
            )}
            {currentScore ? "Re-assess" : "Assess"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!currentScore ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShieldAlert className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No compliance assessment yet. Click &quot;Assess&quot; to evaluate
              this client against the selected framework.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score gauge */}
            <div className="flex items-center gap-6">
              <div className="relative flex items-center justify-center">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-[#1E1E1E]"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(currentScore.score_pct / 100) * 264} 264`}
                    transform="rotate(-90 50 50)"
                    className={getScoreColor(currentScore.score_pct)}
                  />
                </svg>
                <span
                  className={cn(
                    "absolute text-xl font-bold",
                    getScoreColor(currentScore.score_pct)
                  )}
                >
                  {currentScore.score_pct}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{currentScore.framework_name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-[#A8FF3E]" />
                    {currentScore.controls_satisfied} satisfied
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-400" />
                    {currentScore.controls_partial} partial
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-400" />
                    {currentScore.controls_gap} gaps
                  </span>
                  {currentScore.controls_manual > 0 && (
                    <span className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {currentScore.controls_manual} manual
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Assessed{" "}
                  {new Date(currentScore.computed_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Domain breakdown bars */}
            {currentScore.domain_scores &&
              currentScore.domain_scores.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Domain Breakdown
                  </p>
                  {currentScore.domain_scores.map((ds) => (
                    <div key={ds.domainCode} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate max-w-[200px]">
                          {ds.domain}
                        </span>
                        <span
                          className={cn(
                            "font-mono",
                            getScoreColor(ds.scorePct)
                          )}
                        >
                          {ds.scorePct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1E1E1E] overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            getBarColor(ds.scorePct)
                          )}
                          style={{ width: `${ds.scorePct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* Gap analysis — collapsible control detail */}
            {currentScore.gap_details &&
              currentScore.gap_details.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedGaps(!expandedGaps)}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    {expandedGaps ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    Control Details ({currentScore.controls_total} controls)
                  </button>

                  {expandedGaps && (
                    <div className="mt-3 rounded-lg border border-[#1E1E1E] overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]">Status</TableHead>
                            <TableHead>Control</TableHead>
                            <TableHead>Matched Tools</TableHead>
                            <TableHead>Missing Domains</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentScore.gap_details
                            .filter((g: ComplianceGap) => g.status !== "manual")
                            .sort((a: ComplianceGap, b: ComplianceGap) => {
                              const order = { gap: 0, partial: 1, satisfied: 2, manual: 3 };
                              return order[a.status] - order[b.status];
                            })
                            .map((g: ComplianceGap) => (
                              <TableRow key={g.control.id}>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {statusIcon(g.status)}
                                    <span className="text-[10px]">
                                      {statusLabel(g.status)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs font-mono text-muted-foreground mr-1.5">
                                    {g.control.id}
                                  </span>
                                  <span className="text-xs">
                                    {g.control.name}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {g.matchedToolNames.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {g.matchedToolNames.map((name: string) => (
                                        <Badge
                                          key={name}
                                          variant="outline"
                                          className="text-[10px] py-0"
                                        >
                                          {name}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {g.missingDomains.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {g.missingDomains.map((d: string) => (
                                        <Badge
                                          key={d}
                                          variant="outline"
                                          className="text-[10px] py-0 border-red-400/30 text-red-400"
                                        >
                                          {d}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

            {/* Suggested services */}
            {currentScore.suggested_services &&
              currentScore.suggested_services.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Suggested Services to Close Gaps
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {currentScore.suggested_services.map(
                      (svc: ComplianceScore["suggestedServices"][number]) => (
                        <div
                          key={svc.bundleId}
                          className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-3"
                        >
                          <p className="text-sm font-medium">
                            {svc.bundleName}
                          </p>
                          {svc.outcomeStatement && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {svc.outcomeStatement}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 border-[#A8FF3E]/30 text-[#A8FF3E]"
                            >
                              Closes {svc.gapCount} gap
                              {svc.gapCount !== 1 ? "s" : ""}
                            </Badge>
                            {svc.missingDomainsCovered.map((d: string) => (
                              <Badge
                                key={d}
                                variant="outline"
                                className="text-[10px] py-0"
                              >
                                {d}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Disclaimer */}
            <div className="rounded-lg bg-[#111111] border border-[#1E1E1E] p-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <Info className="h-3 w-3 inline mr-1 relative -top-px" />
                This assessment estimates control coverage based on delivered
                services and mapped security tooling. Administrative, procedural,
                and physical safeguards require manual validation and are excluded
                from the automated score. This report does not constitute a formal
                compliance audit.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
