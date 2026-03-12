"use client";

import { Check, Clock, AlertTriangle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PricingStatus } from "@/lib/pricing/status";

const STATUS_CONFIG: Record<
  PricingStatus,
  {
    label: string;
    icon: React.ElementType;
    className: string;
  }
> = {
  READY: {
    label: "Ready",
    icon: Check,
    className:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15",
  },
  INCOMPLETE: {
    label: "Incomplete",
    icon: Clock,
    className:
      "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15",
  },
  STALE: {
    label: "Stale",
    icon: AlertTriangle,
    className:
      "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15",
  },
  NOT_SET: {
    label: "Not Set",
    icon: X,
    className:
      "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted/70",
  },
};

interface PricingStatusBadgeProps {
  status: PricingStatus;
  className?: string;
}

export function PricingStatusBadge({ status, className }: PricingStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 gap-1",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
