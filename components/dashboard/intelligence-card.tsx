"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface IntelligenceCardProps {
  label: string;
  icon: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  cta?: { label: string; href: string };
  emptyState?: string;
}

export function IntelligenceCard({
  label,
  icon: Icon,
  iconColor = "#666666",
  children,
  cta,
  emptyState,
}: IntelligenceCardProps) {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);

  return (
    <div
      style={{
        background: "#111111",
        border: "1px solid #1e1e1e",
        borderRadius: 8,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        minHeight: 160,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon style={{ width: 16, height: 16, color: iconColor }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#ffffff",
              fontFamily: "var(--font-display)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {label}
          </span>
        </div>
        {cta && (
          <Link
            href={cta.href}
            style={{
              fontSize: 12,
              color: "#c8f135",
              fontFamily: "var(--font-mono-alt)",
              textDecoration: "none",
            }}
          >
            {cta.label}
          </Link>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1 }}>
        {isEmpty && emptyState ? (
          <p
            style={{
              fontSize: 13,
              color: "#444444",
              fontFamily: "var(--font-mono-alt)",
            }}
          >
            {emptyState}
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
