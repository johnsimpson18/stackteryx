"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toolMarginPercent } from "@/lib/stack-builder/calc";
import { STACK_CATEGORIES } from "@/lib/stack-builder/seed";
import type { StackTool } from "@/lib/stack-builder/types";

interface ToolInspectDialogProps {
  tool: StackTool | null;
  onClose: () => void;
}

function DataRow({ label, value, mono = false, className }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-medium", mono && "font-mono", className)}>
        {value}
      </span>
    </div>
  );
}

export function ToolInspectDialog({ tool, onClose }: ToolInspectDialogProps) {
  if (!tool) return null;

  const category = STACK_CATEGORIES.find((c) => c.id === tool.categoryId);
  const margin = toolMarginPercent(tool);
  const marginCls =
    margin >= 0.4 ? "text-emerald-400" : margin >= 0.25 ? "text-amber-400" : "text-red-400";
  const marginBarCls =
    margin >= 0.4 ? "bg-emerald-500" : margin >= 0.25 ? "bg-amber-500" : "bg-red-500";

  return (
    <Dialog open={!!tool} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm bg-card border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {category && (
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                style={{ background: `${category.color}20`, border: `1px solid ${category.color}30` }}
              >
                {category.icon}
              </div>
            )}
            <div>
              <DialogTitle className="text-base font-semibold text-foreground leading-tight">
                {tool.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{tool.vendor}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Category badge */}
        {category && (
          <div
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium w-fit"
            style={{
              background: `${category.color}15`,
              color: category.color,
              border: `1px solid ${category.color}25`,
            }}
          >
            <span>{category.icon}</span>
            {category.name}
          </div>
        )}

        <Separator className="bg-border/50" />

        {/* Pricing */}
        <div className="divide-y divide-border/40">
          <DataRow label="Cost / seat / mo" value={`$${tool.costMonthly.toFixed(2)}`} mono />
          <DataRow label="MSRP / seat / mo" value={`$${tool.msrpMonthly.toFixed(2)}`} mono />
          <DataRow
            label="Tool margin"
            value={
              <span className={marginCls}>
                {(margin * 100).toFixed(1)}%
              </span>
            }
          />
        </div>

        {/* Margin bar */}
        <div className="mt-1">
          <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", marginBarCls)}
              style={{ width: `${Math.min(margin * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Notes */}
        {tool.notes && (
          <>
            <Separator className="bg-border/50" />
            <p className="text-xs text-muted-foreground leading-relaxed">{tool.notes}</p>
          </>
        )}

        {/* Tags */}
        {tool.tags && tool.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {tool.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
