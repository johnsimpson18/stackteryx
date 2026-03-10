"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Check } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatting";
import type { Tool } from "@/lib/types";

export interface SelectedTool {
  tool_id: string;
  quantity_multiplier: number;
}

interface ToolSelectorProps {
  tools: Tool[];
  selected: SelectedTool[];
  onChange: (selected: SelectedTool[]) => void;
}

export function ToolSelector({ tools, selected, onChange }: ToolSelectorProps) {
  const [search, setSearch] = useState("");

  const selectedMap = new Map(selected.map((s) => [s.tool_id, s]));

  const filtered = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.vendor.toLowerCase().includes(search.toLowerCase())
  );

  function toggleTool(toolId: string) {
    if (selectedMap.has(toolId)) {
      onChange(selected.filter((s) => s.tool_id !== toolId));
    } else {
      onChange([...selected, { tool_id: toolId, quantity_multiplier: 1.0 }]);
    }
  }

  function updateMultiplier(toolId: string, multiplier: number) {
    onChange(
      selected.map((s) =>
        s.tool_id === toolId ? { ...s, quantity_multiplier: multiplier } : s
      )
    );
  }

  function displayCost(tool: Tool): string {
    switch (tool.pricing_model) {
      case "per_seat":
        return `${formatCurrency(Number(tool.per_seat_cost))}/endpoint`;
      case "per_user":
        return `${formatCurrency(Number(tool.per_user_cost))}/user`;
      case "per_org":
        return `${formatCurrency(Number(tool.per_org_cost))}/org`;
      case "flat_monthly":
        return `${formatCurrency(Number(tool.flat_monthly_cost))}/mo`;
      case "annual_flat":
        return `${formatCurrency(Number(tool.annual_flat_cost))}/yr`;
      case "tiered":
        return "Tiered";
      default:
        return "—";
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {selected.length} tool{selected.length !== 1 ? "s" : ""} selected
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {filtered.map((tool) => {
          const isSelected = selectedMap.has(tool.id);
          const sel = selectedMap.get(tool.id);

          return (
            <div
              key={tool.id}
              className={`rounded-md border p-3 cursor-pointer transition-colors ${
                isSelected
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-border/80"
              }`}
              onClick={() => toggleTool(tool.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-border"
                    }`}
                  >
                    {isSelected && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tool.vendor}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {CATEGORY_LABELS[tool.category]}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">
                    {displayCost(tool)}
                  </span>
                </div>
              </div>
              {isSelected && sel && (
                <div
                  className="mt-2 flex items-center gap-2 pl-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Label className="text-xs text-muted-foreground shrink-0">
                    Qty multiplier:
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={sel.quantity_multiplier}
                    onChange={(e) =>
                      updateMultiplier(
                        tool.id,
                        Math.max(0.1, parseFloat(e.target.value) || 1)
                      )
                    }
                    className="h-7 w-20 text-xs"
                  />
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tools match your search
          </p>
        )}
      </div>
    </div>
  );
}
