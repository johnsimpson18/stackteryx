"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  subValueType?: "positive" | "negative" | "neutral" | "warning";
  href?: string;
  icon?: LucideIcon;
}

const SUB_COLORS: Record<string, string> = {
  positive: "#c8f135",
  negative: "#e24b4a",
  warning: "#ef9f27",
  neutral: "#666666",
};

export function MetricCard({
  label,
  value,
  subValue,
  subValueType = "neutral",
  href,
  icon: Icon,
}: MetricCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between mb-3">
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#666666",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontFamily: "var(--font-mono-alt)",
          }}
        >
          {label}
        </span>
        {Icon && (
          <div
            style={{
              padding: 6,
              borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <Icon style={{ width: 16, height: 16, color: "#666666" }} />
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#ffffff",
          fontFamily: "var(--font-mono-alt)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {subValue && (
        <div
          style={{
            fontSize: 13,
            color: SUB_COLORS[subValueType],
            fontFamily: "var(--font-mono-alt)",
            marginTop: 6,
          }}
        >
          {subValue}
        </div>
      )}
    </>
  );

  const style = {
    background: "#111111",
    border: "1px solid #1e1e1e",
    borderRadius: 8,
    padding: 20,
    display: "block" as const,
    textDecoration: "none" as const,
    transition: "border-color 0.15s",
  };

  if (href) {
    return (
      <Link
        href={href}
        style={style}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#333")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e1e")}
      >
        {content}
      </Link>
    );
  }

  return <div style={style}>{content}</div>;
}
