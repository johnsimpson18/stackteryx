"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// ── Packaging options ─────────────────────────────────────────────────────────

const PACKAGING_OPTIONS = [
  {
    value: "one_managed",
    label: "One Managed Offering",
    desc: "All clients are on the same stack. One price, one service.",
    icon: "▪",
  },
  {
    value: "multiple_tiers",
    label: "Multiple Tiers",
    desc: "Good / Better / Best. Clients choose their level of protection.",
    icon: "▪▪▪",
  },
  {
    value: "a_la_carte",
    label: "À La Carte",
    desc: "Clients mix and match. You build what they need.",
    icon: "⊞",
  },
  {
    value: "mix_all",
    label: "Mix of All Three",
    desc: "You do it all depending on the client.",
    icon: "◈",
  },
];

const DELIVERY_OPTIONS = [
  { value: "fully_managed", label: "Fully Managed", desc: "We do everything" },
  { value: "co_managed", label: "Co-Managed", desc: "Shared with the client" },
  { value: "advisory", label: "Advisory / Consulting", desc: "Consulting only" },
  { value: "mix_delivery", label: "Mix of All Three", desc: "Depends on the engagement" },
];

const SALES_TEAM_OPTIONS = [
  "Owner / Founder Led",
  "Dedicated Sales Team",
  "vCISO Led",
  "Mixed Sales + Technical",
];

// ── Component ─────────────────────────────────────────────────────────────────

interface StepBusinessProps {
  salesModel: string;
  deliveryModels: string[];
  salesTeamType: string;
  onSalesModelChange: (v: string) => void;
  onDeliveryModelsChange: (v: string[]) => void;
  onSalesTeamTypeChange: (v: string) => void;
}

function toggleArr(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
}

export function StepBusiness({
  salesModel,
  deliveryModels,
  salesTeamType,
  onSalesModelChange,
  onDeliveryModelsChange,
  onSalesTeamTypeChange,
}: StepBusinessProps) {
  return (
    <div className="space-y-8">
      {/* Headline */}
      <div>
        <h1
          className="font-display text-white text-4xl font-bold uppercase tracking-tight"
        >
          HOW DO YOU SELL?
        </h1>
        <p
          className="mt-2 font-mono text-muted-foreground text-sm"
        >
          This helps us build the right bundle structure for your business.
        </p>
      </div>

      {/* Q1 — Packaging */}
      <div className="space-y-3">
        <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          How do you package your services?
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {PACKAGING_OPTIONS.map((opt) => {
            const selected = salesModel === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSalesModelChange(selected ? "" : opt.value)}
                className={cn(
                  "rounded-lg border px-4 py-4 text-left transition-colors",
                  selected
                    ? "bg-primary/[0.06] border-primary"
                    : "bg-[#111111] border-border"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      "text-base font-mono",
                      selected ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {opt.icon}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-display font-bold uppercase",
                      selected ? "text-primary" : "text-white"
                    )}
                  >
                    {opt.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q2 — Delivery */}
      <div className="space-y-3">
        <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          How do you deliver?
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {DELIVERY_OPTIONS.map((opt) => {
            const selected = deliveryModels.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onDeliveryModelsChange(toggleArr(deliveryModels, opt.value))}
                className={cn(
                  "rounded-lg border px-4 py-4 text-left transition-colors",
                  selected
                    ? "bg-primary/[0.06] border-primary"
                    : "bg-[#111111] border-border"
                )}
              >
                <p
                  className={cn(
                    "text-sm font-display font-bold uppercase",
                    selected ? "text-primary" : "text-white"
                  )}
                >
                  {opt.label}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground mt-1">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q3 — Sales team */}
      <div className="space-y-3">
        <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          What does your sales team look like?
        </Label>
        <div className="flex flex-wrap gap-2">
          {SALES_TEAM_OPTIONS.map((opt) => {
            const selected = salesTeamType === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onSalesTeamTypeChange(selected ? "" : opt)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium border transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-[#111111] text-[#CCCCCC] border-border"
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
