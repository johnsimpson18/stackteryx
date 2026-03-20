"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
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
  const [serviceName, setServiceName] = useState("");
  const [nameError, setNameError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

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

    if (!serviceName.trim()) {
      setNameError("Give your service a name before saving");
      nameInputRef.current?.focus();
      return;
    }
    setNameError("");

    const name = serviceName.trim();
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
  }, [stackTools, stackAddons, defaultSeatCount, suggestedOutcomeIds, existingServicesCount, router, serviceName]);

  const [mobileServiceName, setMobileServiceName] = useState("");
  const [mobileSelectedIds, setMobileSelectedIds] = useState<Set<string>>(new Set());

  const toggleMobileTool = useCallback((toolId: string) => {
    setMobileSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  }, []);

  const handleMobileSave = useCallback(async () => {
    if (mobileSelectedIds.size === 0 || !mobileServiceName.trim()) return;
    setSaving(true);
    try {
      const selectedTools = tools.filter((t) => mobileSelectedIds.has(t.id));
      const outcomeIds: string[] = [];
      for (const tool of selectedTools) {
        const ids = TOOL_CATEGORY_TO_OUTCOMES[tool.category];
        if (ids) ids.forEach((id) => { if (!outcomeIds.includes(id)) outcomeIds.push(id); });
      }
      const result = await saveStackAsService({
        serviceName: mobileServiceName.trim(),
        toolIds: Array.from(mobileSelectedIds),
        seatCount: defaultSeatCount,
        suggestedOutcomeIds: outcomeIds,
        addonServices: [],
      });
      if (!result.success) {
        if (result.error === "LIMIT_REACHED") {
          toast.error("You've reached your plan's service limit. Upgrade to create more.");
        } else {
          toast.error(result.error);
        }
        return;
      }
      toast.success("Service created!");
      router.push(`/services/${result.data.bundleId}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [mobileSelectedIds, mobileServiceName, tools, defaultSeatCount, router]);

  return (
    <>
      {/* Mobile flow — simplified checklist */}
      <div className="flex md:hidden flex-col px-4 pb-6">
        {tools.length === 0 ? (
          <div className="text-center py-16">
            <Monitor className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              No tools in your catalog yet
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Add your tools first, then come back to build a service.
            </p>
            <Button asChild>
              <Link href="/stack-catalog">Add Tools &rarr;</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              Select the tools to include in this service.
              Full visual builder available on desktop.
            </p>

            <div className="space-y-2 mb-4">
              {tools.map((tool) => {
                const selected = mobileSelectedIds.has(tool.id);
                const colors = CATEGORY_COLORS[tool.category];
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleMobileTool(tool.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
                      selected
                        ? "border-primary/60 bg-primary/5"
                        : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded flex items-center justify-center shrink-0 ${
                        selected ? "bg-primary" : "border border-border"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${colors.dot}`} />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground block truncate">
                        {tool.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tool.vendor} &middot; {CATEGORY_LABELS[tool.category]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <Input
              placeholder="Service name (e.g. Managed Security Pro)"
              value={mobileServiceName}
              onChange={(e) => setMobileServiceName(e.target.value)}
              className="mb-3"
            />

            <Button
              onClick={handleMobileSave}
              disabled={saving || mobileSelectedIds.size === 0 || !mobileServiceName.trim()}
              className="w-full"
            >
              {saving ? "Saving..." : `Save Service (${mobileSelectedIds.size} tools)`}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground mt-3">
              For full visual design with live compliance scoring, open on desktop.
            </p>
          </>
        )}
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
            serviceName={serviceName}
            onServiceNameChange={(name) => { setServiceName(name); setNameError(""); }}
            nameError={nameError}
            nameInputRef={nameInputRef}
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
