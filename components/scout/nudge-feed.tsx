"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { NudgeCard } from "./nudge-card";
import type { ScoutNudgeRecord } from "@/actions/scout-nudges";

interface NudgeFeedProps {
  nudges: ScoutNudgeRecord[];
  limit?: number;
  showFilter?: boolean;
}

const FILTER_TYPES = [
  { value: "all", label: "All" },
  { value: "renewal_risk", label: "Renewals" },
  { value: "health_decline", label: "Health" },
  { value: "advisory_gap", label: "Advisory" },
  { value: "compliance_gap", label: "Compliance" },
  { value: "upsell_opportunity", label: "Upsell" },
  { value: "portfolio_pattern", label: "Portfolio" },
] as const;

export function NudgeFeed({ nudges: initialNudges, limit, showFilter = false }: NudgeFeedProps) {
  const [nudges, setNudges] = useState(initialNudges);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? nudges
    : nudges.filter((n) => n.nudgeType === filter);

  const display = limit ? filtered.slice(0, limit) : filtered;

  function handleDismiss(id: string) {
    setNudges((prev) => prev.filter((n) => n.id !== id));
  }

  if (nudges.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <CheckCircle style={{ width: 18, height: 18, color: "#c8f135" }} />
        <span
          className="text-sm"
          style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
        >
          Scout sees no issues with your portfolio right now.
        </span>
      </div>
    );
  }

  return (
    <div>
      {showFilter && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {FILTER_TYPES.map((ft) => (
            <button
              key={ft.value}
              type="button"
              onClick={() => setFilter(ft.value)}
              className="px-2.5 py-1 text-xs rounded-md transition-colors"
              style={{
                background: filter === ft.value ? "#1e1e1e" : "transparent",
                color: filter === ft.value ? "#ffffff" : "#666666",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              {ft.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {display.map((nudge) => (
          <NudgeCard key={nudge.id} nudge={nudge} onDismiss={handleDismiss} />
        ))}
      </div>

      {limit && filtered.length > limit && (
        <p
          className="text-xs text-center mt-3"
          style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
        >
          +{filtered.length - limit} more signal{filtered.length - limit !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
