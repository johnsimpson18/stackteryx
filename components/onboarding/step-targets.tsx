"use client";

import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// ── Compliance frameworks ─────────────────────────────────────────────────────

const COMPLIANCE_FRAMEWORKS = [
  "SOC 2 Type II",
  "HIPAA",
  "PCI-DSS",
  "NIST CSF",
  "ISO 27001",
  "CMMC Level 2",
  "CMMC Level 3",
  "GDPR",
  "CCPA",
  "NIST 800-171",
  "CIS Controls v8",
  "FedRAMP",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewData {
  companyName: string;
  founderName: string;
  founderTitle: string;
  companySize: string;
  geographies: string[];
  verticals: string[];
  clientSizes: string[];
  buyerPersonas: string[];
  services: string[];
  servicesCustom: string[];
  toolCount: number;
  salesModel: string;
  deliveryModels: string[];
  salesTeamType: string;
}

const OUTCOME_TARGET_OPTIONS = [
  "Risk Reduction",
  "Compliance",
  "Revenue Protection",
  "Productivity",
];

interface StepTargetsProps {
  targetMarginPct: number;
  complianceTargets: string[];
  additionalContext: string;
  outcomeTargets: string[];
  onTargetMarginPctChange: (v: number) => void;
  onComplianceTargetsChange: (v: string[]) => void;
  onAdditionalContextChange: (v: string) => void;
  onOutcomeTargetsChange: (v: string[]) => void;
  review: ReviewData;
  onLaunch: () => void;
  isLaunching: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toggleArr(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-border">
      <span className="text-xs text-muted-foreground">
        {label}
      </span>
      <span className="text-xs text-right max-w-[60%] truncate text-[#CCCCCC]">
        {value}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StepTargets({
  targetMarginPct,
  complianceTargets,
  additionalContext,
  outcomeTargets,
  onTargetMarginPctChange,
  onComplianceTargetsChange,
  onAdditionalContextChange,
  onOutcomeTargetsChange,
  review,
  onLaunch,
  isLaunching,
}: StepTargetsProps) {
  const [reviewOpen, setReviewOpen] = useState(false);

  // Live calculation: sell = cost / (1 - margin/100)
  const exampleCost = 15.0;
  const exampleSell = exampleCost / (1 - targetMarginPct / 100);
  const sliderPct = ((targetMarginPct - 10) / (80 - 10)) * 100;

  return (
    <div className="space-y-8">
      {/* Slider style */}
      <style>{`
        .onb-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #A8FF3E;
          cursor: pointer;
          border: 2px solid #0A0A0A;
        }
        .onb-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #A8FF3E;
          cursor: pointer;
          border: 2px solid #0A0A0A;
        }
      `}</style>

      {/* Headline */}
      <div>
        <h1 className="font-display text-white text-4xl font-bold uppercase tracking-tight">
          SET YOUR TARGETS
        </h1>
        <p className="mt-2 font-mono text-muted-foreground text-sm">
          We&apos;ll use these to model your margins and evaluate your bundles.
        </p>
      </div>

      {/* Target margin slider */}
      <div className="space-y-4">
        <div className="text-center">
          <span className="font-display text-5xl font-bold text-primary">
            {targetMarginPct}%
          </span>
          <span className="ml-2 text-sm font-display text-muted-foreground">
            target margin
          </span>
        </div>

        <input
          type="range"
          min={10}
          max={80}
          step={1}
          value={targetMarginPct}
          onChange={(e) => onTargetMarginPctChange(Number(e.target.value))}
          className="onb-slider w-full h-2 rounded-full outline-none cursor-pointer"
          style={{
            WebkitAppearance: "none",
            appearance: "none",
            background: `linear-gradient(to right, #A8FF3E ${sliderPct}%, #1E1E1E ${sliderPct}%)`,
          }}
        />

        <p className="text-center text-sm text-muted-foreground">
          At {targetMarginPct}%, a ${exampleCost.toFixed(2)}/user/month stack sells for{" "}
          <span className="text-primary font-semibold">
            ${exampleSell.toFixed(2)}/user/month
          </span>
        </p>
      </div>

      {/* Compliance frameworks */}
      <div className="space-y-3">
        <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          Which frameworks do your clients need to comply with?
        </Label>
        <div className="flex flex-wrap gap-2">
          {COMPLIANCE_FRAMEWORKS.map((fw) => {
            const selected = complianceTargets.includes(fw);
            return (
              <button
                key={fw}
                type="button"
                onClick={() => onComplianceTargetsChange(toggleArr(complianceTargets, fw))}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium border transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-[#111111] text-[#CCCCCC] border-border"
                )}
              >
                {fw}
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional context */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          Anything else we should know?
        </Label>
        <textarea
          value={additionalContext}
          onChange={(e) => {
            if (e.target.value.length <= 500) {
              onAdditionalContextChange(e.target.value);
            }
          }}
          rows={4}
          placeholder="Tell us about your niche, your competitive advantage, or anything unique about how you operate. This helps us write better bundle descriptions."
          className="w-full rounded-lg border border-border bg-[#111111] text-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#444] resize-none focus:border-primary"
        />
        <p className="text-right text-xs text-muted-foreground">
          {additionalContext.length}/500
        </p>
      </div>

      {/* Outcome targets */}
      <div className="space-y-3">
        <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          Which outcome types do you want your portfolio to cover by end of year?
        </Label>
        <div className="flex flex-wrap gap-2">
          {OUTCOME_TARGET_OPTIONS.map((ot) => {
            const selected = outcomeTargets.includes(ot);
            return (
              <button
                key={ot}
                type="button"
                onClick={() => onOutcomeTargetsChange(toggleArr(outcomeTargets, ot))}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium border transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-[#111111] text-[#CCCCCC] border-border"
                )}
              >
                {ot}
              </button>
            );
          })}
        </div>
      </div>

      {/* Review section */}
      <div className="rounded-lg border border-border bg-[#111111]">
        <button
          type="button"
          onClick={() => setReviewOpen(!reviewOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[#CCCCCC]"
        >
          Review Your Inputs
          {reviewOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {reviewOpen && (
          <div className="px-4 pb-4 space-y-1">
            <ReviewRow label="Company" value={review.companyName} />
            <ReviewRow label="Contact" value={[review.founderName, review.founderTitle].filter(Boolean).join(", ")} />
            <ReviewRow label="Size" value={review.companySize} />
            <ReviewRow label="Geography" value={review.geographies.join(", ")} />
            <ReviewRow label="Verticals" value={review.verticals.join(", ")} />
            <ReviewRow label="Client Sizes" value={review.clientSizes.join(", ")} />
            <ReviewRow label="Personas" value={review.buyerPersonas.join(", ")} />
            <ReviewRow
              label="Services"
              value={[...review.services, ...review.servicesCustom].join(", ")}
            />
            <ReviewRow label="Tools" value={`${review.toolCount} selected`} />
            <ReviewRow label="Sales Model" value={review.salesModel} />
            <ReviewRow label="Delivery" value={review.deliveryModels.join(", ")} />
            <ReviewRow label="Sales Team" value={review.salesTeamType} />
            <ReviewRow label="Target Margin" value={`${targetMarginPct}%`} />
            <ReviewRow label="Compliance" value={complianceTargets.join(", ")} />
          </div>
        )}
      </div>

      {/* Launch button */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={onLaunch}
          disabled={isLaunching}
          className={cn(
            "w-full flex items-center justify-center gap-3 rounded-lg font-display text-2xl font-bold uppercase tracking-tight transition-all duration-150 h-14 disabled:cursor-not-allowed",
            isLaunching
              ? "bg-[#333333] text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-[#BFFF5C] active:scale-[0.98]"
          )}
        >
          {isLaunching ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              Launching…
            </>
          ) : (
            "LAUNCH STACKTERYX →"
          )}
        </button>
        <p className="text-center text-xs font-mono text-muted-foreground">
          This usually takes about 10 seconds. We&apos;ll build your first bundles automatically.
        </p>
      </div>
    </div>
  );
}
