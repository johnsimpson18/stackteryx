"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentBadge } from "@/components/agents/agent-badge";
import { cn } from "@/lib/utils";
import {
  recalculateOrgCompliance,
  type OrgComplianceCoverage,
} from "@/actions/compliance-coverage";

// ── Types ────────────────────────────────────────────────────────────────────

interface ClientComplianceRow {
  clientId: string;
  clientName: string;
  frameworks: string[]; // which frameworks this client needs
  hipaaScore: number | null;
  pciScore: number | null;
  cmmcScore: number | null;
}

interface ComplianceIntelligenceClientProps {
  coverage: OrgComplianceCoverage | null;
  clientRows: ClientComplianceRow[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return "#5DCAA5";
  if (score >= 40) return "#ef9f27";
  return "#e24b4a";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-emerald-500/10";
  if (score >= 40) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function generateRecommendations(coverage: OrgComplianceCoverage): {
  title: string;
  impact: string;
  href: string;
  ctaLabel: string;
}[] {
  const recs: { title: string; impact: string; href: string; ctaLabel: string }[] = [];

  // Parse gaps — they're formatted as "Label (+N pts)"
  const parseGap = (gap: string) => {
    const match = gap.match(/^(.+?)\s*\(\+(\d+)\s*pts?\)$/);
    return match ? { label: match[1], pts: parseInt(match[2]) } : null;
  };

  // Find highest-impact gaps across frameworks
  const allGaps = new Map<string, { hipaa: number; pci: number; cmmc: number }>();

  for (const gap of coverage.hipaaGaps) {
    const parsed = parseGap(gap);
    if (parsed) {
      const existing = allGaps.get(parsed.label) ?? { hipaa: 0, pci: 0, cmmc: 0 };
      existing.hipaa = parsed.pts;
      allGaps.set(parsed.label, existing);
    }
  }
  for (const gap of coverage.pciGaps) {
    const parsed = parseGap(gap);
    if (parsed) {
      const existing = allGaps.get(parsed.label) ?? { hipaa: 0, pci: 0, cmmc: 0 };
      existing.pci = parsed.pts;
      allGaps.set(parsed.label, existing);
    }
  }
  for (const gap of coverage.cmmcGaps) {
    const parsed = parseGap(gap);
    if (parsed) {
      const existing = allGaps.get(parsed.label) ?? { hipaa: 0, pci: 0, cmmc: 0 };
      existing.cmmc = parsed.pts;
      allGaps.set(parsed.label, existing);
    }
  }

  // Sort by total impact
  const sorted = [...allGaps.entries()]
    .map(([label, scores]) => ({
      label,
      totalImpact: scores.hipaa + scores.pci + scores.cmmc,
      ...scores,
    }))
    .sort((a, b) => b.totalImpact - a.totalImpact);

  for (const gap of sorted.slice(0, 5)) {
    const impacts: string[] = [];
    if (gap.hipaa > 0) impacts.push(`+${gap.hipaa} pts HIPAA`);
    if (gap.pci > 0) impacts.push(`+${gap.pci} pts PCI DSS`);
    if (gap.cmmc > 0) impacts.push(`+${gap.cmmc} pts CMMC`);

    recs.push({
      title: `Add ${gap.label} tooling to improve compliance coverage`,
      impact: impacts.join(", "),
      href: "/stack-catalog",
      ctaLabel: `Browse ${gap.label} Tools`,
    });
  }

  return recs;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ComplianceIntelligenceClient({
  coverage: initialCoverage,
  clientRows,
}: ComplianceIntelligenceClientProps) {
  const [coverage, setCoverage] = useState(initialCoverage);
  const [isPending, startTransition] = useTransition();

  function handleRecalculate() {
    startTransition(async () => {
      const result = await recalculateOrgCompliance();
      setCoverage(result);
    });
  }

  const recommendations = coverage ? generateRecommendations(coverage) : [];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Compliance Intelligence
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <AgentBadge agentId="aria" size="sm" />
            {coverage && (
              <span
                suppressHydrationWarning
                className="text-xs"
                style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
              >
                Last analyzed: {new Date(coverage.calculatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <Button onClick={handleRecalculate} disabled={isPending} className="gap-2">
          {isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              Recalculate
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {!coverage ? (
        <div
          className="rounded-xl text-center py-16"
          style={{ background: "#111111", border: "1px solid #1e1e1e" }}
        >
          <p className="text-sm font-semibold text-foreground mb-1">
            No compliance analysis available
          </p>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Compliance coverage is calculated from your active services.
            Build a service first, then run an analysis.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/stack-builder">
                Open Stack Builder
              </Link>
            </Button>
            <Button onClick={handleRecalculate} disabled={isPending}>
              Run First Analysis
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Section 1: Framework Coverage Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            {([
              { label: "HIPAA", score: coverage.hipaaScore, tools: coverage.hipaaTools, prev: coverage.previousHipaa },
              { label: "PCI DSS", score: coverage.pciScore, tools: coverage.pciTools, prev: coverage.previousPci },
              { label: "CMMC", score: coverage.cmmcScore, tools: coverage.cmmcTools, prev: coverage.previousCmmc },
            ] as const).map((fw) => (
              <div
                key={fw.label}
                className="rounded-xl p-5"
                style={{ background: "#111111", border: "1px solid #1e1e1e" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#888888", fontFamily: "var(--font-mono-alt)" }}
                  >
                    {fw.label}
                  </span>
                  {fw.prev !== null && fw.score !== fw.prev && (
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: fw.score > fw.prev ? "#5DCAA5" : "#e24b4a" }}
                    >
                      {fw.score > fw.prev ? "+" : ""}{fw.score - fw.prev} pts
                    </span>
                  )}
                </div>
                <div className="text-center mb-3">
                  <span
                    className="text-4xl font-bold font-mono"
                    style={{ color: scoreColor(fw.score) }}
                  >
                    {fw.score}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${fw.score}%`, backgroundColor: scoreColor(fw.score) }}
                  />
                </div>
                <p
                  className="text-xs text-center"
                  style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
                >
                  {fw.tools.length} tool{fw.tools.length !== 1 ? "s" : ""} contributing
                </p>
              </div>
            ))}
          </div>

          {/* Section 2: Contributing Tools */}
          <div className="grid gap-4 md:grid-cols-3">
            {([
              { label: "HIPAA", score: coverage.hipaaScore, tools: coverage.hipaaTools, gaps: coverage.hipaaGaps },
              { label: "PCI DSS", score: coverage.pciScore, tools: coverage.pciTools, gaps: coverage.pciGaps },
              { label: "CMMC", score: coverage.cmmcScore, tools: coverage.cmmcTools, gaps: coverage.cmmcGaps },
            ] as const).map((fw) => (
              <div
                key={fw.label}
                className="rounded-xl p-4"
                style={{ background: "#111111", border: "1px solid #1e1e1e" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-foreground">
                    {fw.label} Coverage
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: scoreColor(fw.score) }}
                  >
                    {fw.score}%
                  </span>
                </div>

                {fw.tools.length > 0 && (
                  <div className="space-y-1 mb-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      Contributing
                    </p>
                    {fw.tools.map((tool) => (
                      <div
                        key={tool}
                        className="text-[11px] flex items-center gap-1.5"
                        style={{ color: "#cccccc", fontFamily: "var(--font-mono-alt)" }}
                      >
                        <span style={{ color: "#5DCAA5" }}>&#10003;</span>
                        {tool}
                      </div>
                    ))}
                  </div>
                )}

                {fw.gaps.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      To improve
                    </p>
                    {fw.gaps.slice(0, 4).map((gap) => (
                      <Link
                        key={gap}
                        href="/stack-catalog"
                        className="text-[11px] flex items-center justify-between gap-1.5 hover:bg-white/[0.02] rounded px-1 py-0.5 transition-colors"
                        style={{ fontFamily: "var(--font-mono-alt)" }}
                      >
                        <span className="text-muted-foreground">+ {gap}</span>
                        <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Section 3: Client Compliance Matrix */}
          {clientRows.length > 0 && (
            <div
              className="rounded-xl p-5"
              style={{ background: "#111111", border: "1px solid #1e1e1e" }}
            >
              <h2
                className="text-sm font-semibold text-foreground mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Client Compliance Matrix
              </h2>

              <div className="grid grid-cols-[1fr_120px_80px_80px_80px] gap-2 px-2 pb-2 border-b border-border">
                {["Client", "Needs", "HIPAA", "PCI DSS", "CMMC"].map((h) => (
                  <span
                    key={h}
                    className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <div className="divide-y divide-border/50">
                {clientRows.map((row) => (
                  <Link
                    key={row.clientId}
                    href={`/clients/${row.clientId}`}
                    className="grid grid-cols-[1fr_120px_80px_80px_80px] gap-2 items-center px-2 py-2.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-sm text-foreground truncate">
                      {row.clientName}
                    </span>
                    <span
                      className="text-[11px] text-muted-foreground truncate"
                      style={{ fontFamily: "var(--font-mono-alt)" }}
                    >
                      {row.frameworks.length > 0 ? row.frameworks.join(", ") : "—"}
                    </span>
                    <ScoreCell score={row.hipaaScore} />
                    <ScoreCell score={row.pciScore} />
                    <ScoreCell score={row.cmmcScore} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Aria's Recommendations */}
          {recommendations.length > 0 && (
            <div
              className="rounded-xl p-5"
              style={{ background: "#111111", border: "1px solid #1e1e1e" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <AgentBadge agentId="aria" size="sm" showTitle={false} />
                <span
                  className="text-sm font-semibold text-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Aria&apos;s Compliance Recommendations
                </span>
              </div>

              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg px-4 py-3"
                    style={{
                      borderLeft: "3px solid #c8f135",
                      background: "#0d0d0d",
                    }}
                  >
                    <span
                      className="text-xs font-bold shrink-0 mt-0.5"
                      style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
                    >
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm text-foreground"
                        style={{ fontFamily: "var(--font-mono-alt)" }}
                      >
                        {rec.title}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "#5DCAA5", fontFamily: "var(--font-mono-alt)" }}
                      >
                        Impact: {rec.impact}
                      </p>
                    </div>
                    <Link
                      href={rec.href}
                      className="shrink-0 text-xs font-semibold rounded px-2.5 py-1 transition-colors whitespace-nowrap"
                      style={{
                        color: "#ffffff",
                        fontFamily: "var(--font-mono-alt)",
                        border: "1px solid #333333",
                      }}
                    >
                      {rec.ctaLabel} &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="text-xs text-center text-muted-foreground/50">—</span>
    );
  }
  return (
    <span
      className="text-xs font-mono text-center font-semibold"
      style={{ color: scoreColor(score) }}
    >
      {score}%
    </span>
  );
}
