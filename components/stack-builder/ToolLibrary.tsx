"use client";

import { useState, useMemo } from "react";
import { Search, Zap, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STACK_TOOLS, STACK_PRESETS } from "@/lib/stack-builder/seed";
import { ToolCard } from "./ToolCard";
import type { BundleState, StackTool } from "@/lib/stack-builder/types";

type FilterChip = "all" | "high-margin" | "msp-first";

interface ToolLibraryProps {
  bundleState: BundleState;
  onAdd: (tool: StackTool) => void;
  onRemove: (tool: StackTool) => void;
  onInspect: (tool: StackTool) => void;
  onLoadPreset: (presetId: string) => void;
}

export function ToolLibrary({
  bundleState,
  onAdd,
  onRemove,
  onInspect,
  onLoadPreset,
}: ToolLibraryProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");

  const selectedIds = useMemo(
    () =>
      new Set(
        Object.values(bundleState.selectedByCategory)
          .flat()
          .map((t) => t.id)
      ),
    [bundleState.selectedByCategory]
  );

  const filteredTools = useMemo(() => {
    return STACK_TOOLS.filter((tool) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const hit =
          tool.name.toLowerCase().includes(q) ||
          tool.vendor.toLowerCase().includes(q) ||
          tool.displayCategory.toLowerCase().includes(q) ||
          tool.shortDescription.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (activeFilter === "high-margin") return tool.tags?.includes("high-margin") ?? false;
      if (activeFilter === "msp-first") return tool.tags?.includes("msp-first") ?? false;
      return true;
    });
  }, [search, activeFilter]);

  // Group by displayCategory, preserving natural category order
  const grouped = useMemo(() => {
    const map: Record<string, StackTool[]> = {};
    for (const tool of filteredTools) {
      if (!map[tool.displayCategory]) map[tool.displayCategory] = [];
      map[tool.displayCategory].push(tool);
    }
    return map;
  }, [filteredTools]);

  const showPresets = !search.trim() && activeFilter === "all";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Tool Library
          </span>
          <span className="ml-auto text-[11px] font-mono text-primary">
            {selectedIds.size} added
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Search by name, vendor, or need…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/40 border-border focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div className="px-4 py-2 flex gap-1.5 flex-shrink-0 border-b border-border/50">
        {(
          [
            { id: "all", label: "All" },
            { id: "high-margin", label: "⚡ High Margin" },
            { id: "msp-first", label: "🎯 MSP-First" },
          ] as { id: FilterChip; label: string }[]
        ).map((chip) => (
          <button
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            className={cn(
              "text-[10px] font-medium px-2.5 py-1 rounded-md border transition-all",
              activeFilter === chip.id
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-white/3 text-muted-foreground/70 border-border/50 hover:text-foreground/70 hover:bg-white/5"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Quick Start Presets */}
        {showPresets && (
          <div className="px-3 pt-3 pb-3 border-b border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2 px-1">
              Quick Start
            </p>
            <div className="space-y-1.5">
              {STACK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onLoadPreset(preset.id)}
                  className="w-full text-left flex items-center gap-2.5 rounded-lg border border-border/60 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 px-3 py-2.5 transition-all group"
                >
                  <span className="text-xl leading-none flex-shrink-0">{preset.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground/90 group-hover:text-primary transition-colors leading-tight">
                      {preset.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/55 truncate mt-0.5">
                      {preset.description}
                    </p>
                  </div>
                  <Zap className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tool groups */}
        <div className="px-3 py-3 space-y-5">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-xs text-muted-foreground/50 text-center py-10">
              No tools match your search.
            </p>
          ) : (
            Object.entries(grouped).map(([category, tools]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex-1">
                    {category}
                  </p>
                  <span className="text-[9px] text-muted-foreground/35 font-mono">
                    {tools.filter((t) => selectedIds.has(t.id)).length}/{tools.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {tools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      isSelected={selectedIds.has(tool.id)}
                      onAdd={onAdd}
                      onRemove={onRemove}
                      onInspect={onInspect}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
