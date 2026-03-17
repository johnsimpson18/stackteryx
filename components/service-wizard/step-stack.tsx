"use client";

import { useState, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, Sparkles, Search, Library, Plus, ChevronDown, ChevronUp, AlertTriangle, DollarSign, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { Tool, ToolCategory } from "@/lib/types";
import {
  TOOL_LIBRARY,
  LIBRARY_DOMAINS,
} from "@/lib/data/tool-library";
import type { LibraryDomain, BillingUnit } from "@/lib/data/tool-library";
import { addToolsFromLibraryAction, createToolInlineAction, updateToolCostAction } from "@/actions/tools";
import { PRICING_MODEL_LABELS } from "@/lib/constants";

interface StepStackProps {
  tools: Tool[];
  selectedToolIds: Set<string>;
  onToggle: (id: string) => void;
  onToolsAdded?: (tools: Tool[]) => void;
  onSkipTools?: () => void;
}

function billingLabel(unit: BillingUnit) {
  switch (unit) {
    case "per-user": return "/user/mo";
    case "per-device": return "/device/mo";
    case "flat": return "/mo flat";
  }
}

export function StepStack({ tools, selectedToolIds, onToggle, onToolsAdded, onSkipTools }: StepStackProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [tab, setTab] = useState<"stack" | "library">("stack");
  const [librarySearch, setLibrarySearch] = useState("");
  const [librarySelected, setLibrarySelected] = useState<Set<string>>(new Set());
  const [isAddingFromLibrary, startLibraryTransition] = useTransition();

  // Track tools added from the library during this session
  const [addedTools, setAddedTools] = useState<Tool[]>([]);

  // Zero-cost tool prompt
  const [zeroCostPromptToolId, setZeroCostPromptToolId] = useState<string | null>(null);
  const [zeroCostValue, setZeroCostValue] = useState("");
  const [zeroCostModel, setZeroCostModel] = useState("per_seat");
  const [isSavingZeroCost, startZeroCostTransition] = useTransition();

  // Inline tool creation
  const [inlineOpen, setInlineOpen] = useState(false);
  const [inlineName, setInlineName] = useState("");
  const [inlineVendor, setInlineVendor] = useState("");
  const [inlineDomain, setInlineDomain] = useState<LibraryDomain>("Identity");
  const [inlineCost, setInlineCost] = useState("");
  const [inlineBillingUnit, setInlineBillingUnit] = useState<BillingUnit>("per-user");
  const [isCreatingInline, startInlineTransition] = useTransition();

  // Combined tools = original props + dynamically added
  const allTools = useMemo(() => {
    const existingIds = new Set(tools.map((t) => t.id));
    const merged = [...tools];
    for (const t of addedTools) {
      if (!existingIds.has(t.id)) merged.push(t);
    }
    return merged;
  }, [tools, addedTools]);

  const existingToolNames = useMemo(
    () => new Set(allTools.map((t) => t.name.toLowerCase())),
    [allTools]
  );

  const toolsByCategory = useMemo(() => {
    const grouped = new Map<ToolCategory, Tool[]>();
    for (const tool of allTools) {
      const list = grouped.get(tool.category) || [];
      list.push(tool);
      grouped.set(tool.category, list);
    }
    return grouped;
  }, [allTools]);

  // Library filtered tools
  const filteredLibrary = useMemo(() => {
    if (!librarySearch) return TOOL_LIBRARY;
    const q = librarySearch.toLowerCase();
    return TOOL_LIBRARY.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.vendor.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q)
    );
  }, [librarySearch]);

  const libraryGrouped = useMemo(() => {
    const map = new Map<LibraryDomain, typeof filteredLibrary>();
    for (const domain of LIBRARY_DOMAINS) {
      const domainTools = filteredLibrary.filter((t) => t.domain === domain);
      if (domainTools.length > 0) map.set(domain, domainTools);
    }
    return map;
  }, [filteredLibrary]);

  async function handleRecommendStack() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/recommend-stack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          available_tool_ids: allTools.map((t) => t.id),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.recommended_tool_ids && Array.isArray(data.recommended_tool_ids)) {
          for (const id of data.recommended_tool_ids) {
            if (!selectedToolIds.has(id)) {
              onToggle(id);
            }
          }
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setAiLoading(false);
    }
  }

  function toggleLibraryItem(id: string) {
    setLibrarySelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isToolZeroCost(tool: Tool): boolean {
    return (
      Number(tool.per_seat_cost) === 0 &&
      Number(tool.per_user_cost ?? 0) === 0 &&
      Number(tool.per_org_cost ?? 0) === 0 &&
      Number(tool.flat_monthly_cost) === 0 &&
      Number(tool.annual_flat_cost ?? 0) === 0
    );
  }

  function handleToolToggle(toolId: string) {
    // If selecting (not deselecting), check if zero-cost
    if (!selectedToolIds.has(toolId)) {
      const tool = allTools.find((t) => t.id === toolId);
      if (tool && isToolZeroCost(tool)) {
        // Look up typical cost from TOOL_LIBRARY by name match
        const libraryMatch = TOOL_LIBRARY.find(
          (lt) => lt.name.toLowerCase() === tool.name.toLowerCase()
        );
        if (libraryMatch) {
          setZeroCostValue(String(libraryMatch.typical_cost_per_user));
        } else {
          setZeroCostValue("");
        }
        setZeroCostModel(tool.pricing_model);
        setZeroCostPromptToolId(toolId);
        return;
      }
    }
    onToggle(toolId);
  }

  function handleAddWithCost() {
    if (!zeroCostPromptToolId) return;
    const costFieldMap: Record<string, string> = {
      per_seat: "per_seat_cost",
      per_user: "per_user_cost",
      per_org: "per_org_cost",
      flat_monthly: "flat_monthly_cost",
      annual_flat: "annual_flat_cost",
    };
    const field = costFieldMap[zeroCostModel] ?? "per_seat_cost";
    const value = parseFloat(zeroCostValue) || 0;

    startZeroCostTransition(async () => {
      const result = await updateToolCostAction(zeroCostPromptToolId!, field, value);
      if (result.success) {
        // Update tool in local state
        setAddedTools((prev) =>
          prev.map((t) =>
            t.id === zeroCostPromptToolId ? { ...t, [field]: value } : t
          )
        );
        onToggle(zeroCostPromptToolId!);
        toast.success("Cost set and tool selected");
      } else {
        toast.error(result.error);
      }
      setZeroCostPromptToolId(null);
    });
  }

  function handleAddAnyway() {
    if (!zeroCostPromptToolId) return;
    onToggle(zeroCostPromptToolId);
    setZeroCostPromptToolId(null);
  }

  function handleCreateInline() {
    if (!inlineName.trim() || !inlineVendor.trim()) return;
    startInlineTransition(async () => {
      const result = await createToolInlineAction({
        name: inlineName.trim(),
        vendor: inlineVendor.trim(),
        domain: inlineDomain,
        cost: parseFloat(inlineCost) || 0,
        billing_unit: inlineBillingUnit,
      });
      if (result.success) {
        const tool = result.data;
        setAddedTools((prev) => [...prev, tool]);
        if (!selectedToolIds.has(tool.id)) {
          onToggle(tool.id);
        }
        onToolsAdded?.([tool]);
        toast.success(`${tool.name} added and selected`);
        setInlineName("");
        setInlineVendor("");
        setInlineCost("");
        setInlineOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAddFromLibrary() {
    const ids = Array.from(librarySelected);
    startLibraryTransition(async () => {
      const result = await addToolsFromLibraryAction(ids);
      if (result.success) {
        const newTools = result.data.tools;
        setAddedTools((prev) => [...prev, ...newTools]);
        // Auto-select the newly added tools
        for (const tool of newTools) {
          if (!selectedToolIds.has(tool.id)) {
            onToggle(tool.id);
          }
        }
        onToolsAdded?.(newTools);
        toast.success(
          `${result.data.count} tool${result.data.count !== 1 ? "s" : ""} added to your stack`
        );
        setLibrarySelected(new Set());
        setTab("stack");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Select your tools</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Choose the tools to include in this service. Selected:{" "}
            <span className="text-foreground font-medium">{selectedToolIds.size}</span>
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRecommendStack}
          disabled={aiLoading}
          className="h-8 text-xs gap-1.5 shrink-0"
        >
          {aiLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Recommend Stack
        </Button>
      </div>

      {/* Tab toggle */}
      <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 w-fit">
        <Button
          variant={tab === "stack" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => setTab("stack")}
        >
          My Stack
        </Button>
        <Button
          variant={tab === "library" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs gap-1.5"
          onClick={() => setTab("library")}
        >
          <Library className="h-3 w-3" />
          Tool Library
        </Button>
      </div>

      {/* My Stack tab */}
      {tab === "stack" && (
        <div className="space-y-5">
          {allTools.length === 0 ? (
            <div className="rounded-lg border border-border bg-card/60 p-8 space-y-4">
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  You haven&apos;t added any tools yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-md mx-auto">
                  Tools are the vendor products that power your service (e.g. CrowdStrike
                  for endpoint protection, Datto for backup).
                </p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1.5"
                >
                  <a href="/stack-catalog" target="_blank" rel="noopener noreferrer">
                    Add your tools first
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </Button>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px w-8 bg-border" />
                  or
                  <span className="h-px w-8 bg-border" />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInlineOpen(true)}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add a tool right now
                  </Button>
                  {onSkipTools && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onSkipTools}
                      className="text-muted-foreground"
                    >
                      Continue without tools
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            Array.from(toolsByCategory.entries()).map(([category, categoryTools]) => {
              const colors = CATEGORY_COLORS[category];
              const selectedInCat = categoryTools.filter((t) =>
                selectedToolIds.has(t.id)
              ).length;

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", colors.dot)} />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {CATEGORY_LABELS[category]}
                    </h3>
                    {selectedInCat > 0 && (
                      <span
                        className={cn(
                          "ml-auto text-xs font-medium px-1.5 py-0.5 rounded",
                          colors.bg,
                          colors.text
                        )}
                      >
                        {selectedInCat} selected
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categoryTools.map((tool) => {
                      const isSelected = selectedToolIds.has(tool.id);
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => handleToolToggle(tool.id)}
                          className={cn(
                            "relative text-left rounded-lg border px-3 py-2.5 transition-all duration-150",
                            "hover:border-primary/40 hover:bg-primary/5",
                            isSelected
                              ? "border-primary/60 bg-primary/8 shadow-[0_0_0_1px_oklch(0.65_0.18_250/0.3)]"
                              : "border-border bg-card/60"
                          )}
                        >
                          {isSelected && (
                            <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                            </span>
                          )}
                          <p className="text-sm font-medium text-foreground pr-5 leading-tight">
                            {tool.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tool.vendor}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tool Library tab */}
      {tab === "library" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tools, vendors, or domains..."
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Library tools by domain */}
          <div className="space-y-4">
            {Array.from(libraryGrouped.entries()).map(([domain, domainTools]) => (
              <div key={domain}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {domain}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {domainTools.map((tool) => {
                    const alreadyInStack = existingToolNames.has(tool.name.toLowerCase());
                    const isSelected = librarySelected.has(tool.id);

                    return (
                      <button
                        key={tool.id}
                        type="button"
                        disabled={alreadyInStack}
                        onClick={() => toggleLibraryItem(tool.id)}
                        className={cn(
                          "relative text-left rounded-lg border p-3 transition-all",
                          alreadyInStack
                            ? "border-border/40 bg-card/30 opacity-50 cursor-not-allowed"
                            : isSelected
                              ? "border-primary bg-primary/5 cursor-pointer"
                              : "border-border bg-card/60 hover:border-primary/40 cursor-pointer"
                        )}
                      >
                        {isSelected && !alreadyInStack && (
                          <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                          </span>
                        )}
                        <div className="pr-6">
                          <p className="text-sm font-medium text-foreground">{tool.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tool.vendor}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tool.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            ~${tool.typical_cost_per_user}{billingLabel(tool.billing_unit)}
                          </span>
                          {alreadyInStack && (
                            <Badge variant="secondary" className="text-[10px] ml-auto">
                              In your stack
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {libraryGrouped.size === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tools match your search.
              </p>
            )}
          </div>

          {/* Add selected button */}
          {librarySelected.size > 0 && (
            <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border pt-3 pb-1 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {librarySelected.size} tool{librarySelected.size !== 1 ? "s" : ""} selected
              </p>
              <Button
                onClick={handleAddFromLibrary}
                disabled={isAddingFromLibrary}
                size="sm"
              >
                {isAddingFromLibrary ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Adding...
                  </>
                ) : (
                  "Add to Stack & Select"
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Zero-cost tool prompt */}
      {zeroCostPromptToolId && (() => {
        const promptTool = allTools.find((t) => t.id === zeroCostPromptToolId);
        return (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium text-foreground">
                {promptTool?.name ?? "This tool"} has no cost configured
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Set a cost now for accurate margin calculations, or add it at $0.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pricing Model</Label>
                <Select value={zeroCostModel} onValueChange={setZeroCostModel}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_seat">{PRICING_MODEL_LABELS.per_seat}</SelectItem>
                    <SelectItem value="per_user">{PRICING_MODEL_LABELS.per_user}</SelectItem>
                    <SelectItem value="flat_monthly">{PRICING_MODEL_LABELS.flat_monthly}</SelectItem>
                    <SelectItem value="per_org">{PRICING_MODEL_LABELS.per_org}</SelectItem>
                    <SelectItem value="annual_flat">{PRICING_MODEL_LABELS.annual_flat}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cost ($)</Label>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={zeroCostValue}
                    onChange={(e) => setZeroCostValue(e.target.value)}
                    className="h-8 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleAddWithCost}
                disabled={isSavingZeroCost}
                className="h-7 text-xs"
              >
                {isSavingZeroCost ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <DollarSign className="h-3 w-3 mr-1" />
                )}
                Add with this cost
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddAnyway}
                className="h-7 text-xs text-muted-foreground"
              >
                Add anyway at $0
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZeroCostPromptToolId(null)}
                className="h-7 text-xs text-muted-foreground ml-auto"
              >
                Cancel
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Inline tool creation */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setInlineOpen(!inlineOpen)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {inlineOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <Plus className="h-3.5 w-3.5" />
          Can&apos;t find it? Add a tool
        </button>

        {inlineOpen && (
          <div className="mt-3 rounded-lg border border-border bg-card/60 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inline-name" className="text-xs">Tool Name</Label>
                <Input
                  id="inline-name"
                  placeholder="e.g. Huntress"
                  value={inlineName}
                  onChange={(e) => setInlineName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inline-vendor" className="text-xs">Vendor</Label>
                <Input
                  id="inline-vendor"
                  placeholder="e.g. Huntress Labs"
                  value={inlineVendor}
                  onChange={(e) => setInlineVendor(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Domain</Label>
                <Select value={inlineDomain} onValueChange={(v) => setInlineDomain(v as LibraryDomain)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIBRARY_DOMAINS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inline-cost" className="text-xs">Cost ($)</Label>
                  <Input
                    id="inline-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={inlineCost}
                    onChange={(e) => setInlineCost(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Billing</Label>
                  <Select value={inlineBillingUnit} onValueChange={(v) => setInlineBillingUnit(v as BillingUnit)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per-user">Per User</SelectItem>
                      <SelectItem value="per-device">Per Device</SelectItem>
                      <SelectItem value="flat">Flat Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleCreateInline}
                disabled={isCreatingInline || !inlineName.trim() || !inlineVendor.trim()}
              >
                {isCreatingInline ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add & Select
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
