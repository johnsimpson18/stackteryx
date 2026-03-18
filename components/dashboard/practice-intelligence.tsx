"use client";

import { AgentBadge } from "@/components/agents/agent-badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { OrgSignals } from "@/lib/intelligence/signal-engine";

interface PracticeIntelligenceProps {
  signals: OrgSignals;
  portfolioMrr: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  edr: "EDR",
  siem: "SIEM",
  backup: "Backup",
  identity: "Identity",
  email_security: "Email Security",
  mfa: "MFA",
  mdr: "MDR",
  vulnerability_management: "Vuln Mgmt",
  network_monitoring: "Network",
  dns_filtering: "DNS Filtering",
  dark_web: "Dark Web",
  security_awareness_training: "Sec Awareness",
  documentation: "Compliance",
  rmm: "RMM",
  psa: "PSA",
};

export function PracticeIntelligence({ signals, portfolioMrr }: PracticeIntelligenceProps) {
  const maxToolCount = signals.topToolCategories[0]?.count ?? 1;
  const advisoryPct = Math.round(signals.advisoryEngagementRate.rate * 100);

  // Generate pattern insights
  const insights: string[] = [];

  if (signals.commonToolCombinations.length > 0) {
    const [a, b] = signals.commonToolCombinations[0];
    insights.push(
      `You build ${CATEGORY_LABELS[a] ?? a} + ${CATEGORY_LABELS[b] ?? b} combinations most often`,
    );
  }

  if (signals.avgServiceMargin.current >= 35 && signals.avgServiceMargin.current <= 45) {
    insights.push(
      `Your avg margin is ${signals.avgServiceMargin.current}% — within typical MSP range of 35-45%`,
    );
  } else if (signals.avgServiceMargin.current > 45) {
    insights.push(
      `Your avg margin is ${signals.avgServiceMargin.current}% — above typical MSP range of 35-45%`,
    );
  } else if (signals.avgServiceMargin.current > 0) {
    insights.push(
      `Your avg margin is ${signals.avgServiceMargin.current}% — below typical MSP range of 35-45%`,
    );
  }

  if (signals.complianceDistribution.topFramework !== "None") {
    insights.push(
      `Your client base primarily requires ${signals.complianceDistribution.topFramework} compliance`,
    );
  }

  return (
    <div
      className="rounded-xl"
      style={{
        background: "#111111",
        border: "1px solid #1e1e1e",
        padding: 20,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <AgentBadge agentId="scout" size="sm" showTitle={false} />
        <span
          className="text-sm font-semibold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your Practice Intelligence
        </span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricItem
          label="Avg service margin"
          value={`${signals.avgServiceMargin.current}%`}
          trend={signals.avgServiceMargin.trend}
        />
        <MetricItem
          label="Advisory engagement"
          value={`${advisoryPct}%`}
          subtitle={`${signals.advisoryEngagementRate.clientsWithBrief} of ${signals.advisoryEngagementRate.totalClients} clients`}
        />
        <MetricItem
          label="Portfolio MRR"
          value={`$${portfolioMrr.toLocaleString("en-US")}`}
        />
        <MetricItem
          label="Top framework"
          value={signals.complianceDistribution.topFramework}
        />
      </div>

      {/* Tool usage bars */}
      {signals.topToolCategories.length > 0 && (
        <div className="mb-5">
          <p
            className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3"
            style={{ fontFamily: "var(--font-mono-alt)" }}
          >
            Your most-used tools
          </p>
          <div className="space-y-2">
            {signals.topToolCategories.slice(0, 5).map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span
                  className="text-xs w-24 shrink-0 truncate"
                  style={{ color: "#cccccc", fontFamily: "var(--font-mono-alt)" }}
                >
                  {CATEGORY_LABELS[cat.name] ?? cat.name}
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(cat.count / maxToolCount) * 100}%`,
                      background: "linear-gradient(to right, #c8f135, #5DCAA5)",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] w-16 text-right shrink-0"
                  style={{ color: "#888888", fontFamily: "var(--font-mono-alt)" }}
                >
                  {cat.count} service{cat.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern insights */}
      {insights.length > 0 && (
        <div
          className="rounded-lg px-4 py-3"
          style={{ background: "#0d0d0d", borderLeft: "3px solid #c8f135" }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <AgentBadge agentId="aria" size="sm" showTitle={false} />
            <span
              className="text-[11px] font-semibold text-foreground"
              style={{ fontFamily: "var(--font-mono-alt)" }}
            >
              Pattern insights
            </span>
          </div>
          <div className="space-y-1">
            {insights.map((insight, i) => (
              <p
                key={i}
                className="text-xs"
                style={{ color: "#888888", fontFamily: "var(--font-mono-alt)" }}
              >
                &bull; {insight}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricItem({
  label,
  value,
  subtitle,
  trend,
}: {
  label: string;
  value: string;
  subtitle?: string;
  trend?: "improving" | "declining" | "stable";
}) {
  return (
    <div>
      <p
        className="text-[10px] text-muted-foreground mb-1"
        style={{ fontFamily: "var(--font-mono-alt)" }}
      >
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        <span
          className="text-lg font-bold"
          style={{ color: "#ffffff", fontFamily: "var(--font-mono-alt)" }}
        >
          {value}
        </span>
        {trend && trend !== "stable" && (
          <span
            className={cn(
              "flex items-center text-[10px]",
              trend === "improving" ? "text-emerald-400" : "text-red-400",
            )}
          >
            {trend === "improving" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
          </span>
        )}
      </div>
      {subtitle && (
        <p
          className="text-[10px] text-muted-foreground mt-0.5"
          style={{ fontFamily: "var(--font-mono-alt)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Placeholder shown when < 3 services */
export function PracticeIntelligencePlaceholder() {
  return (
    <div
      className="rounded-xl text-center py-8"
      style={{
        background: "#111111",
        border: "1px solid #1e1e1e",
        padding: 20,
      }}
    >
      <AgentBadge agentId="scout" size="sm" />
      <p
        className="text-sm text-muted-foreground mt-3"
        style={{ fontFamily: "var(--font-mono-alt)" }}
      >
        Building your practice intelligence...
      </p>
      <p
        className="text-xs text-muted-foreground/60 mt-1"
        style={{ fontFamily: "var(--font-mono-alt)" }}
      >
        Patterns emerge after 3+ active services.
      </p>
    </div>
  );
}
