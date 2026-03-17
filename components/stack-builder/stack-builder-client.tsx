"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Monitor } from "lucide-react";
import { ToolLibraryPanel } from "./tool-library-panel";
import { StackCanvas } from "./stack-canvas";
import { IntelligencePanel } from "./intelligence-panel";
import { TOOL_CATEGORY_TO_OUTCOMES } from "@/lib/compliance-tool-mapping";
import { detectOverlap } from "@/lib/vendor-overlap-mapping";
import { saveStackAsService } from "@/actions/stack-builder";
import type { AddonServiceOption } from "@/lib/addon-services-library";
import type { Tool } from "@/lib/types";

// ── Overlap warning type (shared with canvas) ───────────────────────────────

export interface OverlapWarning {
  id: string;
  incomingToolId: string;
  previousToolId: string;
  groupName: string;
  description: string;
}

interface StackBuilderClientProps {
  tools: Tool[];
  defaultSeatCount: number;
  existingServicesCount: number;
}

export function StackBuilderClient({
  tools,
  defaultSeatCount,
  existingServicesCount,
}: StackBuilderClientProps) {
  const router = useRouter();
  const [stackTools, setStackTools] = useState<Tool[]>([]);
  const [stackAddons, setStackAddons] = useState<AddonServiceOption[]>([]);
  const [overlapWarnings, setOverlapWarnings] = useState<OverlapWarning[]>([]);
  const [saving, setSaving] = useState(false);

  const stackToolIds = useMemo(
    () => new Set(stackTools.map((t) => t.id)),
    [stackTools]
  );

  const stackCategories = useMemo(
    () => stackTools.map((t) => t.category),
    [stackTools]
  );

  // Suggested outcome IDs derived from stack categories + addon outcomes
  const suggestedOutcomeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tool of stackTools) {
      const outcomeIds = TOOL_CATEGORY_TO_OUTCOMES[tool.category];
      if (outcomeIds) outcomeIds.forEach((id) => ids.add(id));
    }
    for (const addon of stackAddons) {
      for (const id of addon.outcomeIds) ids.add(id);
    }
    return Array.from(ids);
  }, [stackTools, stackAddons]);

  // Unsaved changes guard
  useEffect(() => {
    if (stackTools.length === 0 && stackAddons.length === 0) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [stackTools.length, stackAddons.length]);

  // ── Central add-tool handler with overlap detection ───────────────────────
  const handleAddTool = useCallback(
    (tool: Tool) => {
      if (stackToolIds.has(tool.id)) return;

      // Check for category overlap with existing stack
      const existingCategories = stackTools.map((t) => t.category);
      const overlap = detectOverlap(tool.category, existingCategories);

      if (overlap) {
        const previousTool = stackTools.find((t) =>
          overlap.overlappingCategories.includes(t.category)
        );
        if (previousTool) {
          setOverlapWarnings((prev) => [
            ...prev,
            {
              id: `${tool.id}-${previousTool.id}`,
              incomingToolId: tool.id,
              previousToolId: previousTool.id,
              groupName: overlap.groupName,
              description: overlap.description,
            },
          ]);
        }
      }

      setStackTools((prev) => [...prev, tool]);
    },
    [stackToolIds, stackTools]
  );

  const handleRemoveTool = useCallback((toolId: string) => {
    setStackTools((prev) => prev.filter((t) => t.id !== toolId));
    // Clean up any overlap warnings referencing the removed tool
    setOverlapWarnings((prev) =>
      prev.filter(
        (w) => w.incomingToolId !== toolId && w.previousToolId !== toolId
      )
    );
  }, []);

  const handleDismissWarning = useCallback((warningId: string) => {
    setOverlapWarnings((prev) => prev.filter((w) => w.id !== warningId));
  }, []);

  const handleRemovePrevious = useCallback(
    (warning: OverlapWarning) => {
      handleRemoveTool(warning.previousToolId);
    },
    [handleRemoveTool]
  );

  const handleAddAddon = useCallback((addon: AddonServiceOption) => {
    setStackAddons((prev) => {
      if (prev.some((a) => a.id === addon.id)) return prev;
      return [...prev, addon];
    });
  }, []);

  const handleRemoveAddon = useCallback((addonId: string) => {
    setStackAddons((prev) => prev.filter((a) => a.id !== addonId));
  }, []);

  const handleClear = useCallback(() => {
    setStackTools([]);
    setStackAddons([]);
    setOverlapWarnings([]);
  }, []);

  const handleSave = useCallback(async () => {
    if (stackTools.length === 0) return;

    const name = `Service from Stack Builder`;
    setSaving(true);

    try {
      const result = await saveStackAsService({
        serviceName: name,
        toolIds: stackTools.map((t) => t.id),
        seatCount: defaultSeatCount,
        suggestedOutcomeIds,
        addonServices: stackAddons.map((a) => ({
          addonId: a.id,
          name: a.name,
          description: a.description,
          category: a.category,
          monthlyPrice: a.typicalMonthlyPrice,
        })),
      });

      if (!result.success) {
        if (result.error === "LIMIT_REACHED") {
          toast.error("You've reached your plan's service limit. Upgrade to create more.");
        } else {
          toast.error(result.error);
        }
        return;
      }

      toast.success("Service created from your stack!", {
        description:
          existingServicesCount >= 1
            ? "You have multiple services now — consider packaging them for clients."
            : undefined,
      });

      router.push(`/services/${result.data.bundleId}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [stackTools, stackAddons, defaultSeatCount, suggestedOutcomeIds, existingServicesCount, router]);

  return (
    <>
      {/* Mobile fallback */}
      <div className="flex md:hidden items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <Monitor className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            Stack Builder is optimized for desktop
          </p>
          <p className="text-xs text-muted-foreground">
            Use a wider screen to access the drag-and-drop builder.
          </p>
        </div>
      </div>

      {/* Desktop three-panel layout */}
      <div className="hidden md:grid grid-cols-[240px_1fr_260px] gap-0 border rounded-xl overflow-hidden bg-card" style={{ height: "calc(100vh - 140px)" }}>
        {/* Left: Tool Library */}
        <div className="border-r border-border overflow-hidden">
          <ToolLibraryPanel
            tools={tools}
            stackToolIds={stackToolIds}
            stackCategories={stackCategories}
            onAddTool={handleAddTool}
          />
        </div>

        {/* Center: Stack Canvas */}
        <div className="overflow-hidden">
          <StackCanvas
            stackTools={stackTools}
            stackAddons={stackAddons}
            allTools={tools}
            overlapWarnings={overlapWarnings}
            onRemoveTool={handleRemoveTool}
            onClear={handleClear}
            onSave={handleSave}
            onAddTool={handleAddTool}
            onAddAddon={handleAddAddon}
            onRemoveAddon={handleRemoveAddon}
            onDismissWarning={handleDismissWarning}
            onRemovePrevious={handleRemovePrevious}
            saving={saving}
          />
        </div>

        {/* Right: Intelligence */}
        <div className="border-l border-border overflow-hidden">
          <IntelligencePanel
            stackTools={stackTools}
            stackAddons={stackAddons}
            suggestedOutcomeIds={suggestedOutcomeIds}
          />
        </div>
      </div>
    </>
  );
}
