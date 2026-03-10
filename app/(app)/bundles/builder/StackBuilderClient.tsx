"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Layers, Package, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ToolLibrary } from "@/components/stack-builder/ToolLibrary";
import { StackCanvas } from "@/components/stack-builder/StackCanvas";
import { BundleSummary } from "@/components/stack-builder/BundleSummary";
import { ToolInspectDialog } from "@/components/stack-builder/ToolInspectDialog";
import { StackBuilderChat } from "@/components/stack-builder/StackBuilderChat";
import { computePricing } from "@/lib/stack-builder/calc";
import { STACK_CATEGORIES, STACK_TOOLS, STACK_PRESETS } from "@/lib/stack-builder/seed";
import type { BundleState, StackTool } from "@/lib/stack-builder/types";

type LeftPanelMode = "browse" | "chat";

const INITIAL_STATE: BundleState = {
  name: "",
  pricingModel: "per-seat",
  quantity: 25,
  targetMargin: 0.35,
  selectedByCategory: Object.fromEntries(STACK_CATEGORIES.map((c) => [c.id, []])),
};

export function StackBuilderClient() {
  const [bundleState, setBundleState] = useState<BundleState>(INITIAL_STATE);
  const [inspectTool, setInspectTool] = useState<StackTool | null>(null);
  const [leftPanel, setLeftPanel] = useState<LeftPanelMode>("chat"); // default to AI chat

  const pricing = useMemo(
    () => computePricing(bundleState, STACK_CATEGORIES),
    [bundleState]
  );

  const totalTools = useMemo(
    () => Object.values(bundleState.selectedByCategory).flat().length,
    [bundleState.selectedByCategory]
  );

  /* ── Patch helper ── */
  const updateState = useCallback((patch: Partial<BundleState>) => {
    setBundleState((prev) => ({ ...prev, ...patch }));
  }, []);

  /* ── Add a tool to its category ── */
  const handleAddTool = useCallback((tool: StackTool) => {
    setBundleState((prev) => {
      const existing = prev.selectedByCategory[tool.categoryId] ?? [];
      if (existing.some((t) => t.id === tool.id)) return prev; // already added
      return {
        ...prev,
        selectedByCategory: {
          ...prev.selectedByCategory,
          [tool.categoryId]: [...existing, tool],
        },
      };
    });
  }, []);

  /* ── Remove a tool from its category ── */
  const handleRemoveTool = useCallback((tool: StackTool) => {
    setBundleState((prev) => ({
      ...prev,
      selectedByCategory: {
        ...prev.selectedByCategory,
        [tool.categoryId]: (prev.selectedByCategory[tool.categoryId] ?? []).filter(
          (t) => t.id !== tool.id
        ),
      },
    }));
  }, []);

  /* ── Remove a tool by categoryId + toolId (used by StackSlots) ── */
  const handleRemoveFromSlot = useCallback((categoryId: string, toolId: string) => {
    setBundleState((prev) => ({
      ...prev,
      selectedByCategory: {
        ...prev.selectedByCategory,
        [categoryId]: (prev.selectedByCategory[categoryId] ?? []).filter(
          (t) => t.id !== toolId
        ),
      },
    }));
  }, []);

  /* ── Clear entire stack ── */
  const handleClearStack = useCallback(() => {
    setBundleState((prev) => ({
      ...prev,
      selectedByCategory: Object.fromEntries(STACK_CATEGORIES.map((c) => [c.id, []])),
    }));
    toast("Stack cleared", { description: "Ready for a fresh build" });
  }, []);

  /* ── Set bundle name (from AI) ── */
  const handleSetBundleName = useCallback((name: string) => {
    setBundleState((prev) => ({ ...prev, name }));
  }, []);

  /* ── Load a preset — replaces existing selection ── */
  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = STACK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const freshByCategory = Object.fromEntries(STACK_CATEGORIES.map((c) => [c.id, []])) as Record<
      string,
      StackTool[]
    >;

    for (const toolId of preset.toolIds) {
      const tool = STACK_TOOLS.find((t) => t.id === toolId);
      if (!tool) continue;
      freshByCategory[tool.categoryId] = [...(freshByCategory[tool.categoryId] ?? []), tool];
    }

    setBundleState((prev) => ({
      ...prev,
      selectedByCategory: freshByCategory,
      name: prev.name || preset.label,
    }));

    toast.success(`"${preset.label}" preset loaded`, {
      description: `${preset.toolIds.length} tools added — adjust as needed`,
    });
  }, []);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-48px)] overflow-hidden -m-6">
        {/* ── Top bar ── */}
        <div className="relative flex items-center gap-3 px-5 py-3 border-b border-border bg-background/80 backdrop-blur-md flex-shrink-0">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground h-7 px-2"
          >
            <Link href="/services">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Services
            </Link>
          </Button>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Layers className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Stack Builder</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              BETA
            </span>
          </div>

          {bundleState.name && (
            <span className="ml-2 text-sm text-muted-foreground/60">— {bundleState.name}</span>
          )}

          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground/60">
            <span className="font-mono">
              {totalTools} tool{totalTools !== 1 ? "s" : ""} ·{" "}
              {pricing.categoriesFilled}/{pricing.totalCategories} layers
            </span>
            <span className="hidden sm:inline">Click any tool to add it to your stack</span>
          </div>
        </div>

        {/* ── 2-column layout ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="flex flex-1 overflow-hidden"
        >
          {/* Left: Tabbed Tool Library + AI Chat */}
          <div className="flex-1 border-r border-border overflow-hidden min-w-0 flex flex-col">
            {/* Tab switcher */}
            <div className="flex items-center gap-0 border-b border-border bg-background/60 flex-shrink-0">
              <button
                onClick={() => setLeftPanel("chat")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all border-b-2",
                  leftPanel === "chat"
                    ? "text-primary border-primary bg-primary/5"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Builder
                <span className="ml-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary">
                  NEW
                </span>
              </button>
              <button
                onClick={() => setLeftPanel("browse")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all border-b-2",
                  leftPanel === "browse"
                    ? "text-primary border-primary bg-primary/5"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                )}
              >
                <Package className="h-3.5 w-3.5" />
                Browse Tools
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-hidden">
              {leftPanel === "chat" ? (
                <StackBuilderChat
                  bundleState={bundleState}
                  onAddTool={handleAddTool}
                  onRemoveTool={handleRemoveTool}
                  onClearStack={handleClearStack}
                  onSetBundleName={handleSetBundleName}
                />
              ) : (
                <ToolLibrary
                  bundleState={bundleState}
                  onAdd={handleAddTool}
                  onRemove={handleRemoveTool}
                  onInspect={setInspectTool}
                  onLoadPreset={handleLoadPreset}
                />
              )}
            </div>
          </div>

          {/* Right: Stack visualization + bundle summary as one scroll */}
          <div className="w-[400px] flex-shrink-0 overflow-y-auto">
            {/* Stack Tower + Slots */}
            <StackCanvas
              bundleState={bundleState}
              pricing={pricing}
              onRemoveTool={handleRemoveFromSlot}
            />

            {/* Bundle settings + metrics + save */}
            <div className="border-t border-border">
              <BundleSummary
                bundleState={bundleState}
                pricing={pricing}
                onChange={updateState}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Inspect dialog */}
      <ToolInspectDialog tool={inspectTool} onClose={() => setInspectTool(null)} />
    </>
  );
}
