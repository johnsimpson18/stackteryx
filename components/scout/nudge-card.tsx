"use client";

import { useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { AgentBadge } from "@/components/agents/agent-badge";
import { dismissNudge, markNudgeActed } from "@/actions/scout-nudges";
import type { ScoutNudgeRecord } from "@/actions/scout-nudges";

const NUDGE_TYPE_LABELS: Record<string, string> = {
  renewal_risk: "Renewal Risk",
  health_decline: "Health Decline",
  advisory_gap: "Advisory Gap",
  compliance_gap: "Compliance Gap",
  upsell_opportunity: "Upsell Opportunity",
  portfolio_pattern: "Portfolio Pattern",
  margin_alert: "Margin Alert",
  stale_proposal: "Stale Proposal",
};

function priorityColor(priority: number): string {
  if (priority <= 3) return "#e24b4a";
  if (priority <= 6) return "#ef9f27";
  return "#555555";
}

interface NudgeCardProps {
  nudge: ScoutNudgeRecord;
  onDismiss?: (id: string) => void;
}

export function NudgeCard({ nudge, onDismiss }: NudgeCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleDismiss() {
    startTransition(async () => {
      await dismissNudge(nudge.id);
      onDismiss?.(nudge.id);
    });
  }

  function handleAct() {
    startTransition(async () => {
      await markNudgeActed(nudge.id);
    });
  }

  return (
    <div
      className="rounded-lg px-4 py-3 space-y-2"
      style={{
        background: "#0d0d0d",
        borderLeft: `3px solid ${priorityColor(nudge.priority)}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AgentBadge agentId="scout" size="sm" showTitle={false} />
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{
              color: priorityColor(nudge.priority),
              fontFamily: "var(--font-mono-alt)",
            }}
          >
            {NUDGE_TYPE_LABELS[nudge.nudgeType] ?? nudge.nudgeType}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isPending}
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div>
        <p
          className="text-sm text-foreground"
          style={{ fontFamily: "var(--font-mono-alt)" }}
        >
          {nudge.title}
        </p>
        <p
          className="text-xs mt-0.5"
          style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
        >
          {nudge.body}
        </p>
      </div>

      {/* CTA */}
      {nudge.ctaHref && nudge.ctaLabel && (
        <div className="flex items-center gap-2">
          <Link
            href={nudge.ctaHref}
            onClick={handleAct}
            className="text-xs font-semibold rounded px-2.5 py-1 transition-colors whitespace-nowrap"
            style={{
              color: "#ffffff",
              fontFamily: "var(--font-mono-alt)",
              border: "1px solid #333333",
            }}
          >
            {nudge.ctaLabel} &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Compact variant for inline use ───────────────────────────────────────────

interface NudgeInlineProps {
  nudge: ScoutNudgeRecord;
}

export function NudgeInline({ nudge }: NudgeInlineProps) {
  return (
    <Link
      href={nudge.ctaHref ?? "#"}
      className="flex items-start gap-2 py-1.5 hover:bg-white/[0.02] rounded px-1 transition-colors"
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0 mt-1.5"
        style={{ backgroundColor: priorityColor(nudge.priority) }}
      />
      <span
        className="text-xs text-muted-foreground"
        style={{ fontFamily: "var(--font-mono-alt)" }}
      >
        {nudge.title}
      </span>
    </Link>
  );
}
