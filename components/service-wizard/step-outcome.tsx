"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

const OUTCOME_TYPES = [
  { value: "compliance", label: "Compliance" },
  { value: "efficiency", label: "Efficiency" },
  { value: "security", label: "Security" },
  { value: "growth", label: "Growth" },
  { value: "custom", label: "Custom" },
] as const;

interface StepOutcomeProps {
  name: string;
  outcomeType: string;
  outcomeStatement: string;
  targetVertical: string;
  targetPersona: string;
  onNameChange: (v: string) => void;
  onOutcomeTypeChange: (v: "compliance" | "efficiency" | "security" | "growth" | "custom") => void;
  onOutcomeStatementChange: (v: string) => void;
  onTargetVerticalChange: (v: string) => void;
  onTargetPersonaChange: (v: string) => void;
}

export function StepOutcome({
  name,
  outcomeType,
  outcomeStatement,
  targetVertical,
  targetPersona,
  onNameChange,
  onOutcomeTypeChange,
  onOutcomeStatementChange,
  onTargetVerticalChange,
  onTargetPersonaChange,
}: StepOutcomeProps) {
  const [aiLoading, setAiLoading] = useState(false);

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
      }
    } catch {
      // Non-blocking
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Define the Outcome</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          What outcome does this service deliver? Start with the &quot;why&quot; before the &quot;what.&quot;
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="service-name">Service name</Label>
          <Input
            id="service-name"
            placeholder="e.g. Essential Security Service"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="outcome-type">Outcome type</Label>
          <Select value={outcomeType} onValueChange={onOutcomeTypeChange}>
            <SelectTrigger id="outcome-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTCOME_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="outcome-statement">Outcome statement</Label>
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
              Draft Outcome
            </Button>
          </div>
          <Textarea
            id="outcome-statement"
            placeholder="e.g. Reduce compliance risk for healthcare organizations by providing continuous monitoring and automated remediation..."
            value={outcomeStatement}
            onChange={(e) => onOutcomeStatementChange(e.target.value)}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="target-vertical">Target vertical</Label>
            <Input
              id="target-vertical"
              placeholder="e.g. Healthcare, Finance"
              value={targetVertical}
              onChange={(e) => onTargetVerticalChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-persona">Target persona</Label>
            <Input
              id="target-persona"
              placeholder="e.g. IT Director, CISO"
              value={targetPersona}
              onChange={(e) => onTargetPersonaChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
