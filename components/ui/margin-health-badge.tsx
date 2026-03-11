import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarginHealthBadgeProps {
  margin: number;
  showLabel?: boolean;
  className?: string;
}

type MarginLevel = "HEALTHY" | "WATCH" | "AT RISK" | "CRITICAL";

function getMarginLevel(margin: number): MarginLevel {
  if (margin >= 0.4) return "HEALTHY";
  if (margin >= 0.25) return "WATCH";
  if (margin >= 0.1) return "AT RISK";
  return "CRITICAL";
}

const LEVEL_STYLES: Record<MarginLevel, string> = {
  HEALTHY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  WATCH: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "AT RISK": "bg-red-500/10 text-red-400 border-red-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function MarginHealthBadge({
  margin,
  showLabel = true,
  className,
}: MarginHealthBadgeProps) {
  const level = getMarginLevel(margin);
  const pct = `${(margin * 100).toFixed(1)}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border",
        LEVEL_STYLES[level],
        className,
      )}
    >
      {level === "CRITICAL" && <AlertTriangle className="h-2.5 w-2.5" />}
      {pct}
      {showLabel && <span className="ml-0.5">{level}</span>}
    </span>
  );
}
