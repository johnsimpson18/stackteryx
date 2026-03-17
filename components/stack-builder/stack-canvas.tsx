"use client";

import { useState, useRef, useCallback } from "react";
import {
  X,
  Trash2,
  Save,
  Search,
  Plus,
  AlertTriangle,
  Brain,
  Shield,
  CheckSquare,
  Headphones,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import {
  ADDON_SERVICE_OPTIONS,
  ADDON_CATEGORY_LABELS,
} from "@/lib/addon-services-library";
import type { AddonServiceOption, AddonCategory } from "@/lib/addon-services-library";
import type { OverlapWarning } from "./stack-builder-client";
import type { Tool } from "@/lib/types";

// ── Addon category icons ────────────────────────────────────────────────────

const ADDON_CATEGORY_ICONS: Record<AddonCategory, typeof Brain> = {
  advisory: Brain,
  response: Shield,
  compliance: CheckSquare,
  support: Headphones,
};

const ADDON_CATEGORY_COLORS: Record<
  AddonCategory,
  { bg: string; border: string; text: string }
> = {
  advisory: {
    bg: "bg-indigo-500/10",
    border: "border-l-indigo-500",
    text: "text-indigo-400",
  },
  response: {
    bg: "bg-rose-500/10",
    border: "border-l-rose-500",
    text: "text-rose-400",
  },
  compliance: {
    bg: "bg-emerald-500/10",
    border: "border-l-emerald-500",
    text: "text-emerald-400",
  },
  support: {
    bg: "bg-sky-500/10",
    border: "border-l-sky-500",
    text: "text-sky-400",
  },
};

// ── Props ────────────────────────────────────────────────────────────────────

interface StackCanvasProps {
  stackTools: Tool[];
  stackAddons: AddonServiceOption[];
  allTools: Tool[];
  overlapWarnings: OverlapWarning[];
  onRemoveTool: (toolId: string) => void;
  onClear: () => void;
  onSave: () => void;
  onAddTool: (tool: Tool) => void;
  onAddAddon: (addon: AddonServiceOption) => void;
  onRemoveAddon: (addonId: string) => void;
  onDismissWarning: (warningId: string) => void;
  onRemovePrevious: (warning: OverlapWarning) => void;
  saving: boolean;
}

export function StackCanvas({
  stackTools,
  stackAddons,
  allTools,
  overlapWarnings,
  onRemoveTool,
  onClear,
  onSave,
  onAddTool,
  onAddAddon,
  onRemoveAddon,
  onDismissWarning,
  onRemovePrevious,
  saving,
}: StackCanvasProps) {
  const [dragOver, setDragOver] = useState(false);
  const [inlineSearch, setInlineSearch] = useState("");
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const [showAddonPicker, setShowAddonPicker] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const toolId = e.dataTransfer.getData("application/x-tool-id");
      if (!toolId) return;
      const tool = allTools.find((t) => t.id === toolId);
      if (tool) onAddTool(tool);
    },
    [allTools, onAddTool]
  );

  const stackToolIds = new Set(stackTools.map((t) => t.id));
  const stackAddonIds = new Set(stackAddons.map((a) => a.id));
  const inlineResults = inlineSearch.trim()
    ? allTools
        .filter(
          (t) =>
            !stackToolIds.has(t.id) &&
            (t.name.toLowerCase().includes(inlineSearch.toLowerCase()) ||
              t.vendor.toLowerCase().includes(inlineSearch.toLowerCase()))
        )
        .slice(0, 6)
    : [];

  const availableAddons = ADDON_SERVICE_OPTIONS.filter(
    (a) => !stackAddonIds.has(a.id)
  );

  function openInlineSearch() {
    setShowInlineSearch(true);
    setInlineSearch("");
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function handleInlineAdd(tool: Tool) {
    onAddTool(tool);
    setInlineSearch("");
    setShowInlineSearch(false);
  }

  const hasItems = stackTools.length > 0 || stackAddons.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Your Stack
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {!hasItems
              ? "Drag tools here or click to add"
              : `${stackTools.length} tool${stackTools.length !== 1 ? "s" : ""}${
                  stackAddons.length > 0
                    ? ` + ${stackAddons.length} add-on${stackAddons.length !== 1 ? "s" : ""}`
                    : ""
                }`}
          </p>
        </div>
        {hasItems && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={saving || stackTools.length === 0}
              className="h-7 px-3 text-xs"
            >
              <Save className="h-3 w-3 mr-1" />
              {saving ? "Saving..." : "Save as Service"}
            </Button>
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`flex-1 mx-3 mb-3 rounded-xl border-2 border-dashed transition-colors overflow-y-auto ${
          dragOver
            ? "border-primary/60 bg-primary/5"
            : !hasItems
              ? "border-border/50 bg-muted/10"
              : "border-transparent bg-transparent"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!hasItems && !showInlineSearch ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Drop tools here to build your stack
            </p>
            <p className="text-xs text-muted-foreground/60 mb-3">
              or click a tool in the library, or
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={openInlineSearch}
              className="h-7 px-3 text-xs"
            >
              <Search className="h-3 w-3 mr-1" />
              Search & add
            </Button>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {/* Overlap warnings */}
            {overlapWarnings.map((warning) => (
              <div
                key={warning.id}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">
                        Potential overlap: {warning.groupName}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {warning.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismissWarning(warning.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    aria-label="Dismiss warning"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 ml-5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => onDismissWarning(warning.id)}
                  >
                    Keep both
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-amber-400 hover:text-amber-300"
                    onClick={() => onRemovePrevious(warning)}
                  >
                    Remove previous
                  </Button>
                </div>
              </div>
            ))}

            {/* Tool chips */}
            <div className="flex flex-wrap gap-2">
              {stackTools.map((tool) => {
                const colors = CATEGORY_COLORS[tool.category];
                return (
                  <div
                    key={tool.id}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 ${colors.bg} ${colors.border}`}
                  >
                    <div className={`h-2 w-2 rounded-full shrink-0 ${colors.dot}`} />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-foreground">
                        {tool.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">
                        {CATEGORY_LABELS[tool.category]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveTool(tool.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      aria-label={`Remove ${tool.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Inline add */}
            {!showInlineSearch ? (
              <button
                type="button"
                onClick={openInlineSearch}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
              >
                <Plus className="h-3 w-3" />
                Add another tool
              </button>
            ) : (
              <div className="mt-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search tools to add..."
                    value={inlineSearch}
                    onChange={(e) => setInlineSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setShowInlineSearch(false);
                        setInlineSearch("");
                      }
                    }}
                    className="pl-8 h-7 text-xs bg-background/50"
                  />
                </div>
                {inlineResults.length > 0 && (
                  <div className="mt-1 border rounded-lg bg-card divide-y divide-border">
                    {inlineResults.map((tool) => {
                      const colors = CATEGORY_COLORS[tool.category];
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => handleInlineAdd(tool)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/30 transition-colors flex items-center gap-2"
                        >
                          <div className={`h-2 w-2 rounded-full shrink-0 ${colors.dot}`} />
                          <span className="font-medium text-foreground truncate">
                            {tool.name}
                          </span>
                          <span className="text-muted-foreground text-[10px] ml-auto shrink-0">
                            {tool.vendor}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {inlineSearch.trim() && inlineResults.length === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1 pl-1">
                    No matching tools found.
                  </p>
                )}
              </div>
            )}

            {/* ── Add-On Services Section ─────────────────────────────────── */}
            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Add-On Services
                </span>
              </div>

              {/* Add-on chips */}
              {stackAddons.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {stackAddons.map((addon) => {
                    const addonColors = ADDON_CATEGORY_COLORS[addon.category];
                    const AddonIcon = ADDON_CATEGORY_ICONS[addon.category];
                    return (
                      <div
                        key={addon.id}
                        className={`inline-flex items-center gap-2 rounded-lg border-l-2 border border-border/60 px-3 py-1.5 ${addonColors.bg} ${addonColors.border}`}
                      >
                        <AddonIcon className={`h-3 w-3 ${addonColors.text} shrink-0`} />
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-foreground">
                            {addon.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">
                            ${addon.typicalMonthlyPrice.toLocaleString()}/mo
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveAddon(addon.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          aria-label={`Remove ${addon.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add a service picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddonPicker(!showAddonPicker)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add a service
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${showAddonPicker ? "rotate-180" : ""}`}
                  />
                </button>

                {showAddonPicker && (
                  <div className="mt-1.5 border rounded-lg bg-card divide-y divide-border max-h-52 overflow-y-auto">
                    {availableAddons.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground px-3 py-2">
                        All add-on services are in your stack.
                      </p>
                    ) : (
                      availableAddons.map((addon) => {
                        const addonColors = ADDON_CATEGORY_COLORS[addon.category];
                        const AddonIcon = ADDON_CATEGORY_ICONS[addon.category];
                        return (
                          <button
                            key={addon.id}
                            type="button"
                            onClick={() => {
                              onAddAddon(addon);
                              setShowAddonPicker(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <AddonIcon className={`h-3.5 w-3.5 ${addonColors.text} shrink-0`} />
                              <span className="font-medium text-foreground flex-1 truncate">
                                {addon.name}
                              </span>
                              <span className="text-muted-foreground text-[10px] shrink-0">
                                ${addon.typicalMonthlyPrice.toLocaleString()}/mo
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 ml-5 line-clamp-1">
                              {addon.description}
                            </p>
                            <span className="text-[10px] text-muted-foreground/60 ml-5">
                              {ADDON_CATEGORY_LABELS[addon.category]}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
