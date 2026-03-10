"use client";

import { Plus, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toolMarginPercent } from "@/lib/stack-builder/calc";
import type { StackTool } from "@/lib/stack-builder/types";

interface ToolCardProps {
  tool: StackTool;
  isSelected: boolean;
  onAdd: (tool: StackTool) => void;
  onRemove: (tool: StackTool) => void;
  onInspect: (tool: StackTool) => void;
}

export function ToolCard({ tool, isSelected, onAdd, onRemove, onInspect }: ToolCardProps) {
  const margin = toolMarginPercent(tool);
  const marginColor =
    margin >= 0.4 ? "text-emerald-400" : margin >= 0.25 ? "text-amber-400" : "text-red-400";
  const initial = tool.vendor.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all",
        isSelected
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border/60 bg-white/[0.02] hover:bg-white/[0.04] hover:border-border"
      )}
    >
      {/* Vendor initial badge */}
      <div className="h-7 w-7 rounded-md bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-foreground/60">
        {initial}
      </div>

      {/* Tool info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[13px] font-medium text-foreground/90 truncate leading-tight">
            {tool.name}
          </p>
          <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{tool.vendor}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/55 truncate mt-0.5 leading-tight">
          {tool.shortDescription}
        </p>
      </div>

      {/* Right: margin (hover) + inspect + add/remove */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className={cn("text-right transition-opacity", marginColor)}>
          <p className="text-[11px] font-mono font-semibold leading-tight">
            {(margin * 100).toFixed(0)}%
          </p>
          <p className="text-[9px] text-muted-foreground/40 leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
            margin
          </p>
        </div>

        <button
          onClick={() => onInspect(tool)}
          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/30 hover:text-foreground/60 hover:bg-white/8 transition-all ml-0.5 opacity-0 group-hover:opacity-100"
          title="Inspect tool"
        >
          <Info className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => (isSelected ? onRemove(tool) : onAdd(tool))}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-all border flex-shrink-0",
            isSelected
              ? "bg-emerald-500/12 border-emerald-500/25 text-emerald-400 hover:bg-red-500/12 hover:border-red-500/25 hover:text-red-400"
              : "bg-primary/8 border-primary/20 text-primary hover:bg-primary/18 hover:border-primary/35"
          )}
          title={isSelected ? "Remove from stack" : "Add to stack"}
        >
          {isSelected ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
