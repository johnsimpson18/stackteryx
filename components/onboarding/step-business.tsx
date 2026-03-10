"use client";

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
          className="text-4xl font-bold uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "#FFFFFF", fontSize: 36 }}
        >
          HOW DO YOU SELL?
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ fontFamily: "var(--font-mono-alt)", color: "#666666", fontSize: 14 }}
        >
          This helps us build the right bundle structure for your business.
        </p>
      </div>

      {/* Q1 — Packaging */}
      <div className="space-y-3">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#999999" }}>
          How do you package your services?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {PACKAGING_OPTIONS.map((opt) => {
            const selected = salesModel === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSalesModelChange(selected ? "" : opt.value)}
                className="rounded-lg border px-4 py-4 text-left transition-[border-color,background-color] duration-100"
                style={{
                  backgroundColor: selected ? "rgba(168, 255, 62, 0.06)" : "#111111",
                  borderColor: selected ? "#A8FF3E" : "#1E1E1E",
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-base"
                    style={{ color: selected ? "#A8FF3E" : "#666666", fontFamily: "monospace" }}
                  >
                    {opt.icon}
                  </span>
                  <span
                    className="text-sm font-bold uppercase"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: selected ? "#A8FF3E" : "#FFFFFF",
                    }}
                  >
                    {opt.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#666666" }}>
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q2 — Delivery */}
      <div className="space-y-3">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#999999" }}>
          How do you deliver?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {DELIVERY_OPTIONS.map((opt) => {
            const selected = deliveryModels.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onDeliveryModelsChange(toggleArr(deliveryModels, opt.value))}
                className="rounded-lg border px-4 py-4 text-left transition-[border-color,background-color] duration-100"
                style={{
                  backgroundColor: selected ? "rgba(168, 255, 62, 0.06)" : "#111111",
                  borderColor: selected ? "#A8FF3E" : "#1E1E1E",
                }}
              >
                <p
                  className="text-sm font-bold uppercase"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: selected ? "#A8FF3E" : "#FFFFFF",
                  }}
                >
                  {opt.label}
                </p>
                <p className="text-xs mt-1" style={{ color: "#666666" }}>
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q3 — Sales team */}
      <div className="space-y-3">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#999999" }}>
          What does your sales team look like?
        </label>
        <div className="flex flex-wrap gap-2">
          {SALES_TEAM_OPTIONS.map((opt) => {
            const selected = salesTeamType === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onSalesTeamTypeChange(selected ? "" : opt)}
                className="rounded-full px-4 py-2 text-sm font-medium transition-[border-color,background-color,color] duration-100"
                style={{
                  backgroundColor: selected ? "#A8FF3E" : "#111111",
                  color: selected ? "#0A0A0A" : "#CCCCCC",
                  border: selected ? "1px solid #A8FF3E" : "1px solid #1E1E1E",
                }}
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
