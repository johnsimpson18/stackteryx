"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Globe, ArrowRight, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CATEGORY_COLORS } from "@/lib/constants";
import { getOverlapGroupForCategory } from "@/lib/vendor-overlap-mapping";
import type { Tool, ToolCategory } from "@/lib/types";

// ── Category display groups ─────────────────────────────────────────────────
// Maps ToolCategory values to friendlier display group names.
// Categories that share a group name are merged into one section.

const CATEGORY_DISPLAY_GROUPS: Record<ToolCategory, string> = {
  edr: "Endpoint",
  mdr: "Managed Detection & Response",
  siem: "Detection & Response",
  identity: "Identity",
  backup: "Backup & Recovery",
  network_monitoring: "Network",
  email_security: "Email Security",
  vulnerability_management: "Vulnerability",
  dns_filtering: "DNS & Web",
  mfa: "MFA",
  security_awareness_training: "Security Awareness",
  documentation: "Compliance & GRC",
  dark_web: "Dark Web Monitoring",
  rmm: "PSA & RMM",
  psa: "PSA & RMM",
  other: "Other",
};

interface ToolLibraryPanelProps {
  tools: Tool[];
  stackToolIds: Set<string>;
  stackCategories: ToolCategory[];
  onAddTool: (tool: Tool) => void;
}

export function ToolLibraryPanel({
  tools,
  stackToolIds,
  stackCategories,
  onAddTool,
}: ToolLibraryPanelProps) {
  const [search, setSearch] = useState("");

  // Categories already in the stack (for overlap indicators)
  const stackCategorySet = useMemo(
    () => new Set(stackCategories),
    [stackCategories]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return tools;
    const q = search.toLowerCase();
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.vendor.toLowerCase().includes(q) ||
        CATEGORY_DISPLAY_GROUPS[t.category]?.toLowerCase().includes(q)
    );
  }, [tools, search]);

  // Group tools by display group name (merges PSA + RMM, etc.)
  const grouped = useMemo(() => {
    const map = new Map<string, { categories: Set<ToolCategory>; tools: Tool[] }>();
    for (const tool of filtered) {
      const groupName = CATEGORY_DISPLAY_GROUPS[tool.category] ?? "Other";
      const group = map.get(groupName) ?? { categories: new Set(), tools: [] };
      group.categories.add(tool.category);
      group.tools.push(tool);
      map.set(groupName, group);
    }
    return map;
  }, [filtered]);

  function handleDragStart(e: React.DragEvent, tool: Tool) {
    e.dataTransfer.setData("application/x-tool-id", tool.id);
    e.dataTransfer.effectAllowed = "copy";
  }

  // Check if a tool's category has an overlap with existing stack
  function hasOverlapWithStack(tool: Tool): boolean {
    if (stackToolIds.has(tool.id)) return false; // already in stack, not an overlap warning
    return stackCategorySet.has(tool.category);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Tool Library
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-background/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {grouped.size === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            {tools.length === 0
              ? "No tools added yet. Add tools in Tools & Costs first."
              : "No tools match your search."}
          </p>
        )}

        {Array.from(grouped.entries()).map(([groupName, group]) => {
          // Use the first category's colors for the group dot
          const firstCat = Array.from(group.categories)[0];
          const colors = CATEGORY_COLORS[firstCat];
          return (
            <div key={groupName}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`h-2 w-2 rounded-full ${colors.dot}`} />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {groupName}
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  ({group.tools.length})
                </span>
              </div>
              <div className="space-y-1">
                {group.tools.map((tool) => {
                  const inStack = stackToolIds.has(tool.id);
                  const overlapWarning = hasOverlapWithStack(tool);
                  const toolColors = CATEGORY_COLORS[tool.category];
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      draggable={!inStack}
                      onDragStart={(e) => handleDragStart(e, tool)}
                      onClick={() => !inStack && onAddTool(tool)}
                      disabled={inStack}
                      className={`w-full text-left rounded-lg border px-2.5 py-1.5 transition-colors text-xs ${
                        inStack
                          ? "opacity-40 cursor-default border-border bg-muted/30"
                          : `cursor-grab active:cursor-grabbing hover:border-primary/40 ${toolColors.border} ${toolColors.bg}`
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-foreground truncate flex-1">
                          {tool.name}
                        </span>
                        {overlapWarning && (
                          <span title={`You already have a ${getOverlapGroupForCategory(tool.category) ?? tool.category} tool in your stack`}>
                            <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {tool.vendor}
                        {inStack && " · in stack"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Global Library crosslink */}
      <div className="px-3 pb-3 flex-shrink-0 border-t border-border/50 pt-2">
        <Link
          href="/stack-catalog"
          className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground hover:border-primary/40 transition-colors"
        >
          <Globe className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <span className="flex-1">
            Need more tools?{" "}
            <span className="text-primary font-medium">Browse Global Library</span>
          </span>
          <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}
