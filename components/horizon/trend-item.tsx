"use client";

import type { TrendItem as TrendItemType } from "@/types/horizon";

const IMPACT_COLORS: Record<string, string> = {
  high: "#e24b4a",
  medium: "#EF9F27",
  low: "#555555",
};

interface TrendItemProps {
  item: TrendItemType;
  compact?: boolean;
}

export function TrendItem({ item, compact = false }: TrendItemProps) {
  if (compact) {
    return (
      <div className="flex items-start gap-2 py-1">
        <span
          className="h-2 w-2 rounded-full shrink-0 mt-1.5"
          style={{ backgroundColor: IMPACT_COLORS[item.impact] }}
        />
        <span
          className="text-sm text-foreground"
          style={{ fontFamily: "var(--font-mono-alt)" }}
        >
          {item.title}
        </span>
      </div>
    );
  }

  return (
    <div className="py-3" style={{ borderBottom: "1px solid #1a1a1a" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: IMPACT_COLORS[item.impact] }}
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{
            color: IMPACT_COLORS[item.impact],
            fontFamily: "var(--font-mono-alt)",
          }}
        >
          {item.impact} impact
        </span>
        {item.source && (
          <span
            className="text-[10px]"
            style={{ color: "#444444", fontFamily: "var(--font-mono-alt)" }}
          >
            &middot; {item.source}
          </span>
        )}
      </div>
      <p
        className="text-sm font-medium text-foreground mb-1"
        style={{ fontFamily: "var(--font-mono-alt)" }}
      >
        {item.title}
      </p>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "#888888", fontFamily: "var(--font-mono-alt)" }}
      >
        {item.summary}
      </p>
      {item.actionable && item.action && (
        <p
          className="text-xs mt-2"
          style={{ color: "#EF9F27", fontFamily: "var(--font-mono-alt)" }}
        >
          &rarr; {item.action}
        </p>
      )}
      {item.tags.length > 0 && (
        <div className="flex gap-1.5 mt-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{
                background: "#1e1e1e",
                color: "#666666",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
