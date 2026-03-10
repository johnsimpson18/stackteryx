"use client";

import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

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
    <div className="flex justify-between py-1.5 border-b" style={{ borderColor: "#1E1E1E" }}>
      <span className="text-xs" style={{ color: "#666666" }}>
        {label}
      </span>
      <span className="text-xs text-right max-w-[60%] truncate" style={{ color: "#CCCCCC" }}>
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
        <h1
          className="text-4xl font-bold uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "#FFFFFF", fontSize: 36 }}
        >
          SET YOUR TARGETS
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ fontFamily: "var(--font-mono-alt)", color: "#666666", fontSize: 14 }}
        >
          We&apos;ll use these to model your margins and evaluate your bundles.
        </p>
      </div>

      {/* Target margin slider */}
      <div className="space-y-4">
        <div className="text-center">
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 48,
              fontWeight: 700,
              color: "#A8FF3E",
            }}
          >
            {targetMarginPct}%
          </span>
          <span
            className="ml-2 text-sm"
            style={{ fontFamily: "var(--font-display)", color: "#666666" }}
          >
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

        <p className="text-center text-sm" style={{ color: "#666666" }}>
          At {targetMarginPct}%, a ${exampleCost.toFixed(2)}/user/month stack sells for{" "}
          <span style={{ color: "#A8FF3E", fontWeight: 600 }}>
            ${exampleSell.toFixed(2)}/user/month
          </span>
        </p>
      </div>

      {/* Compliance frameworks */}
      <div className="space-y-3">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#999999" }}>
          Which frameworks do your clients need to comply with?
        </label>
        <div className="flex flex-wrap gap-2">
          {COMPLIANCE_FRAMEWORKS.map((fw) => {
            const selected = complianceTargets.includes(fw);
            return (
              <button
                key={fw}
                type="button"
                onClick={() => onComplianceTargetsChange(toggleArr(complianceTargets, fw))}
                className="rounded-full px-4 py-2 text-sm font-medium transition-[border-color,background-color,color] duration-100"
                style={{
                  backgroundColor: selected ? "#A8FF3E" : "#111111",
                  color: selected ? "#0A0A0A" : "#CCCCCC",
                  border: selected ? "1px solid #A8FF3E" : "1px solid #1E1E1E",
                }}
              >
                {fw}
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional context */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#999999" }}>
          Anything else we should know?
        </label>
        <textarea
          value={additionalContext}
          onChange={(e) => {
            if (e.target.value.length <= 500) {
              onAdditionalContextChange(e.target.value);
            }
          }}
          rows={4}
          placeholder="Tell us about your niche, your competitive advantage, or anything unique about how you operate. This helps us write better bundle descriptions."
          className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#444] resize-none"
          style={{
            backgroundColor: "#111111",
            borderColor: "#1E1E1E",
            color: "#FFFFFF",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#A8FF3E";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#1E1E1E";
          }}
        />
        <p className="text-right text-xs" style={{ color: "#666666" }}>
          {additionalContext.length}/500
        </p>
      </div>

      {/* Outcome targets */}
      <div className="space-y-3">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#999999" }}>
          Which outcome types do you want your portfolio to cover by end of year?
        </label>
        <div className="flex flex-wrap gap-2">
          {OUTCOME_TARGET_OPTIONS.map((ot) => {
            const selected = outcomeTargets.includes(ot);
            return (
              <button
                key={ot}
                type="button"
                onClick={() => onOutcomeTargetsChange(toggleArr(outcomeTargets, ot))}
                className="rounded-full px-4 py-2 text-sm font-medium transition-[border-color,background-color,color] duration-100"
                style={{
                  backgroundColor: selected ? "#A8FF3E" : "#111111",
                  color: selected ? "#0A0A0A" : "#CCCCCC",
                  border: selected ? "1px solid #A8FF3E" : "1px solid #1E1E1E",
                }}
              >
                {ot}
              </button>
            );
          })}
        </div>
      </div>

      {/* Review section */}
      <div className="rounded-lg border" style={{ borderColor: "#1E1E1E", backgroundColor: "#111111" }}>
        <button
          type="button"
          onClick={() => setReviewOpen(!reviewOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
          style={{ color: "#CCCCCC" }}
        >
          Review Your Inputs
          {reviewOpen ? (
            <ChevronUp className="h-4 w-4" style={{ color: "#666666" }} />
          ) : (
            <ChevronDown className="h-4 w-4" style={{ color: "#666666" }} />
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
          className="w-full flex items-center justify-center gap-3 rounded-lg font-bold uppercase tracking-tight transition-all duration-150 disabled:cursor-not-allowed"
          style={{
            height: 56,
            backgroundColor: isLaunching ? "#333333" : "#A8FF3E",
            color: isLaunching ? "#666666" : "#0A0A0A",
            fontFamily: "var(--font-display)",
            fontSize: 24,
          }}
          onMouseEnter={(e) => {
            if (!isLaunching) {
              e.currentTarget.style.backgroundColor = "#BFFF5C";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isLaunching) {
              e.currentTarget.style.backgroundColor = "#A8FF3E";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
          onMouseDown={(e) => {
            if (!isLaunching) {
              e.currentTarget.style.transform = "scale(0.98)";
            }
          }}
          onMouseUp={(e) => {
            if (!isLaunching) {
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
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
        <p
          className="text-center text-xs"
          style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
        >
          This usually takes about 10 seconds. We&apos;ll build your first bundles automatically.
        </p>
      </div>
    </div>
  );
}
