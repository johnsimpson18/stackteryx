"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OUTCOME_LIBRARY,
  OUTCOME_CATEGORIES,
  OUTCOME_CATEGORY_LABELS,
  type OutcomeCategory,
  type PresetOutcome,
} from "@/lib/outcome-library";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SelectedOutcome {
  id: string;
  statement: string;
  description?: string;
  isCustom: boolean;
  complianceFrameworks?: string[];
}

interface OutcomePickerProps {
  selectedOutcomes: SelectedOutcome[];
  onChange: (outcomes: SelectedOutcome[]) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let customCounter = 0;

function getCategoryCounts(): Record<OutcomeCategory | "all", number> {
  const counts: Record<string, number> = { all: OUTCOME_LIBRARY.length };
  for (const cat of OUTCOME_CATEGORIES) {
    counts[cat] = OUTCOME_LIBRARY.filter((o) => o.category === cat).length;
  }
  return counts as Record<OutcomeCategory | "all", number>;
}

const CATEGORY_COUNTS = getCategoryCounts();

// ── Component ────────────────────────────────────────────────────────────────

export function OutcomePicker({
  selectedOutcomes,
  onChange,
}: OutcomePickerProps) {
  const [activeCategory, setActiveCategory] = useState<OutcomeCategory | "all">(
    "all"
  );
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customStatement, setCustomStatement] = useState("");

  const selectedIds = new Set(selectedOutcomes.map((o) => o.id));

  // Track which categories have selections
  const categoriesWithSelections = new Set<string>();
  for (const o of selectedOutcomes) {
    if (!o.isCustom) {
      const preset = OUTCOME_LIBRARY.find((p) => p.id === o.id);
      if (preset) categoriesWithSelections.add(preset.category);
    }
  }

  const filteredOutcomes: PresetOutcome[] =
    activeCategory === "all"
      ? OUTCOME_LIBRARY
      : OUTCOME_LIBRARY.filter((o) => o.category === activeCategory);

  function toggleOutcome(preset: PresetOutcome) {
    if (selectedIds.has(preset.id)) {
      onChange(selectedOutcomes.filter((o) => o.id !== preset.id));
    } else {
      onChange([
        ...selectedOutcomes,
        {
          id: preset.id,
          statement: preset.statement,
          description: preset.description,
          isCustom: false,
          complianceFrameworks: preset.complianceFrameworks,
        },
      ]);
    }
  }

  function addCustomOutcome() {
    const statement = customStatement.trim();
    if (statement.length < 10) return;
    const id = `custom-${++customCounter}-${Date.now()}`;
    onChange([
      ...selectedOutcomes,
      {
        id,
        statement,
        isCustom: true,
      },
    ]);
    setCustomStatement("");
    setShowCustomInput(false);
  }

  function removeOutcome(id: string) {
    onChange(selectedOutcomes.filter((o) => o.id !== id));
  }

  return (
    <div className="space-y-5">
      {/* ── Category tabs ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={cn(
            "relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            activeCategory === "all"
              ? "bg-[#c8f135]/15 text-[#c8f135] ring-1 ring-[#c8f135]/40"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          All ({CATEGORY_COUNTS.all})
        </button>
        {OUTCOME_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeCategory === cat
                ? "bg-[#c8f135]/15 text-[#c8f135] ring-1 ring-[#c8f135]/40"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {OUTCOME_CATEGORY_LABELS[cat]} ({CATEGORY_COUNTS[cat]})
            {categoriesWithSelections.has(cat) && activeCategory !== cat && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#c8f135]" />
            )}
          </button>
        ))}
      </div>

      {/* ── Outcome cards grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredOutcomes.map((outcome) => {
          const isSelected = selectedIds.has(outcome.id);
          return (
            <button
              key={outcome.id}
              type="button"
              onClick={() => toggleOutcome(outcome)}
              className={cn(
                "relative rounded-lg border p-3 text-left cursor-pointer transition-all",
                isSelected
                  ? "border-[#c8f135] bg-[#c8f135]/5 shadow-[0_0_0_1px_rgba(200,241,53,0.3)]"
                  : "border-border bg-card/60 hover:border-primary/40"
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#c8f135] flex items-center justify-center">
                  <Check className="h-3 w-3 text-black" />
                </div>
              )}
              <p className="font-medium text-sm text-foreground pr-7">
                {outcome.statement}
              </p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {outcome.description}
              </p>
              {outcome.complianceFrameworks &&
                outcome.complianceFrameworks.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {outcome.complianceFrameworks.map((fw) => (
                      <Badge
                        key={fw}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {fw}
                      </Badge>
                    ))}
                  </div>
                )}
            </button>
          );
        })}
      </div>

      {/* ── Selected outcomes panel ─────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card/60 p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">
          Selected outcomes ({selectedOutcomes.length})
        </h3>

        {selectedOutcomes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No outcomes selected yet. Pick from the library above or add your own.
          </p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {selectedOutcomes.map((outcome) => (
              <div
                key={outcome.id}
                className="flex items-start gap-2 rounded-md border border-border bg-background/50 px-3 py-2"
              >
                <Check className="h-3.5 w-3.5 text-[#c8f135] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-foreground">
                      {outcome.statement}
                    </p>
                    {outcome.isCustom && (
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0 text-muted-foreground"
                      >
                        Custom
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeOutcome(outcome.id)}
                  className="shrink-0 h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Custom outcome input */}
        {showCustomInput ? (
          <div className="space-y-2 pt-1 border-t border-border mt-2">
            <p className="text-xs text-muted-foreground pt-2">
              Describe the outcome your client achieves:
            </p>
            <div className="relative">
              <Input
                placeholder="What your client gains from this service..."
                value={customStatement}
                onChange={(e) => setCustomStatement(e.target.value.slice(0, 200))}
                maxLength={200}
                autoFocus
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                {customStatement.length}/200
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomOutcome}
                disabled={customStatement.trim().length < 10}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3 w-3" />
                Add to my outcomes
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomStatement("");
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              {customStatement.trim().length > 0 &&
                customStatement.trim().length < 10 && (
                  <span className="text-[10px] text-muted-foreground">
                    Minimum 10 characters
                  </span>
                )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors pt-1"
          >
            <Plus className="h-3 w-3" />
            Add a custom outcome
          </button>
        )}
      </div>
    </div>
  );
}
