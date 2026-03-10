"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BUNDLE_TYPE_LABELS, BUNDLE_TYPES } from "@/lib/constants";
import { Loader2, Plus, Sparkles, X, Check } from "lucide-react";
import type { BundleType } from "@/lib/types";
import {
  getTemplatesForOutcome,
  OUTCOME_CATEGORY_LABELS,
} from "@/lib/data/capability-templates";

// ── Types ────────────────────────────────────────────────────────────────────

interface ServiceCapability {
  name: string;
  description: string;
}

interface SelectedCapability {
  name: string;
  description: string;
  source: "template" | "ai" | "custom";
  key: string;
}

interface StepServiceProps {
  capabilities: ServiceCapability[];
  bundleType: BundleType;
  outcomeType: string;
  outcomeName: string;
  outcomeStatement: string;
  onCapabilitiesChange: (v: ServiceCapability[]) => void;
  onBundleTypeChange: (v: BundleType) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let keyCounter = 0;
function nextKey(prefix: string) {
  return `${prefix}-${++keyCounter}`;
}

function capabilityKey(name: string, source: string) {
  return `${source}::${name.toLowerCase().trim()}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function StepService({
  capabilities,
  bundleType,
  outcomeType,
  outcomeName,
  outcomeStatement,
  onCapabilitiesChange,
  onBundleTypeChange,
}: StepServiceProps) {
  // Selected capabilities — internal state synced to parent
  const [selected, setSelected] = useState<SelectedCapability[]>(() =>
    capabilities.map((c) => ({
      ...c,
      source: "template" as const,
      key: nextKey("init"),
    }))
  );

  // AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState<ServiceCapability[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Custom entry
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  // Inline editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Template data
  const templateGroups = getTemplatesForOutcome(outcomeType);

  // Sync to parent whenever selected changes
  const syncToParent = useCallback(
    (caps: SelectedCapability[]) => {
      onCapabilitiesChange(
        caps.map(({ name, description }) => ({ name, description }))
      );
    },
    [onCapabilitiesChange]
  );

  // Check if a template is currently selected
  function isTemplateSelected(name: string): boolean {
    return selected.some(
      (s) => s.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  }

  // Check if an AI suggestion is currently selected
  function isAiSelected(name: string): boolean {
    return selected.some(
      (s) => s.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  }

  // Toggle a template card
  function toggleTemplate(cap: ServiceCapability) {
    const match = selected.findIndex(
      (s) => s.name.toLowerCase().trim() === cap.name.toLowerCase().trim()
    );
    let next: SelectedCapability[];
    if (match >= 0) {
      next = selected.filter((_, i) => i !== match);
    } else {
      next = [
        ...selected,
        {
          name: cap.name,
          description: cap.description,
          source: "template",
          key: capabilityKey(cap.name, "template"),
        },
      ];
    }
    setSelected(next);
    syncToParent(next);
  }

  // Toggle an AI suggestion card
  function toggleAiSuggestion(cap: ServiceCapability) {
    const match = selected.findIndex(
      (s) => s.name.toLowerCase().trim() === cap.name.toLowerCase().trim()
    );
    let next: SelectedCapability[];
    if (match >= 0) {
      next = selected.filter((_, i) => i !== match);
    } else {
      next = [
        ...selected,
        {
          name: cap.name,
          description: cap.description,
          source: "ai",
          key: capabilityKey(cap.name, "ai"),
        },
      ];
    }
    setSelected(next);
    syncToParent(next);
  }

  // Add custom capability
  function addCustom() {
    const trimmedName = customName.trim();
    if (!trimmedName) return;
    const next: SelectedCapability[] = [
      ...selected,
      {
        name: trimmedName,
        description: customDescription.trim(),
        source: "custom",
        key: nextKey("custom"),
      },
    ];
    setSelected(next);
    syncToParent(next);
    setCustomName("");
    setCustomDescription("");
  }

  // Remove from selected list
  function removeSelected(index: number) {
    const next = selected.filter((_, i) => i !== index);
    setSelected(next);
    syncToParent(next);
    if (editingIndex === index) setEditingIndex(null);
  }

  // Update description inline
  function updateDescription(index: number, description: string) {
    const next = [...selected];
    next[index] = { ...next[index], description };
    setSelected(next);
    syncToParent(next);
  }

  // AI suggest handler
  async function handleSuggestCapabilities() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/suggest-capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundle_type: bundleType,
          outcome_type: outcomeType,
          outcome_statement: outcomeStatement,
          service_name: outcomeName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.capabilities && Array.isArray(data.capabilities)) {
          setAiSuggestions(data.capabilities);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setAiLoading(false);
    }
  }

  // Source badge label
  function sourceBadgeLabel(source: string) {
    switch (source) {
      case "template":
        return "Template";
      case "ai":
        return "AI";
      case "custom":
        return "Custom";
      default:
        return source;
    }
  }

  const categoryLabel = OUTCOME_CATEGORY_LABELS[outcomeType];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Define the Service
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          What capabilities does this service include? These define the value you
          deliver.
        </p>
      </div>

      {/* ── Service type selector ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bundle-type">Service type</Label>
          <Select
            value={bundleType}
            onValueChange={(v) => onBundleTypeChange(v as BundleType)}
          >
            <SelectTrigger id="bundle-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUNDLE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {BUNDLE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Template Library ────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Capability Templates</Label>
            {categoryLabel && (
              <Badge variant="secondary" className="text-[10px]">
                {categoryLabel}
              </Badge>
            )}
          </div>

          {templateGroups.map((group) => (
            <div key={group.category} className="space-y-2">
              {templateGroups.length > 1 && (
                <h3 className="text-sm font-medium text-muted-foreground pt-1">
                  {group.category}
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.capabilities.map((cap) => {
                  const isSelected = isTemplateSelected(cap.name);
                  return (
                    <button
                      key={cap.name}
                      type="button"
                      onClick={() => toggleTemplate(cap)}
                      className={`relative rounded-lg border p-3 text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card/60 hover:border-primary/40"
                      }`}
                    >
                      {isSelected && (
                        <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                      )}
                      <p className="font-medium text-sm text-foreground pr-6">
                        {cap.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {cap.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── AI Suggestions ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSuggestCapabilities}
            disabled={aiLoading}
            className="h-7 text-xs gap-1.5"
          >
            {aiLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Suggest with AI
          </Button>

          {aiLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="animate-pulse rounded-lg border border-border bg-card/60 p-3 h-20"
                />
              ))}
            </div>
          )}

          {!aiLoading && aiSuggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm">AI Suggestions</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiSuggestions.map((cap) => {
                  const isSelected = isAiSelected(cap.name);
                  return (
                    <button
                      key={cap.name}
                      type="button"
                      onClick={() => toggleAiSuggestion(cap)}
                      className={`relative rounded-lg border p-3 text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card/60 hover:border-primary/40"
                      }`}
                    >
                      {isSelected && (
                        <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                      )}
                      <div className="flex items-start gap-2 pr-6">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">
                            {cap.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {cap.description}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="absolute bottom-2 right-2 text-[10px]"
                      >
                        AI
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Custom entry ───────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label>Add your own</Label>
          <div className="space-y-2">
            <Input
              placeholder="Capability name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <Textarea
              placeholder="Brief description..."
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              rows={2}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustom}
              disabled={!customName.trim()}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>

        {/* ── Your capabilities list ─────────────────────────────────── */}
        <div className="space-y-3 pt-2">
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-foreground">
              Your capabilities ({selected.length})
            </h3>
          </div>

          {selected.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No capabilities selected yet.
            </p>
          ) : (
            <div className="space-y-2">
              {selected.map((cap, i) => (
                <div
                  key={cap.key}
                  className="rounded-lg border border-border bg-card/60 p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">
                          {cap.name}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                          {sourceBadgeLabel(cap.source)}
                        </Badge>
                      </div>
                      {editingIndex === i ? (
                        <Textarea
                          className="mt-1.5 text-xs"
                          value={cap.description}
                          onChange={(e) =>
                            updateDescription(i, e.target.value)
                          }
                          onBlur={() => setEditingIndex(null)}
                          rows={2}
                          autoFocus
                        />
                      ) : (
                        <p
                          className="mt-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => setEditingIndex(i)}
                          title="Click to edit"
                        >
                          {cap.description || "Click to add a description..."}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSelected(i)}
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
