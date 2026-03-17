"use client";

import { usePlanContext } from "@/components/providers/plan-provider";
import type { LimitKey } from "@/lib/plans";
import { cn } from "@/lib/utils";

interface UsageBarProps {
  limitKey: LimitKey;
  showLabel?: boolean;
  compact?: boolean;
}

const LIMIT_LABELS: Record<string, string> = {
  services: "services",
  clients: "clients",
  aiGenerationsPerMonth: "AI generations this month",
  exportsPerMonth: "exports this month",
  ctoBriefsTotalEver: "CTO briefs",
  teamMembers: "team members",
};

const SHORT_LABELS: Record<string, string> = {
  services: "services",
  clients: "clients",
  aiGenerationsPerMonth: "AI this month",
  exportsPerMonth: "exports",
  ctoBriefsTotalEver: "briefs",
  teamMembers: "members",
};

export function UsageBar({
  limitKey,
  showLabel = true,
  compact = false,
}: UsageBarProps) {
  const { limits, usage } = usePlanContext();

  const val = limits[limitKey];
  // Boolean feature flags or infinite limits — don't render a bar
  if (typeof val === "boolean" || val === Infinity) return null;

  const limit = val as number;
  let current = 0;
  switch (limitKey) {
    case "aiGenerationsPerMonth":
      current = usage.aiGenerationsCount;
      break;
    case "exportsPerMonth":
      current = usage.exportsCount;
      break;
    default:
      // Count-based limits not tracked in client usage state
      return null;
  }

  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const color =
    pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500";

  const label = compact
    ? SHORT_LABELS[limitKey] ?? limitKey
    : LIMIT_LABELS[limitKey] ?? limitKey;

  return (
    <div className={cn("w-full", compact ? "space-y-0.5" : "space-y-1")}>
      {showLabel && (
        <div
          className={cn(
            "flex justify-between",
            compact ? "text-[10px]" : "text-xs",
            "text-muted-foreground",
          )}
        >
          <span>
            {current} / {limit} {label}
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-muted overflow-hidden",
          compact ? "h-1" : "h-1.5",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
