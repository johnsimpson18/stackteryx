"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ── Service categories ────────────────────────────────────────────────────────

const OUTCOME_TYPES = [
  {
    value: "Risk Reduction",
    description: "Reduce your clients' exposure to cyber threats through proactive defense and monitoring.",
  },
  {
    value: "Compliance",
    description: "Help clients meet regulatory requirements and pass audits with confidence.",
  },
  {
    value: "Revenue Protection",
    description: "Protect business continuity and revenue streams from downtime and data loss.",
  },
  {
    value: "Productivity",
    description: "Streamline IT operations so your clients' teams can focus on their core work.",
  },
];

interface StepServicesProps {
  services: string[];
  servicesCustom: string[];
  onServicesChange: (v: string[]) => void;
  onServicesCustomChange: (v: string[]) => void;
}

function toggle(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
}

export function StepServices({
  services,
  servicesCustom,
  onServicesChange,
  onServicesCustomChange,
}: StepServicesProps) {
  const [customInput, setCustomInput] = useState("");

  const addCustom = () => {
    const value = customInput.trim();
    if (value && !servicesCustom.includes(value)) {
      onServicesCustomChange([...servicesCustom, value]);
    }
    setCustomInput("");
  };

  const removeCustom = (item: string) => {
    onServicesCustomChange(servicesCustom.filter((v) => v !== item));
  };

  return (
    <div className="space-y-8">
      {/* Headline */}
      <div>
        <h1 className="font-display text-white text-4xl font-bold uppercase tracking-tight">
          WHAT OUTCOMES DO YOU DELIVER?
        </h1>
        <p className="mt-2 font-mono text-muted-foreground text-sm">
          Think about the business results your clients hire you to provide — not the tools you use to deliver them.
        </p>
      </div>

      {/* Outcome types */}
      <div className="space-y-3">
        {OUTCOME_TYPES.map((outcome) => {
          const selected = services.includes(outcome.value);
          return (
            <button
              key={outcome.value}
              type="button"
              onClick={() => onServicesChange(toggle(services, outcome.value))}
              className={cn(
                "w-full rounded-lg border px-5 py-4 text-left transition-colors",
                selected
                  ? "bg-primary/[0.06] border-primary"
                  : "bg-[#111111] border-border"
              )}
            >
              <span
                className={cn(
                  "text-sm font-bold",
                  selected ? "text-primary" : "text-white"
                )}
              >
                {outcome.value}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">
                {outcome.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Custom services */}
      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Anything else?
        </Label>

        {/* Tags */}
        {servicesCustom.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {servicesCustom.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeCustom(tag)}
                  className="ml-0.5 hover:opacity-70"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Type a custom service and press Enter"
            className="flex-1 bg-[#111111] border-border text-white"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-primary bg-[#111111] transition-colors disabled:opacity-30"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
