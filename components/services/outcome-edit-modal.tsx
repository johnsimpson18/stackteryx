"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { updateServiceOutcomeAction } from "@/actions/service-profile";
import type { ServiceOutcome } from "@/lib/types";

const OUTCOME_TYPES = [
  { value: "compliance", label: "Compliance" },
  { value: "efficiency", label: "Efficiency" },
  { value: "security", label: "Security" },
  { value: "growth", label: "Growth" },
  { value: "custom", label: "Custom" },
] as const;

interface OutcomeEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundleId: string;
  outcome: ServiceOutcome | null;
}

export function OutcomeEditModal({
  open,
  onOpenChange,
  bundleId,
  outcome,
}: OutcomeEditModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDrafted, setAiDrafted] = useState(false);

  const [outcomeType, setOutcomeType] = useState(outcome?.outcome_type ?? "security");
  const [statement, setStatement] = useState(outcome?.outcome_statement ?? "");
  const [vertical, setVertical] = useState(outcome?.target_vertical ?? "");
  const [persona, setPersona] = useState(outcome?.target_persona ?? "");

  // Reset form when modal opens
  function handleOpenChange(v: boolean) {
    if (v) {
      setOutcomeType(outcome?.outcome_type ?? "security");
      setStatement(outcome?.outcome_statement ?? "");
      setVertical(outcome?.target_vertical ?? "");
      setPersona(outcome?.target_persona ?? "");
      setAiDrafted(false);
    }
    onOpenChange(v);
  }

  async function handleAiDraft() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/draft-outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "", outcome_type: outcomeType }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.outcome_statement) setStatement(data.outcome_statement);
        if (data.target_vertical) setVertical(data.target_vertical);
        if (data.target_persona) setPersona(data.target_persona);
        setAiDrafted(true);
      }
    } catch {
      toast.error("AI draft failed");
    } finally {
      setAiLoading(false);
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateServiceOutcomeAction(bundleId, {
        outcome_type: outcomeType,
        outcome_statement: statement,
        target_vertical: vertical,
        target_persona: persona,
      });
      if (result.success) {
        toast.success("Outcome updated");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Outcome</DialogTitle>
          <DialogDescription>
            Define what outcome this service delivers for your clients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Outcome type</Label>
            <Select value={outcomeType} onValueChange={setOutcomeType}>
              <SelectTrigger>
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
              <Label>Outcome statement</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAiDraft}
                disabled={aiLoading}
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
              value={statement}
              onChange={(e) => { setStatement(e.target.value); setAiDrafted(false); }}
              placeholder="What outcome does this service deliver?"
              rows={4}
            />
            {aiDrafted && (
              <p className="text-xs text-muted-foreground">AI drafted — edit freely</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Target vertical</Label>
              <Input
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
                placeholder="e.g. Healthcare"
              />
            </div>
            <div className="space-y-2">
              <Label>Target persona</Label>
              <Input
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="e.g. IT Director"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
