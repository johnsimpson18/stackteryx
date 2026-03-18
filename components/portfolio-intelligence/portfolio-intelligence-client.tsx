"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  DollarSign,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentBadge } from "@/components/agents/agent-badge";
import { AgentWorking } from "@/components/agents/agent-working";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { recalculateAllHealthScores } from "@/actions/client-health";
import { NudgeFeed } from "@/components/scout/nudge-feed";
import type { ScoutNudgeRecord } from "@/actions/scout-nudges";
import type { ToolCategory } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface Signal {
  id: string;
  type: "revenue" | "risk" | "action";
  title: string;
  description: string;
  clientName: string | null;
  cta: { label: string; href: string };
}

interface ClientHealthRow {
  clientId: string;
  clientName: string;
  hasContract: boolean;
  hasCTOBrief: boolean;
  margin: number | null;
  daysUntilRenewal: number | null;
  health: "green" | "amber" | "red";
  missingCategories: ToolCategory[];
  monthlyRevenue: number;
}

interface Opportunity {
  clientId: string;
  clientName: string;
  gapCount: number;
  gapLabels: string[];
  estimatedMonthlyValue: number;
}

interface CoverageRow {
  category: ToolCategory;
  label: string;
  clientsCovered: number;
  clientsMissing: number;
  totalClients: number;
}

interface HealthScoreEntry {
  overallScore: number;
  grade: string;
  color: string;
  scoreDelta: number | null;
}

