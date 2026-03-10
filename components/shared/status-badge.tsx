import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status =
  | "draft"
  | "active"
  | "archived"
  | "pending"
  | "approved"
  | "rejected"
  | "prospect"
  | "churned"
  | "expired"
  | "cancelled";

const STATUS_CONFIG: Record<Status, { dot: string; classes: string }> = {
  draft: {
    dot: "bg-slate-500",
    classes: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  },
  active: {
    dot: "bg-emerald-500",
    classes: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  },
  archived: {
    dot: "bg-red-500",
    classes: "bg-red-500/10 text-red-400 border border-red-500/20",
  },
  pending: {
    dot: "bg-amber-500",
    classes: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  },
  approved: {
    dot: "bg-emerald-500",
    classes: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  },
  rejected: {
    dot: "bg-red-500",
    classes: "bg-red-500/10 text-red-400 border border-red-500/20",
  },
  prospect: {
    dot: "bg-blue-500",
    classes: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  },
  churned: {
    dot: "bg-slate-500",
    classes: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  },
  expired: {
    dot: "bg-amber-500",
    classes: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  },
  cancelled: {
    dot: "bg-red-500",
    classes: "bg-red-500/10 text-red-400 border border-red-500/20",
  },
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        config.classes,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {label ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
