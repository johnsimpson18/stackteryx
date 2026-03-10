"use client";

import { useState } from "react";

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
        <h1
          className="text-4xl font-bold uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "#FFFFFF", fontSize: 36 }}
        >
          WHAT OUTCOMES DO YOU DELIVER?
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ fontFamily: "var(--font-mono-alt)", color: "#666666", fontSize: 14 }}
        >
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
              className="w-full rounded-lg border px-5 py-4 text-left transition-[border-color,background-color] duration-100"
              style={{
                backgroundColor: selected ? "rgba(168, 255, 62, 0.06)" : "#111111",
                borderColor: selected ? "#A8FF3E" : "#1E1E1E",
              }}
            >
              <span
                className="text-sm font-bold"
                style={{ color: selected ? "#A8FF3E" : "#FFFFFF" }}
              >
                {outcome.value}
              </span>
              <p
                className="mt-1 text-xs"
                style={{ color: "#999999" }}
              >
                {outcome.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Custom services */}
      <div className="space-y-3">
        <label
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "#999999" }}
        >
          Anything else?
        </label>

        {/* Tags */}
        {servicesCustom.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {servicesCustom.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                style={{ backgroundColor: "#A8FF3E", color: "#0A0A0A" }}
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
          <input
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
            className="flex-1 rounded-lg border px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#444]"
            style={{
              backgroundColor: "#111111",
              borderColor: "#1E1E1E",
              color: "#FFFFFF",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#A8FF3E"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#1E1E1E"; }}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-30"
            style={{
              borderColor: "#1E1E1E",
              color: "#A8FF3E",
              backgroundColor: "#111111",
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
