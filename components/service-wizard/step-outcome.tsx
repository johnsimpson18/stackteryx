"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { OutcomePicker, type SelectedOutcome } from "./outcome-picker";
import type { SelectedOutcomeRecord } from "@/lib/types";

interface StepOutcomeProps {
  name: string;
  outcomeType: string;
  outcomeStatement: string;
  targetVertical: string;
  targetPersona: string;
  selectedOutcomes: SelectedOutcomeRecord[];
  onNameChange: (v: string) => void;
  onOutcomeTypeChange: (v: "compliance" | "efficiency" | "security" | "growth" | "custom") => void;
  onOutcomeStatementChange: (v: string) => void;
  onTargetVerticalChange: (v: string) => void;
  onTargetPersonaChange: (v: string) => void;
  onSelectedOutcomesChange: (v: SelectedOutcomeRecord[]) => void;
  showSkipWarning?: boolean;
  onDismissSkipWarning?: () => void;
}

export function StepOutcome({
  name,
  outcomeType,
  outcomeStatement,
  targetVertical,
  targetPersona,
  selectedOutcomes,
  onNameChange,
  onOutcomeTypeChange,
  onOutcomeStatementChange,
  onTargetVerticalChange,
  onTargetPersonaChange,
  onSelectedOutcomesChange,
  showSkipWarning,
  onDismissSkipWarning,
}: StepOutcomeProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(
    () => !!(outcomeStatement || targetVertical || targetPersona)
  );

  async function handleDraftOutcome() {
    if (!name.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/draft-outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, outcome_type: outcomeType }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.outcome_statement) onOutcomeStatementChange(data.outcome_statement);
        if (data.target_vertical) onTargetVerticalChange(data.target_vertical);
        if (data.target_persona) onTargetPersonaChange(data.target_persona);
        setShowAdvanced(true);
      }
    } catch {
      // Non-blocking
    } finally {
      setAiLoading(false);
    }
  }

  // Auto-derive outcome_type from the first selected outcome's category
  function handleOutcomesChange(outcomes: SelectedOutcome[]) {
    onSelectedOutcomesChange(outcomes as SelectedOutcomeRecord[]);

    // Auto-set outcome_type based on selected outcomes if still default
    if (outcomes.length > 0 && !outcomes[0].isCustom) {
      const id = outcomes[0].id;
      if (id.startsWith("sec-")) onOutcomeTypeChange("security");
      else if (id.startsWith("cmp-")) onOutcomeTypeChange("compliance");
      else if (id.startsWith("pro-")) onOutcomeTypeChange("efficiency");
      else if (id.startsWith("bak-")) onOutcomeTypeChange("security");
      else if (id.startsWith("net-")) onOutcomeTypeChange("security");
      else if (id.startsWith("adv-")) onOutcomeTypeChange("growth");
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Step introduction ───────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          What outcomes does this service deliver?
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
          Start with a name, then select the business results your clients will
          achieve. These drive your proposals and sales playbooks.
        </p>
      </div>

      {/* ── Service name (primary input) ────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="service-name" className="text-sm font-medium">
          Service name
        </Label>
        <Input
          id="service-name"
          placeholder="e.g. Essential Security Service"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
          className="text-base h-11"
        />
      </div>

      {/* ── Outcome Library Picker (main event) ─────────────────────────── */}
      <OutcomePicker
        selectedOutcomes={selectedOutcomes as SelectedOutcome[]}
        onChange={handleOutcomesChange}
      />

      {/* ── Advanced options (collapsed by default) ─────────────────────── */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {showAdvanced ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium">Additional details</span>
          <span className="text-xs">(outcome statement, target audience)</span>
          {!showAdvanced && (outcomeStatement || targetVertical || targetPersona) && (
            <span className="ml-auto text-[10px] text-[#c8f135]">has content</span>
          )}
        </button>

        {showAdvanced && (
          <div className="space-y-4 mt-4">
            {/* Outcome statement with AI draft */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="outcome-statement" className="text-sm">
                  Outcome statement
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDraftOutcome}
                  disabled={aiLoading || !name.trim()}
                  className="h-7 text-xs gap-1.5"
                >
                  {aiLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  AI Draft
                </Button>
              </div>
              <Textarea
                id="outcome-statement"
                placeholder="Optional — describe the overall outcome in your own words..."
                value={outcomeStatement}
                onChange={(e) => onOutcomeStatementChange(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                This supplements the outcomes you selected above. Leave blank if the library
                outcomes are sufficient.
              </p>
            </div>

            {/* Target vertical + persona */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target-vertical" className="text-sm">
                  Target vertical
                </Label>
                <Input
                  id="target-vertical"
                  placeholder="e.g. Healthcare, Finance"
                  value={targetVertical}
                  onChange={(e) => onTargetVerticalChange(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-persona" className="text-sm">
                  Target persona
                </Label>
                <Input
                  id="target-persona"
                  placeholder="e.g. IT Director, CISO"
                  value={targetPersona}
                  onChange={(e) => onTargetPersonaChange(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Skip warning ─────────────────────────────────────────────────── */}
      {showSkipWarning && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-400 font-medium">
              No outcomes selected
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Outcomes help generate stronger proposals and sales playbooks.
              You can add them now or edit the service later.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDismissSkipWarning}
                className="h-7 text-xs"
              >
                Continue anyway
              </Button>
              <button
                type="button"
                onClick={() => {
                  // Just scroll up — don't proceed
                  window.scrollTo({ top: 300, behavior: "smooth" });
                }}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Go back and add outcomes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
