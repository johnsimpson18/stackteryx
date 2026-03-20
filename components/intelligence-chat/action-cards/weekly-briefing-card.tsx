"use client";

import Link from "next/link";
import { AgentBadge } from "@/components/agents/agent-badge";

interface WeeklyBriefingData {
  weekLabel?: string;
  priorities?: { urgency: string; title: string; context: string; actions: { label: string; href: string }[] }[];
  marginWatch?: { avgMargin: number; targetMargin: number; servicesBelow: { name: string; margin: number; serviceId: string }[] };
  marketSignals?: { impact: string; title: string; relevance: string }[];
  advisoryGaps?: { clientName: string; clientId: string; daysSinceBrief: number }[];
}

export function WeeklyBriefingCard({ data }: { data: WeeklyBriefingData }) {
  return (
    <div className="rounded-lg mt-2 overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Weekly Intelligence Briefing
          </span>
        </div>
        {data.weekLabel && (
          <p className="text-[10px] text-muted-foreground/50 mt-0.5" style={{ fontFamily: "var(--font-mono-alt)" }}>
            {data.weekLabel}
          </p>
        )}
      </div>

      {/* Priorities */}
      {data.priorities && data.priorities.length > 0 && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <AgentBadge agentId="scout" size="sm" showTitle={false} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              This Week&apos;s Priorities
            </span>
          </div>
          <div className="space-y-2">
            {data.priorities.map((p, i) => (
              <div key={i} className="space-y-1">
                <p className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
                  {p.urgency === "high" ? "\uD83D\uDD34" : "\uD83D\uDFE1"} {p.title}
                </p>
                <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
                  {p.context}
                </p>
                <div className="flex gap-1.5">
                  {p.actions.map((a, j) => (
                    <Link key={j} href={a.href} className="text-[10px] text-primary hover:underline" style={{ fontFamily: "var(--font-mono-alt)" }}>
                      {a.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Margin Watch */}
      {data.marginWatch && data.marginWatch.servicesBelow.length > 0 && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <AgentBadge agentId="margin" size="sm" showTitle={false} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Margin Watch
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2" style={{ fontFamily: "var(--font-mono-alt)" }}>
            Avg: {data.marginWatch.avgMargin}% &middot; Target: {data.marginWatch.targetMargin}% &middot; Gap: {(data.marginWatch.targetMargin - data.marginWatch.avgMargin).toFixed(1)}%
          </p>
          {data.marginWatch.servicesBelow.map((s) => (
            <div key={s.serviceId} className="flex items-center justify-between py-1">
              <span className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>{s.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400 font-mono">{s.margin}%</span>
                <Link href={`/services/${s.serviceId}`} className="text-[10px] text-primary hover:underline">
                  Fix &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market Signals */}
      {data.marketSignals && data.marketSignals.length > 0 && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <AgentBadge agentId="horizon" size="sm" showTitle={false} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Market Signals
            </span>
          </div>
          {data.marketSignals.map((s, i) => (
            <div key={i} className="py-1.5">
              <p className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
                {s.impact === "high" ? "\uD83D\uDD34" : "\uD83D\uDFE1"} {s.title}
              </p>
              <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
                {s.relevance}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Advisory Gaps */}
      {data.advisoryGaps && data.advisoryGaps.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AgentBadge agentId="sage" size="sm" showTitle={false} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Advisory Gaps
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-mono-alt)" }}>
            {data.advisoryGaps.length} client{data.advisoryGaps.length !== 1 ? "s" : ""} with no brief in 90+ days
          </p>
          <div className="flex flex-wrap gap-2">
            {data.advisoryGaps.map((g) => (
              <Link
                key={g.clientId}
                href={`/clients/${g.clientId}`}
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                {g.clientName} ({g.daysSinceBrief}d)
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