interface PortfolioIntelligenceClientProps {
  signals: Signal[];
  clientHealthRows: ClientHealthRow[];
  portfolioMrr: number;
  totalOpportunityValue: number;
  opportunities: Opportunity[];
  coverageAnalysis: CoverageRow[];
  totalClientsWithContracts: number;
  healthScores?: Record<string, HealthScoreEntry>;
  scoutNudges?: ScoutNudgeRecord[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SIGNAL_CONFIG: Record<
  Signal["type"],
  { label: string; borderColor: string; dotColor: string }
> = {
  revenue: {
    label: "Revenue Signals",
    borderColor: "#5DCAA5",
    dotColor: "#5DCAA5",
  },
  risk: {
    label: "Risk Signals",
    borderColor: "#ef9f27",
    dotColor: "#ef9f27",
  },
  action: {
    label: "Action Required",
    borderColor: "#e24b4a",
    dotColor: "#e24b4a",
  },
};

const HEALTH_COLORS: Record<string, string> = {
  green: "#5DCAA5",
  amber: "#ef9f27",
  red: "#e24b4a",
};

// ── Component ────────────────────────────────────────────────────────────────

export function PortfolioIntelligenceClient({
  signals,
  clientHealthRows,
  portfolioMrr,
  totalOpportunityValue,
  opportunities,
  coverageAnalysis,
  totalClientsWithContracts,
  healthScores = {},
  scoutNudges = [],
}: PortfolioIntelligenceClientProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [, startTransition] = useTransition();

  function handleRunAnalysis() {
    setAnalyzing(true);
    startTransition(async () => {
      await recalculateAllHealthScores();
      window.location.reload();
    });
  }

  // Group signals by type
  const signalGroups = (["revenue", "risk", "action"] as const)
    .map((type) => ({
      type,
      items: signals.filter((s) => s.type === type),
    }))
    .filter((g) => g.items.length > 0);

  const potentialMrr = portfolioMrr + totalOpportunityValue;

  return (
    <div className="space-y-7">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Portfolio Intelligence
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <AgentBadge agentId="scout" size="sm" />
          </div>
        </div>
        <Button
          onClick={handleRunAnalysis}
          disabled={analyzing}
          className="gap-2"
        >
          {analyzing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              Run Analysis
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* ── Analyzing overlay ───────────────────────────────────────────── */}
      {analyzing && (
        <AgentWorking
          agentId="scout"
          subtitle="Scanning your portfolio for signals..."
        />
      )}

      {!analyzing && (
        <>
          {/* ── Scout Nudges ────────────────────────────────────────────── */}
          {scoutNudges.length > 0 && (
            <div
              className="rounded-xl"
              style={{
                background: "#111111",
                border: "1px solid #1e1e1e",
                padding: 20,
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <AgentBadge agentId="scout" size="sm" showTitle={false} />
                <span
                  className="text-sm font-semibold text-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Scout Nudges
                </span>
                <span
                  className="text-xs"
                  style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
                >
                  {scoutNudges.length} active
                </span>
              </div>
              <NudgeFeed nudges={scoutNudges} showFilter />
            </div>
          )}

          {/* ── Section 1: Signal Feed ──────────────────────────────────── */}
          <div
            className="rounded-xl"
            style={{
              background: "#111111",
              border: "1px solid #1e1e1e",
              padding: 20,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold text-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Signal Feed
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: "#555555",
                    fontFamily: "var(--font-mono-alt)",
                  }}
                >
                  {signals.length} signal{signals.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {signals.length === 0 ? (
              <p
                className="text-center py-8"
                style={{
                  fontSize: 14,
                  color: "#666666",
                  fontFamily: "var(--font-mono-alt)",
                }}
              >
                Scout sees no issues with your portfolio right now.
              </p>
            ) : (
              <div className="space-y-6">
                {signalGroups.map(({ type, items }) => {
                  const config = SIGNAL_CONFIG[type];
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: config.dotColor }}
                        />
                        <span
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{
                            color: config.dotColor,
                            fontFamily: "var(--font-mono-alt)",
                          }}
                        >
                          {config.label}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map((signal) => (
                          <div
                            key={signal.id}
                            className="flex items-start gap-3 rounded-lg px-4 py-3"
                            style={{
                              borderLeft: `3px solid ${config.borderColor}`,
                              background: "#0d0d0d",
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-sm font-medium text-foreground"
                                  style={{
                                    fontFamily: "var(--font-mono-alt)",
                                  }}
                                >
                                  {signal.title}
                                </span>
                              </div>
                              <p
                                className="mt-0.5"
                                style={{
                                  fontSize: 13,
                                  color: "#666666",
                                  fontFamily: "var(--font-mono-alt)",
                                }}
                              >
                                {signal.description}
                              </p>
                            </div>
                            <Link
                              href={signal.cta.href}
                              className="shrink-0 text-xs font-semibold rounded px-2.5 py-1 transition-colors whitespace-nowrap"
                              style={{
                                color: "#ffffff",
                                fontFamily: "var(--font-mono-alt)",
                                border: "1px solid #333333",
                              }}
                            >
                              {signal.cta.label} &rarr;
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Section 2: Portfolio Health Matrix ──────────────────────── */}
          {clientHealthRows.length > 0 && (
            <div
              className="rounded-xl"
              style={{
                background: "#111111",
                border: "1px solid #1e1e1e",
                padding: 20,
              }}
            >
              <h2
                className="text-sm font-semibold text-foreground mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Portfolio Health Matrix
              </h2>

              {/* Table header */}
              <div className="grid grid-cols-[1fr_64px_80px_80px_80px_80px_48px] gap-2 px-2 pb-2 border-b border-border">
                {["Client", "Score", "Contract", "CTO Brief", "Margin", "Renewal", ""].map(
                  (label) => (
                    <span
                      key={label}
                      className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      {label}
                    </span>
                  ),
                )}
              </div>

              {/* Rows — sorted by health score ascending (worst first) */}
              <div className="divide-y divide-border/50">
                {[...clientHealthRows]
                  .sort((a, b) => {
                    const aScore = healthScores[a.clientId]?.overallScore ?? 999;
                    const bScore = healthScores[b.clientId]?.overallScore ?? 999;
                    return aScore - bScore;
                  })
                  .map((row) => {
                    const hs = healthScores[row.clientId];
                    return (
                  <Link
                    key={row.clientId}
                    href={`/clients/${row.clientId}`}
                    className="grid grid-cols-[1fr_64px_80px_80px_80px_80px_48px] gap-2 items-center px-2 py-2.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-sm text-foreground truncate">
                      {row.clientName}
                    </span>
                    <span className="text-xs font-mono text-center font-semibold" style={{ color: hs ? HEALTH_COLORS[hs.color] ?? "#888888" : "#444444" }}>
                      {hs ? hs.overallScore : "—"}
                    </span>
                    <span className="text-xs text-center">
                      {row.hasContract ? (
                        <span style={{ color: "#5DCAA5" }}>&#10003;</span>
                      ) : (
                        <span style={{ color: "#e24b4a" }}>&#10007;</span>
                      )}
                    </span>
                    <span className="text-xs text-center">
                      {row.hasCTOBrief ? (
                        <span style={{ color: "#5DCAA5" }}>&#10003;</span>
                      ) : (
                        <span style={{ color: "#e24b4a" }}>&#10007;</span>
                      )}
                    </span>
                    <span
                      className="text-xs font-mono text-center"
                      style={{
                        color:
                          row.margin === null
                            ? "#444444"
                            : row.margin >= 0.4
                              ? "#5DCAA5"
                              : row.margin >= 0.25
                                ? "#ef9f27"
                                : "#e24b4a",
                      }}
                    >
                      {row.margin !== null
                        ? `${(row.margin * 100).toFixed(0)}%`
                        : "—"}
                    </span>
                    <span
                      className="text-xs font-mono text-center"
                      style={{
                        color:
                          row.daysUntilRenewal === null
                            ? "#444444"
                            : row.daysUntilRenewal <= 30
                              ? "#e24b4a"
                              : row.daysUntilRenewal <= 60
                                ? "#ef9f27"
                                : "#888888",
                      }}
                    >
                      {row.daysUntilRenewal !== null
                        ? `${row.daysUntilRenewal}d`
                        : "—"}
                    </span>
                    <span className="flex justify-center">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: HEALTH_COLORS[row.health],
                        }}
                      />
                    </span>
                  </Link>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── Section 3: Revenue Opportunity Map ─────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2">
            <div
              className="rounded-xl"
              style={{
                background: "#111111",
                border: "1px solid #1e1e1e",
                padding: 20,
              }}
            >
              <h2
                className="text-sm font-semibold text-foreground mb-5"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Revenue Opportunity Map
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs"
                    style={{
                      color: "#888888",
                      fontFamily: "var(--font-mono-alt)",
                    }}
                  >
                    Current portfolio MRR
                  </span>
                  <span
                    className="text-lg font-bold"
                    style={{
                      color: "#ffffff",
                      fontFamily: "var(--font-mono-alt)",
                    }}
                  >
                    {formatCurrency(portfolioMrr)}
                  </span>
                </div>

                {totalOpportunityValue > 0 && (
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs"
                      style={{
                        color: "#888888",
                        fontFamily: "var(--font-mono-alt)",
                      }}
                    >
                      Identified opportunities
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{
                        color: "#5DCAA5",
                        fontFamily: "var(--font-mono-alt)",
                      }}
                    >
                      +{formatCurrency(totalOpportunityValue)}
                    </span>
                  </div>
                )}

                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: "1px solid #1e1e1e" }}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: "#ffffff",
                      fontFamily: "var(--font-mono-alt)",
                    }}
                  >
                    Potential MRR
                  </span>
                  <span
                    className="text-xl font-bold"
                    style={{
                      color: "#c8f135",
                      fontFamily: "var(--font-mono-alt)",
                    }}
                  >
                    {formatCurrency(potentialMrr)}
                  </span>
                </div>

                {/* Visual bar */}
                {potentialMrr > 0 && (
                  <div className="h-2 rounded-full overflow-hidden bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(portfolioMrr / potentialMrr) * 100}%`,
                        background:
                          "linear-gradient(to right, #c8f135, #5DCAA5)",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Opportunities list */}
            <div
              className="rounded-xl"
              style={{
                background: "#111111",
                border: "1px solid #1e1e1e",
                padding: 20,
              }}
            >
              <h2
                className="text-sm font-semibold text-foreground mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Top Opportunities
              </h2>

              {opportunities.length === 0 ? (
                <p
                  className="text-center py-6"
                  style={{
                    fontSize: 13,
                    color: "#666666",
                    fontFamily: "var(--font-mono-alt)",
                  }}
                >
                  No upsell opportunities identified.
                </p>
              ) : (
                <div className="space-y-1">
                  {opportunities.slice(0, 8).map((opp) => (
                    <Link
                      key={opp.clientId}
                      href={`/clients/${opp.clientId}`}
                      className="flex items-center gap-3 py-2 hover:bg-white/[0.02] transition-colors rounded px-1"
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm text-foreground truncate"
                          style={{
                            fontFamily: "var(--font-mono-alt)",
                          }}
                        >
                          {opp.clientName}
                        </p>
                        <p
                          className="text-xs truncate"
                          style={{
                            color: "#666666",
                            fontFamily: "var(--font-mono-alt)",
                          }}
                        >
                          {opp.gapLabels.join(", ")}
                          {opp.gapCount > 3
                            ? ` +${opp.gapCount - 3} more`
                            : ""}
                        </p>
                      </div>
                      <span
                        className="text-xs font-semibold shrink-0"
                        style={{
                          color: "#5DCAA5",
                          fontFamily: "var(--font-mono-alt)",
                        }}
                      >
                        +{formatCurrency(opp.estimatedMonthlyValue)}/mo
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 4: Coverage Analysis ────────────────────────────── */}
          {coverageAnalysis.length > 0 && (
            <div
              className="rounded-xl"
              style={{
                background: "#111111",
                border: "1px solid #1e1e1e",
                padding: 20,
              }}
            >
              <h2
                className="text-sm font-semibold text-foreground mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Coverage Analysis
              </h2>
              <p
                className="mb-4"
                style={{
                  fontSize: 13,
                  color: "#666666",
                  fontFamily: "var(--font-mono-alt)",
                }}
              >
                Security domain coverage across{" "}
                {totalClientsWithContracts} client
                {totalClientsWithContracts !== 1 ? "s" : ""} with active
                contracts.
              </p>

              <div className="space-y-2">
                {coverageAnalysis.map((row) => {
                  const coveragePct =
                    row.totalClients > 0
                      ? (row.clientsCovered / row.totalClients) * 100
                      : 0;
                  return (
                    <div
                      key={row.category}
                      className="flex items-center gap-3 py-2"
                    >
                      <span
                        className="text-sm w-40 shrink-0"
                        style={{
                          color: "#ffffff",
                          fontFamily: "var(--font-mono-alt)",
                        }}
                      >
                        {row.label}
                      </span>

                      {/* Coverage bar */}
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${coveragePct}%`,
                            backgroundColor:
                              coveragePct >= 80
                                ? "#5DCAA5"
                                : coveragePct >= 50
                                  ? "#ef9f27"
                                  : "#e24b4a",
                          }}
                        />
                      </div>

                      <span
                        className="text-xs shrink-0 w-24 text-right"
                        style={{
                          color: "#888888",
                          fontFamily: "var(--font-mono-alt)",
                        }}
                      >
                        {row.clientsMissing} of {row.totalClients} missing
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
